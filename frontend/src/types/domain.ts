export type CaseStatus =
  | "needs_triage"
  | "awaiting_assignment"
  | "assigned"
  | "in_care"
  | "awaiting_verification"
  | "verified"
  | "closed";

export type Urgency = "urgent" | "high" | "routine";
export type UserRole = "reporter" | "caregiver" | "coordinator" | "admin";
export type UpdateKind =
  | "report_submitted"
  | "triaged"
  | "assigned"
  | "care_update"
  | "verification_requested"
  | "verified";

export interface CaseEvidence {
  id: string;
  fileName: string;
  storagePath?: string;
  url?: string;
}

export interface CaseUpdate {
  id: string;
  kind: UpdateKind;
  content: string;
  createdAt: string;
  author: string;
}

export interface CaseReport {
  id: string;
  reference: string;
  species: string;
  animal: string;
  condition: string;
  description: string;
  location: string;
  urgency: Urgency;
  status: CaseStatus;
  receivedAt: string;
  reporterName: string;
  reporterEmail: string;
  caregiverId?: string;
  caregiverName?: string;
  evidence: CaseEvidence[];
  updates: CaseUpdate[];
  outcome?: string;
  warnings?: string[];
}

export interface Caregiver {
  id: string;
  name: string;
  serviceArea: string;
  role: string;
  availability: "Available" | "On field" | "At capacity";
  assignedCount: number;
  specialities: string[];
}

export interface ReportDraft {
  species: string;
  animal: string;
  condition: string;
  description: string;
  urgency: Urgency;
  location: string;
  reporterName: string;
  reporterEmail: string;
}

export const STATUS_LABELS: Record<CaseStatus, string> = {
  needs_triage: "Needs triage",
  awaiting_assignment: "Awaiting assignment",
  assigned: "Assigned",
  in_care: "In care",
  awaiting_verification: "Awaiting verification",
  verified: "Verified outcome",
  closed: "Closed",
};

export const URGENCY_LABELS: Record<Urgency, string> = {
  urgent: "Urgent",
  high: "High",
  routine: "Routine",
};
