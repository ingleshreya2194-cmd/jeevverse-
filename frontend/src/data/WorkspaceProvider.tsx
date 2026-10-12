import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { DEMO_CASES, DEMO_CAREGIVERS } from "./demo";
import { WorkspaceContext } from "./WorkspaceContext";
import { isDemoMode, supabase } from "../lib/supabase";
import { useAuth } from "../auth/useAuth";
import type {
  Caregiver,
  CaseReport,
  CaseUpdate,
  ReportDraft,
} from "../types/domain";
const DEMO_CASES_KEY = "jeevverse-demo-cases";
const DEMO_CAREGIVERS_KEY = "jeevverse-demo-caregivers";

function readLocal<T>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(key);
    return stored ? (JSON.parse(stored) as T) : fallback;
  } catch {
    return fallback;
  }
}

function refFor(id: string) {
  return `JV-${new Date().getFullYear()}-${id.slice(0, 6).toUpperCase()}`;
}

function asCaseReport(row: Record<string, unknown>): CaseReport {
  return {
    id: String(row.id),
    reference: String(row.reference),
    species: String(row.species),
    animal: String(row.animal),
    condition: String(row.condition),
    description: String(row.description ?? ""),
    location: String(row.location),
    urgency: row.urgency as CaseReport["urgency"],
    status: row.status as CaseReport["status"],
    receivedAt: String(row.received_at),
    reporterName: String(row.reporter_name ?? "Reporter"),
    reporterEmail: String(row.reporter_email ?? ""),
    caregiverId: row.caregiver_id ? String(row.caregiver_id) : undefined,
    caregiverName: row.caregiver_name ? String(row.caregiver_name) : undefined,
    evidence: [],
    updates: [],
    outcome: row.outcome ? String(row.outcome) : undefined,
  };
}

function mapUpdate(row: Record<string, unknown>): CaseUpdate {
  return {
    id: String(row.id),
    kind: row.kind as CaseUpdate["kind"],
    content: String(row.content),
    createdAt: String(row.created_at),
    author: String(row.author_name ?? "JeevVerse response team"),
  };
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [cases, setCases] = useState<CaseReport[]>(() =>
    isDemoMode ? readLocal(DEMO_CASES_KEY, DEMO_CASES) : [],
  );
  const [caregivers, setCaregivers] = useState<Caregiver[]>(() =>
    isDemoMode ? readLocal(DEMO_CAREGIVERS_KEY, DEMO_CAREGIVERS) : [],
  );
  const [loading, setLoading] = useState(!isDemoMode);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (isDemoMode) {
      setCases(readLocal(DEMO_CASES_KEY, DEMO_CASES));
      setCaregivers(readLocal(DEMO_CAREGIVERS_KEY, DEMO_CAREGIVERS));
      setError(null);
      setLoading(false);
      return;
    }
    if (!supabase || !user) {
      setCases([]);
      setCaregivers([]);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const client = supabase;
      const [caseResult, updateResult] = await Promise.all([
        client
          .from("cases")
          .select("*, case_evidence(id, storage_path, file_name)")
          .order("received_at", { ascending: false }),
        client
          .from("case_updates")
          .select("*")
          .order("created_at", { ascending: true }),
      ]);
      if (caseResult.error) throw caseResult.error;
      if (updateResult.error) throw updateResult.error;
      const caregiverResult =
        user.role === "reporter"
          ? null
          : await client.from("caregiver_directory").select("*");
      if (caregiverResult?.error) throw caregiverResult.error;
      const updatesByCase = new Map<string, CaseUpdate[]>();
      for (const row of (updateResult.data ?? []) as Record<
        string,
        unknown
      >[]) {
        const caseId = String(row.case_id);
        updatesByCase.set(caseId, [
          ...(updatesByCase.get(caseId) ?? []),
          mapUpdate(row),
        ]);
      }
      const caregiverRows = (caregiverResult?.data ?? []) as Record<
        string,
        unknown
      >[];
      const caregiverRecords: Caregiver[] = caregiverRows.map((row) => ({
        id: String(row.id),
        name: String(row.display_name ?? "Caregiver"),
        serviceArea: String(row.service_area),
        role:
          row.role === "caregiver"
            ? "Field caregiver"
            : String(row.role ?? "Caregiver"),
        availability: row.availability as Caregiver["availability"],
        assignedCount: Number(row.assigned_count ?? 0),
        specialities: Array.isArray(row.specialties)
          ? row.specialties.map(String)
          : [],
      }));
      const caregiverNames = new Map(
        caregiverRecords.map((item) => [item.id, item.name]),
      );
      const records = await Promise.all(
        (
          (caseResult.data ?? []) as (Record<string, unknown> & {
            case_evidence?: Record<string, unknown>[];
          })[]
        ).map(async (row) => {
          const item = asCaseReport(row);
          item.updates = updatesByCase.get(item.id) ?? [];
          if (item.caregiverId)
            item.caregiverName = caregiverNames.get(item.caregiverId);
          item.evidence = await Promise.all(
            (row.case_evidence ?? []).map(async (evidence) => {
              const storagePath = String(evidence.storage_path);
              const { data: signed, error: signedUrlError } =
                await client.storage
                  .from("case-evidence")
                  .createSignedUrl(storagePath, 300);
              return {
                id: String(evidence.id),
                storagePath,
                fileName: String(evidence.file_name),
                url: signedUrlError ? undefined : signed.signedUrl,
              };
            }),
          );
          return item;
        }),
      );
      setCases(records);
      setCaregivers(caregiverRecords);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not load workspace records.",
      );
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (isDemoMode || !user) return;
    let active = true;
    const timeoutId = window.setTimeout(() => {
      if (active) void refresh();
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(timeoutId);
    };
  }, [refresh, user]);

  const createReport = useCallback(
    async (draft: ReportDraft, files: File[]) => {
      if (isDemoMode) {
        const current = readLocal(DEMO_CASES_KEY, DEMO_CASES);
        const id = `demo-${crypto.randomUUID()}`;
        const record: CaseReport = {
          ...draft,
          id,
          reference: refFor(crypto.randomUUID()),
          animal: draft.animal || draft.species,
          status: "needs_triage",
          receivedAt: new Date().toISOString(),
          evidence: files.map((file, index) => ({
            id: `${id}-${index}`,
            fileName: file.name,
          })),
          updates: [
            {
              id: crypto.randomUUID(),
              kind: "report_submitted",
              content: "Report received and added to the triage queue.",
              createdAt: new Date().toISOString(),
              author: "Local demo",
            },
          ],
        };
        const next = [record, ...current];
        localStorage.setItem(DEMO_CASES_KEY, JSON.stringify(next));
        setCases(next);
        return record;
      }
      const client = supabase;
      if (!client || !user)
        throw new Error("Sign in before creating a report.");
      const { data, error: insertError } = await client
        .from("cases")
        .insert({
          species: draft.species,
          animal: draft.animal,
          condition: draft.condition,
          description: draft.description,
          location: draft.location,
          urgency: draft.urgency,
          status: "needs_triage",
          reporter_id: user.id,
          reporter_name: draft.reporterName,
          reporter_email: draft.reporterEmail || user.email,
        })
        .select("*")
        .single();
      if (insertError) throw insertError;
      const caseId = String((data as Record<string, unknown>).id);
      const warnings: string[] = [];
      if (files.length > 0) {
        const uploadedResults = await Promise.all(
          files.map(async (file) => {
            const safeName = file.name
              .replace(/[^a-zA-Z0-9._-]/g, "-")
              .slice(-100);
            const storagePath = `${caseId}/${crypto.randomUUID()}-${safeName}`;
            const { error: uploadError } = await client.storage
              .from("case-evidence")
              .upload(storagePath, file, {
                upsert: false,
                contentType: file.type,
              });
            if (uploadError)
              return {
                ok: false as const,
                fileName: file.name,
                message: uploadError.message,
              };
            return {
              ok: true as const,
              row: {
                case_id: caseId,
                storage_path: storagePath,
                file_name: file.name,
                mime_type: file.type,
                created_by: user.id,
              },
            };
          }),
        );
        const evidenceRows = uploadedResults.flatMap((result) =>
          result.ok ? [result.row] : [],
        );
        warnings.push(
          ...uploadedResults.flatMap((result) =>
            result.ok ? [] : [`${result.fileName}: ${result.message}`],
          ),
        );
        if (evidenceRows.length > 0) {
          const { error: evidenceError } = await client
            .from("case_evidence")
            .insert(evidenceRows);
          if (evidenceError)
            warnings.push(
              `Report saved, but the image record could not be added: ${evidenceError.message}`,
            );
        }
      }
      const created = asCaseReport(data as Record<string, unknown>);
      created.warnings = warnings;
      await refresh();
      return created;
    },
    [refresh, user],
  );

  const assignCaregiver = useCallback(
    async (caseId: string, caregiverId: string) => {
      if (isDemoMode) {
        const current = readLocal(DEMO_CASES_KEY, DEMO_CASES);
        const caregiver = readLocal(DEMO_CAREGIVERS_KEY, DEMO_CAREGIVERS).find(
          (item) => item.id === caregiverId,
        );
        if (!caregiver) throw new Error("Choose an available caregiver.");
        const now = new Date().toISOString();
        const next = current.map((item) =>
          item.id === caseId
            ? {
                ...item,
                caregiverId,
                caregiverName: caregiver.name,
                status: "assigned" as const,
                updates: [
                  ...item.updates,
                  {
                    id: crypto.randomUUID(),
                    kind: "assigned" as const,
                    content: `${caregiver.name} assigned to the case.`,
                    createdAt: now,
                    author: "Local demo",
                  },
                ],
              }
            : item,
        );
        localStorage.setItem(DEMO_CASES_KEY, JSON.stringify(next));
        setCases(next);
        return;
      }
      if (!supabase) throw new Error("Supabase is not configured.");
      const { error: rpcError } = await supabase.rpc("assign_case", {
        target_case_id: caseId,
        target_caregiver_id: caregiverId,
      });
      if (rpcError) throw rpcError;
      await refresh();
    },
    [refresh],
  );

  const addCareUpdate = useCallback(
    async (caseId: string, content: string) => {
      if (isDemoMode) {
        const current = readLocal(DEMO_CASES_KEY, DEMO_CASES);
        const now = new Date().toISOString();
        const next = current.map((item) =>
          item.id === caseId
            ? {
                ...item,
                status: "in_care" as const,
                updates: [
                  ...item.updates,
                  {
                    id: crypto.randomUUID(),
                    kind: "care_update" as const,
                    content,
                    createdAt: now,
                    author: "Local demo",
                  },
                ],
              }
            : item,
        );
        localStorage.setItem(DEMO_CASES_KEY, JSON.stringify(next));
        setCases(next);
        return;
      }
      if (!supabase) throw new Error("Supabase is not configured.");
      const { error: updateError } = await supabase.rpc("append_care_update", {
        target_case_id: caseId,
        update_text: content,
      });
      if (updateError) throw updateError;
      await refresh();
    },
    [refresh],
  );

  const requestVerification = useCallback(
    async (caseId: string, notes: string) => {
      if (isDemoMode) {
        const current = readLocal(DEMO_CASES_KEY, DEMO_CASES);
        const now = new Date().toISOString();
        const next = current.map((item) =>
          item.id === caseId
            ? {
                ...item,
                status: "awaiting_verification" as const,
                updates: [
                  ...item.updates,
                  {
                    id: crypto.randomUUID(),
                    kind: "verification_requested" as const,
                    content: notes,
                    createdAt: now,
                    author: "Local demo",
                  },
                ],
              }
            : item,
        );
        localStorage.setItem(DEMO_CASES_KEY, JSON.stringify(next));
        setCases(next);
        return;
      }
      if (!supabase) throw new Error("Supabase is not configured.");
      const { error: rpcError } = await supabase.rpc(
        "request_case_verification",
        { target_case_id: caseId, supporting_notes: notes },
      );
      if (rpcError) throw rpcError;
      await refresh();
    },
    [refresh],
  );

  const verifyOutcome = useCallback(
    async (caseId: string, outcome: string) => {
      if (isDemoMode) {
        const current = readLocal(DEMO_CASES_KEY, DEMO_CASES);
        const now = new Date().toISOString();
        const next = current.map((item) =>
          item.id === caseId
            ? {
                ...item,
                outcome,
                status: "verified" as const,
                updates: [
                  ...item.updates,
                  {
                    id: crypto.randomUUID(),
                    kind: "verified" as const,
                    content: "Outcome and supporting notes verified.",
                    createdAt: now,
                    author: "Local demo",
                  },
                ],
              }
            : item,
        );
        localStorage.setItem(DEMO_CASES_KEY, JSON.stringify(next));
        setCases(next);
        return;
      }
      if (!supabase) throw new Error("Supabase is not configured.");
      const { error: rpcError } = await supabase.rpc("verify_case_outcome", {
        target_case_id: caseId,
        outcome_text: outcome,
      });
      if (rpcError) throw rpcError;
      await refresh();
    },
    [refresh],
  );

  const value = useMemo(
    () => ({
      cases,
      caregivers,
      loading,
      error,
      refresh,
      createReport,
      assignCaregiver,
      addCareUpdate,
      requestVerification,
      verifyOutcome,
    }),
    [
      cases,
      caregivers,
      loading,
      error,
      refresh,
      createReport,
      assignCaregiver,
      addCareUpdate,
      requestVerification,
      verifyOutcome,
    ],
  );
  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}
