# JeevVerse

JeevVerse is a responsive animal-welfare reporting workspace. The main flow takes a report from intake and triage through caregiver assignment, field care, and coordinator-verified outcome. The frontend is React, Vite, TypeScript, and vanilla CSS. Production uses a Render Static Site plus Supabase; no separate Node API server is required.

## Local setup

Requirements: Node.js 20.19+ or 22.12+, npm 10+, and Git.

```powershell
cd frontend
npm ci
Copy-Item .env.example .env.local
npm run dev
```

The Vite development server runs in **local demo mode** if both `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are unset. Demo records and workflow changes persist in this browser's local storage only; demo credentials do not authenticate against a production service. The demonstration identity is a simulated coordinator and is not an access-control boundary. Production builds fail closed and require both public Supabase values; they never fall back to sample data.

Checks:

```powershell
npm run typecheck
npm run build
npm run preview
```

## Environment variables

| Name | Required for | Value / source |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Shared production authentication and data | Supabase project URL (`https://<project-ref>.supabase.co`) |
| `VITE_SUPABASE_ANON_KEY` | Shared production authentication and data | Supabase publishable/anon public key |

The repository-root [`.env.example`](../.env.example) and [`frontend/.env.example`](./.env.example) are placeholder-only templates. Use `frontend/.env.local` for local values and Render's Static Site Environment settings for production; never commit populated env files. The web fonts are served by Google Fonts; if a network policy blocks that host, the bundled system/serif fallbacks keep the application readable.

If both values are blank during local `npm run dev`, the site explicitly uses demo records. In production/preview builds, either value being blank shows an in-app setup error and disables the protected workspace. Do not put a Supabase service-role key, AI provider secret, database password, or other private credential in a `VITE_` variable. Vite embeds all `VITE_` values in browser JavaScript. This app does not make AI requests; the core reporting workflow does not depend on an AI credential. Optional future AI operations belong in a Supabase Edge Function with server-side secrets.

# Deploy JeevVerse on Render

## 1. Prerequisites

- A GitHub repository with this project pushed to its default branch.
- A Render account connected to that repository.
- A Supabase project for production data, authentication, and evidence storage.
- Node.js 20.19+ or 22.12+ and npm locally for the production checks.

## 2. Push the repository to GitHub

From the repository root (one level above `frontend/`):

```powershell
git init
git add .
git commit -m "Build JeevVerse reporting workspace"
git branch -M main
git remote add origin https://github.com/YOUR_ORG/YOUR_REPOSITORY.git
git push -u origin main
```

Do not add `.env.local` or other populated `.env` files. They are ignored by Git.

## 3. Create the Render service

Create a **Static Site** in Render and select the GitHub repository. The included root [`render.yaml`](../render.yaml) describes the same service settings; Render Blueprint sync can use it as an alternative.

Use these exact settings if creating the Static Site manually:

- **Root Directory:** `frontend`
- **Build Command:** `npm ci && npm run build`
- **Publish Directory:** `dist`
- **Service type:** Static Site (not Web Service)

The Render rewrite is `/*` → `/index.html` with action **Rewrite**. It is in `render.yaml`; if configured manually, add it under Redirects/Rewrites. This allows React Router refreshes on `/reports`, `/reports/new`, `/reports/<case-id>`, `/impact`, `/caregivers`, and `/auth/login`. Assets remain served as normal static files because only unmatched route requests need the SPA entry point. No backend API route shares the frontend origin.

## 4. Configure production Supabase

1. Create a Supabase organization/project and keep the project database password in a password manager.
2. From the repository root, install the Supabase CLI using its official installation instructions if it is not installed.
3. Authenticate and link the CLI to the project:

   ```powershell
   supabase login
   supabase link --project-ref YOUR_PROJECT_REF
   supabase db push
   ```

   The migration in [`supabase/migrations/20261011000000_initial_schema.sql`](../supabase/migrations/20261011000000_initial_schema.sql) creates the team profiles, caregiver directory, case records, case updates, evidence metadata, role-aware row-level policies, and restricted RPCs for assignment and outcome verification. Review it before applying to a populated project.
4. The migration creates the **private** `case-evidence` bucket and storage policies. Do not make the bucket public. The app requests authorized, short-lived signed image URLs for evidence retrieval; access is tied to team membership and case permissions.
5. In Supabase **Authentication → URL Configuration**, set the Site URL to the Render URL after Render creates it, for example `https://jeevverse.onrender.com`. Add these Redirect URLs:
   - `https://YOUR-RENDER-SERVICE.onrender.com/**`
   - `https://YOUR-RENDER-SERVICE.onrender.com/auth/recovery`
   - `http://localhost:5173/**` for local development only
6. In Render **Environment**, set `VITE_SUPABASE_URL` to the project URL and `VITE_SUPABASE_ANON_KEY` to its public anon/publishable key. Save changes and trigger a new deploy so Vite embeds the configuration.
7. Create a first account through the application. Supabase Auth stores the identity; the migration creates a reporter profile automatically. Promote a trusted coordinator using the Supabase SQL editor (after checking their email):

   ```sql
   update public.profiles p set role = 'coordinator'
   from auth.users u where p.id = u.id and u.email = 'trusted-coordinator@example.org';
   ```

   A project owner must onboard caregivers through the Supabase SQL editor; this app intentionally has no public role-management screen. Invite the caregiver in Supabase Auth first, then set their role and service-area record:

   ```sql
   update public.profiles p set role = 'caregiver'
   from auth.users u where p.id = u.id and u.email = 'caregiver@example.org';

   insert into public.caregivers (profile_id, service_area, specialties, availability)
   select id, 'Cape Town South', array['Urban wildlife'], 'Available'
   from auth.users where email = 'caregiver@example.org'
   on conflict (profile_id) do update
     set service_area = excluded.service_area,
         specialties = excluded.specialties,
         availability = excluded.availability;
   ```

   Do not grant elevated roles to public reporters. The project owner must verify the invited identity before changing its role.
8. Verify RLS before sharing the URL: use a reporter account and an unprivileged session to confirm private case lists, team data, evidence files and mutation RPCs cannot be read/changed across roles. The migration intentionally denies anonymous access and does not grant authenticated users unrestricted table writes.

There are no Edge Functions in this implementation because the workflow uses Supabase Auth, Postgres RPCs, and private Storage directly; no privileged backend or AI service is required. If a future integration needs an AI/provider secret, deploy it as a Supabase Edge Function and set that secret with `supabase secrets set NAME=value`. Never expose it as a frontend environment variable. A Render Web Service is not needed for the current feature set.

## 5. Deploy and verify

1. Confirm Render finishes the build and reports `Publish Directory: dist`.
2. Open the Render URL and check that the top banner says the Supabase-backed workspace is configured (not Local demo mode).
3. Register a response-team account, confirm email if enabled in Supabase, log in, refresh the page, and verify session persistence and logout.
4. Submit a test report with an image. Confirm the case appears in the queue, opens from a direct `/reports/<id>` URL, and that image evidence can be opened only by an authorized team member.
5. Use a coordinator account to assign the case, record a care update, then add a written outcome and verify it. Confirm only the verified case contributes to Impact.
6. Open `/reports`, `/reports/new`, `/impact`, and `/caregivers` in a new tab and refresh each URL to test the SPA rewrite. Check a narrow mobile viewport and keyboard focus states.
7. Inspect the Render deploy's **Logs → Build** for install/typecheck/build failures. Static Sites do not have an application runtime process; inspect Render event/deploy logs for publish and rewrite configuration. Inspect the browser console and Network panel for failed Supabase requests, storage 403s, or missing assets.

## 6. Troubleshooting

- **Build fails:** use Node.js 20.19+ or 22.12+, confirm the service root is `frontend`, ensure the committed `frontend/package-lock.json` is current, then run `npm ci`, `npm run typecheck`, and `npm run build` locally.
- **Blank page or missing assets:** publish `frontend/dist`, not the repository root. Keep Vite's base path at `/` for the default Render domain/custom root domain.
- **Nested route refresh gives a 404:** add the Render `/*` → `/index.html` Rewrite. Confirm it is a rewrite (not redirect) and redeploy.
- **Missing environment setup banner:** both Vite variables must be configured on the Static Site in Render and a fresh build/deploy must complete. Vite variables are build-time values, not runtime secrets.
- **Authentication redirect error:** use the exact deployed Render origin in Supabase Site URL and allowlist the requested `/auth/recovery` route; do not guess the final Render hostname before service creation.
- **RLS/permission errors:** ensure `db push` applied the committed migration, the profile role is correct, caregiver records reference their profile, and review the failing table/RPC policy. Do not bypass RLS or ship the service-role key to fix access.
- **AI requests fail:** this app does not depend on AI; report intake, assignment, care updates, and outcome verification remain available without an AI provider. Configure any future provider server-side in an Edge Function.
- **Evidence upload is rejected:** allow only JPEG, PNG and WebP up to 5 MB per image, confirm the private `case-evidence` bucket and policies were created, and retry after checking Storage logs. For 401/403 on retrieval, verify the signed-in user's team/case permission; never make the evidence bucket public as a workaround.
- **WebGL/performance:** the application does not use WebGL or 3D. Workflow screens and data are not dependent on a 3D fallback; reduced-motion preferences are respected.
- **Local demo data appears in production:** configure both Supabase public values in Render, trigger a clean deploy, and reload. Demo records are browser-local synthetic examples and must not be treated as live submissions.
- **CORS errors:** no separate backend is used. Calls go directly to the configured Supabase origin; allow the deployed frontend origin in Supabase Auth redirect settings and check the Supabase project's API/network status.

## 7. Redeploy and custom domain

Every push to the linked deploy branch triggers a Render Static Site build. Check the new build log and open the updated service URL after deploy completes. To use a custom domain, add it in Render's **Settings → Custom Domains**, configure the DNS records Render provides, wait for TLS to become active, then add the exact custom-domain origin and recovery redirect path in Supabase Auth URL Configuration and redeploy if frontend environment values change.

## Data and security notes

- Case evidence is private and never loaded from a public bucket.
- Reporter identity/contact details and all case records are restricted by RLS; production app routes require a Supabase session.
- `assign_case` and `verify_case_outcome` enforce coordinator/admin roles in Postgres, and verification creates its outcome history entry atomically.
- Local demo changes use browser local storage and are not sent to Supabase or visible to other users.
- Sample cases and caregiver directory entries are synthetic demo fixtures; they are not real incident reports or operational live data.
