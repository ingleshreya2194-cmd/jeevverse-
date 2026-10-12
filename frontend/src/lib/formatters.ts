import {
  STATUS_LABELS,
  URGENCY_LABELS,
  type CaseReport,
  type CaseStatus,
  type Urgency,
} from "../types/domain";

export const statusLabel = (status: CaseStatus) => STATUS_LABELS[status];
export const urgencyLabel = (urgency: Urgency) => URGENCY_LABELS[urgency];
export const formatDateTime = (date: string) =>
  new Intl.DateTimeFormat("en-ZA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
export const formatDate = (date: string) =>
  new Intl.DateTimeFormat("en-ZA", { day: "numeric", month: "short" }).format(
    new Date(date),
  );
export const caseCounts = (cases: CaseReport[]) => ({
  triage: cases.filter((item) => item.status === "needs_triage").length,
  unassigned: cases.filter((item) => item.status === "awaiting_assignment")
    .length,
  active: cases.filter((item) =>
    ["assigned", "in_care", "awaiting_verification"].includes(item.status),
  ).length,
  verified: cases.filter((item) => item.status === "verified").length,
});
