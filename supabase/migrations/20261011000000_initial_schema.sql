-- JeevVerse production schema. Run with `supabase db push` after linking your project.
create extension if not exists pgcrypto with schema extensions;

do $$ begin
  create type public.user_role as enum ('reporter', 'caregiver', 'coordinator', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.case_status as enum ('needs_triage', 'awaiting_assignment', 'assigned', 'in_care', 'awaiting_verification', 'verified', 'closed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.case_urgency as enum ('urgent', 'high', 'routine');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.case_update_kind as enum ('report_submitted', 'triaged', 'assigned', 'care_update', 'verification_requested', 'verified');
exception when duplicate_object then null; end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'JeevVerse member',
  role public.user_role not null default 'reporter',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.caregivers (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  service_area text not null,
  specialties text[] not null default '{}',
  availability text not null default 'Available' check (availability in ('Available', 'On field', 'At capacity')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.cases (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique default ('JV-' || to_char(now(), 'YYMM') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6))),
  species text not null,
  animal text not null,
  condition text not null,
  description text not null,
  location text not null,
  urgency public.case_urgency not null default 'routine',
  status public.case_status not null default 'needs_triage',
  reporter_id uuid not null references public.profiles(id),
  reporter_name text not null,
  reporter_email text,
  caregiver_id uuid references public.caregivers(id) on delete set null,
  outcome text,
  received_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  verified_at timestamptz,
  constraint verified_case_has_outcome check (status <> 'verified' or (outcome is not null and length(trim(outcome)) >= 10 and verified_at is not null))
);

create table if not exists public.case_updates (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  kind public.case_update_kind not null,
  content text not null check (length(trim(content)) between 3 and 2000),
  author_id uuid references public.profiles(id) on delete set null,
  author_name text not null default 'JeevVerse response team',
  created_at timestamptz not null default now()
);

create table if not exists public.case_evidence (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  storage_path text not null unique,
  file_name text not null,
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp')),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists cases_received_idx on public.cases (received_at desc);
create index if not exists cases_queue_idx on public.cases (status, urgency, received_at desc);
create index if not exists cases_reporter_idx on public.cases (reporter_id);
create index if not exists case_updates_case_created_idx on public.case_updates (case_id, created_at);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name, role)
  values (new.id, coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), split_part(new.email, '@', 1)), 'reporter')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.has_team_role(allowed_roles public.user_role[])
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = any (allowed_roles));
$$;

create or replace function public.can_access_case(target_case_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.cases c
    where c.id = target_case_id and (
      c.reporter_id = (select auth.uid())
      or public.has_team_role(array['coordinator', 'admin']::public.user_role[])
      or exists (
        select 1 from public.caregivers cg
        where cg.id = c.caregiver_id and cg.profile_id = (select auth.uid())
      )
    )
  );
$$;

create or replace function public.add_report_submitted_update()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.case_updates (case_id, kind, content, author_id, author_name)
  values (new.id, 'report_submitted', 'Report received and added to the triage queue.', new.reporter_id, new.reporter_name);
  return new;
end;
$$;
drop trigger if exists case_submitted_timeline on public.cases;
create trigger case_submitted_timeline after insert on public.cases for each row execute function public.add_report_submitted_update();

create or replace function public.assign_case(target_case_id uuid, target_caregiver_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  caregiver_name text;
  coordinator_name text;
  current_status public.case_status;
begin
  if not public.has_team_role(array['coordinator', 'admin']::public.user_role[]) then
    raise exception 'Only a coordinator can assign a caregiver.' using errcode = '42501';
  end if;
  select p.display_name into caregiver_name
  from public.caregivers cg join public.profiles p on p.id = cg.profile_id
  where cg.id = target_caregiver_id and cg.is_active and cg.availability <> 'At capacity';
  if caregiver_name is null then raise exception 'Choose an active caregiver who is not at capacity.'; end if;
  select p.display_name into coordinator_name from public.profiles p where p.id = auth.uid();
  select c.status into current_status from public.cases c where c.id = target_case_id for update;
  if current_status is null or current_status not in ('needs_triage', 'awaiting_assignment', 'assigned') then
    raise exception 'This case cannot be assigned from its current state.';
  end if;
  if current_status = 'needs_triage' then
    insert into public.case_updates (case_id, kind, content, author_id, author_name)
    values (target_case_id, 'triaged', 'Report reviewed and cleared for caregiver assignment.', auth.uid(), coalesce(coordinator_name, 'Response coordinator'));
  end if;
  update public.cases set caregiver_id = target_caregiver_id, status = 'assigned', updated_at = now()
  where id = target_case_id;
  insert into public.case_updates (case_id, kind, content, author_id, author_name)
  values (target_case_id, 'assigned', caregiver_name || ' assigned to the case.', auth.uid(), coalesce(coordinator_name, 'Response coordinator'));
end;
$$;

create or replace function public.append_care_update(target_case_id uuid, update_text text)
returns void language plpgsql security definer set search_path = '' as $$
declare current_case public.cases%rowtype;
begin
  if not public.has_team_role(array['caregiver', 'coordinator', 'admin']::public.user_role[]) then
    raise exception 'Only a response team member can add a care update.' using errcode = '42501';
  end if;
  if length(trim(coalesce(update_text, ''))) < 8 then raise exception 'Add a clear field care update.'; end if;
  select * into current_case from public.cases where id = target_case_id for update;
  if not found then raise exception 'Case was not found.'; end if;
  if not public.has_team_role(array['coordinator', 'admin']::public.user_role[]) and not exists (
    select 1 from public.caregivers cg where cg.id = current_case.caregiver_id and cg.profile_id = auth.uid()
  ) then raise exception 'Only the assigned caregiver or a coordinator can update this case.' using errcode = '42501'; end if;
  if current_case.status not in ('assigned', 'in_care') then raise exception 'This case is not active in care.'; end if;
  update public.cases set status = 'in_care', updated_at = now() where id = target_case_id;
  insert into public.case_updates (case_id, kind, content, author_id)
  values (target_case_id, 'care_update', trim(update_text), auth.uid());
end;
$$;

create or replace function public.request_case_verification(target_case_id uuid, supporting_notes text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.has_team_role(array['caregiver', 'coordinator', 'admin']::public.user_role[]) then
    raise exception 'A team member must submit a case for verification.' using errcode = '42501';
  end if;
  if length(trim(coalesce(supporting_notes, ''))) < 10 then raise exception 'Add at least 10 characters of supporting notes.'; end if;
  if not public.has_team_role(array['coordinator', 'admin']::public.user_role[]) and not exists (
    select 1 from public.caregivers cg join public.cases c on c.caregiver_id = cg.id
    where c.id = target_case_id and cg.profile_id = auth.uid()
  ) then raise exception 'Only the assigned caregiver or a coordinator can request verification.' using errcode = '42501'; end if;
  update public.cases set status = 'awaiting_verification', updated_at = now()
  where id = target_case_id and status = 'in_care';
  if not found then raise exception 'Only an active care case can be submitted for verification.'; end if;
  insert into public.case_updates (case_id, kind, content, author_id)
  values (target_case_id, 'verification_requested', trim(supporting_notes), auth.uid());
end;
$$;

create or replace function public.verify_case_outcome(target_case_id uuid, outcome_text text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.has_team_role(array['coordinator', 'admin']::public.user_role[]) then
    raise exception 'Only a coordinator can verify an outcome.' using errcode = '42501';
  end if;
  if length(trim(coalesce(outcome_text, ''))) < 10 then raise exception 'Add a clear outcome description before verifying.'; end if;
  update public.cases set status = 'verified', outcome = trim(outcome_text), verified_at = now(), updated_at = now()
  where id = target_case_id and status = 'awaiting_verification';
  if not found then raise exception 'This case is not awaiting outcome verification.'; end if;
  insert into public.case_updates (case_id, kind, content, author_id)
  values (target_case_id, 'verified', 'Outcome verified: ' || trim(outcome_text), auth.uid());
end;
$$;

create or replace view public.caregiver_directory with (security_invoker = true) as
select cg.id, cg.profile_id, cg.service_area, cg.specialties, cg.availability, cg.is_active,
  p.display_name, p.role,
  (select count(*)::integer from public.cases c where c.caregiver_id = cg.id and c.status not in ('verified', 'closed')) as assigned_count
from public.caregivers cg join public.profiles p on p.id = cg.profile_id
where cg.is_active;

alter table public.profiles enable row level security;
alter table public.caregivers enable row level security;
alter table public.cases enable row level security;
alter table public.case_updates enable row level security;
alter table public.case_evidence enable row level security;

create policy "profile self or response team reads names" on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.has_team_role(array['caregiver', 'coordinator', 'admin']::public.user_role[]));
create policy "caregivers directory visible to team" on public.caregivers for select to authenticated
  using (public.has_team_role(array['caregiver', 'coordinator', 'admin']::public.user_role[]));
create policy "case reader sees own report or assigned team cases" on public.cases for select to authenticated
  using (
    reporter_id = (select auth.uid())
    or public.has_team_role(array['coordinator', 'admin']::public.user_role[])
    or exists (select 1 from public.caregivers cg where cg.id = caregiver_id and cg.profile_id = (select auth.uid()))
  );
create policy "signed in users create their own report" on public.cases for insert to authenticated
  with check (reporter_id = (select auth.uid()) and status = 'needs_triage' and caregiver_id is null and outcome is null);
create policy "only coordinators update case workflow" on public.cases for update to authenticated
  using (public.has_team_role(array['coordinator', 'admin']::public.user_role[]))
  with check (public.has_team_role(array['coordinator', 'admin']::public.user_role[]));
create policy "timeline visible to case readers" on public.case_updates for select to authenticated
  using (public.can_access_case(case_id));
-- Timeline writes happen inside the restricted SECURITY DEFINER workflow functions only.
drop policy if exists "assigned team writes care notes" on public.case_updates;
create policy "case readers see evidence metadata" on public.case_evidence for select to authenticated
  using (public.can_access_case(case_id));
create policy "reporters attach evidence to their own report" on public.case_evidence for insert to authenticated
  with check (created_by = (select auth.uid()) and exists (select 1 from public.cases c where c.id = case_id and c.reporter_id = (select auth.uid())));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('case-evidence', 'case-evidence', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "team and reporter read case evidence" on storage.objects for select to authenticated
  using (bucket_id = 'case-evidence' and public.can_access_case(((storage.foldername(name))[1])::uuid));
create policy "case reporters upload evidence" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'case-evidence' and exists (
      select 1 from public.cases c
      where c.id = ((storage.foldername(name))[1])::uuid and c.reporter_id = (select auth.uid())
    )
  );
revoke all on storage.objects from anon, authenticated;
grant select, insert on storage.objects to authenticated;

revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.add_report_submitted_update() from public, anon, authenticated;
revoke all on function public.has_team_role(public.user_role[]) from public, anon;
revoke all on function public.can_access_case(uuid) from public, anon;
revoke all on function public.append_care_update(uuid, text) from public, anon;
revoke all on function public.request_case_verification(uuid, text) from public, anon;
revoke all on function public.assign_case(uuid, uuid) from public, anon;
revoke all on function public.verify_case_outcome(uuid, text) from public, anon;
grant execute on function public.has_team_role(public.user_role[]) to authenticated;
grant execute on function public.can_access_case(uuid) to authenticated;
grant execute on function public.append_care_update(uuid, text) to authenticated;
grant execute on function public.assign_case(uuid, uuid) to authenticated;
grant execute on function public.request_case_verification(uuid, text) to authenticated;
grant execute on function public.verify_case_outcome(uuid, text) to authenticated;
revoke all on public.profiles, public.caregivers, public.cases, public.case_updates, public.case_evidence from anon, authenticated;
grant select on public.profiles, public.caregivers, public.cases, public.case_updates, public.case_evidence to authenticated;
grant insert (species, animal, condition, description, location, urgency, status, reporter_id, reporter_name, reporter_email) on public.cases to authenticated;
grant insert on public.case_evidence to authenticated;
grant select on public.caregiver_directory to authenticated;
