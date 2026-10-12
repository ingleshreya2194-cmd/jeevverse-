import { createContext } from "react";
import type { Caregiver, CaseReport, ReportDraft } from "../types/domain";

export interface WorkspaceValue {
  cases: CaseReport[];
  caregivers: Caregiver[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createReport: (draft: ReportDraft, files: File[]) => Promise<CaseReport>;
  assignCaregiver: (caseId: string, caregiverId: string) => Promise<void>;
  addCareUpdate: (caseId: string, content: string) => Promise<void>;
  requestVerification: (caseId: string, notes: string) => Promise<void>;
  verifyOutcome: (caseId: string, outcome: string) => Promise<void>;
}

export const WorkspaceContext = createContext<WorkspaceValue | null>(null);
