import { useMemo, useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  CaretDown,
  MagnifyingGlass,
  MapPin,
  Plus,
  ShieldCheck,
} from "@phosphor-icons/react";
import { useWorkspace } from "../../data/useWorkspace";
import { useAuth } from "../../auth/useAuth";
import { caseCounts, formatDateTime } from "../../lib/formatters";
import type { CaseReport, CaseStatus } from "../../types/domain";
import {
  ErrorMessage,
  EmptyState,
  LoadingState,
  StatusLabel,
  UrgencyLabel,
  Button,
} from "../../components/ui/Primitives";
import { Modal } from "../../components/ui/Modal";
import { useToast } from "../../components/ui/useToast";

const FILTERS: { label: string; value: CaseStatus | "all" }[] = [
  { label: "All reports", value: "all" },
  { label: "Needs triage", value: "needs_triage" },
  { label: "Awaiting assignment", value: "awaiting_assignment" },
  { label: "In progress", value: "in_care" },
  { label: "Awaiting verification", value: "awaiting_verification" },
  { label: "Verified", value: "verified" },
];

function getPriority(item: CaseReport) {
  return { urgent: 0, high: 1, routine: 2 }[item.urgency];
}

export function ReportsPage() {
  const { cases, loading, error, refresh } = useWorkspace();
  const [search, setSearch] = useState("");
  const [queryParams] = useSearchParams();
  const [statusFilter, setStatusFilter] = useState<CaseStatus | "all">(() =>
    queryParams.get("status") === "verified" ? "verified" : "all",
  );
  const [urgencyFilter, setUrgencyFilter] = useState("all");
  const [page, setPage] = useState(0);
  const pageSize = 7;
  const counts = caseCounts(cases);

  const filtered = useMemo(
    () =>
      cases
        .filter((item) => {
          const matchesSearch =
            `${item.reference} ${item.animal} ${item.condition} ${item.location} ${item.caregiverName ?? ""}`
              .toLowerCase()
              .includes(search.toLowerCase());
          return (
            matchesSearch &&
            (statusFilter === "all" || item.status === statusFilter) &&
            (urgencyFilter === "all" || item.urgency === urgencyFilter)
          );
        })
        .sort(
          (a, b) =>
            getPriority(a) - getPriority(b) ||
            new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime(),
        ),
    [cases, search, statusFilter, urgencyFilter],
  );
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visibleCases = filtered.slice(page * pageSize, (page + 1) * pageSize);

  return (
    <section className="reports-page" aria-labelledby="reports-heading">
      <div className="page-heading page-heading--queue">
        <div>
          <h1 id="reports-heading" className="h-display page-title">
            Response queue
          </h1>
          <p className="page-description">
            Sort the next field decision from the latest animal welfare reports.
          </p>
        </div>
        <Link
          to="/reports/new"
          className="button button--primary heading-action"
        >
          <Plus size={17} weight="bold" /> Submit report
        </Link>
      </div>
      <div className="operational-summary" aria-label="Current workload counts">
        <div className="summary-focus">
          <span className="summary-focus__number">{counts.triage}</span>
          <span>
            <strong>Needs triage</strong>
            <small>Reports waiting for a first review</small>
          </span>
        </div>
        <div className="summary-stat">
          <span>{counts.unassigned}</span>
          <small>Awaiting assignment</small>
        </div>
        <div className="summary-stat">
          <span>{counts.active}</span>
          <small>Active field cases</small>
        </div>
        <Link to="/impact" className="summary-link">
          View verified outcomes <ArrowRight size={15} />
        </Link>
      </div>
      <div className="ledger-panel">
        <div className="ledger-heading">
          <div>
            <h2 className="h-display">Animal welfare reports</h2>
            <p>
              {filtered.length} matching{" "}
              {filtered.length === 1 ? "case" : "cases"} · Most urgent first
            </p>
          </div>
          <span className="ledger-mark">
            <span className="ledger-mark__dot" /> Working queue
          </span>
        </div>
        <div className="queue-controls">
          <label className="search-field">
            <MagnifyingGlass size={17} />
            <input
              aria-label="Search reports"
              placeholder="Search cases, conditions, or locations"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(0);
              }}
            />
          </label>
          <label className="filter-select">
            <span className="visually-hidden">Filter by urgency</span>
            <select
              aria-label="Filter by urgency"
              value={urgencyFilter}
              onChange={(event) => {
                setUrgencyFilter(event.target.value);
                setPage(0);
              }}
            >
              <option value="all">All urgency</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="routine">Routine</option>
            </select>
            <CaretDown size={14} />
          </label>
        </div>
        <div
          className="filter-tabs"
          role="group"
          aria-label="Filter by case status"
        >
          {FILTERS.map((filter) => (
            <button
              key={filter.value}
              className={`filter-tab ${statusFilter === filter.value ? "filter-tab--active" : ""}`}
              aria-pressed={statusFilter === filter.value}
              onClick={() => {
                setStatusFilter(filter.value);
                setPage(0);
              }}
            >
              {filter.label}
              {filter.value === "needs_triage" && counts.triage > 0 && (
                <span className="filter-tab__count">{counts.triage}</span>
              )}
            </button>
          ))}
        </div>
        {loading ? (
          <LoadingState label="Loading the response queue" />
        ) : error ? (
          <ErrorMessage onRetry={() => void refresh()}>{error}</ErrorMessage>
        ) : visibleCases.length === 0 ? (
          <EmptyState
            title="No reports match this view"
            detail="Try a different filter or clear your search to see the full response queue."
            action={
              <button
                className="text-action"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("all");
                  setUrgencyFilter("all");
                }}
              >
                Clear filters
              </button>
            }
          />
        ) : (
          <>
            <div className="table-scroll">
              <table className="case-table">
                <thead>
                  <tr>
                    <th scope="col">Urgency</th>
                    <th scope="col">Animal &amp; condition</th>
                    <th scope="col">Location</th>
                    <th scope="col">Reported</th>
                    <th scope="col">Caregiver</th>
                    <th scope="col">Next state</th>
                    <th scope="col">
                      <span className="visually-hidden">Open report</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {visibleCases.map((item) => (
                    <tr key={item.id} className="case-row">
                      <td>
                        <UrgencyLabel urgency={item.urgency} />
                      </td>
                      <td>
                        <Link className="case-main" to={`/reports/${item.id}`}>
                          <span className="case-name">{item.animal}</span>
                          <span className="case-condition">
                            {item.condition}
                          </span>
                          <span className="case-reference">
                            {item.reference}
                          </span>
                        </Link>
                      </td>
                      <td>
                        <span className="case-location">
                          <MapPin size={14} aria-hidden="true" />
                          {item.location}
                        </span>
                      </td>
                      <td>
                        <span className="case-time">
                          {formatDateTime(item.receivedAt)}
                        </span>
                      </td>
                      <td>
                        <span className="case-caregiver">
                          {item.caregiverName ?? <em>Unassigned</em>}
                        </span>
                      </td>
                      <td>
                        <StatusLabel status={item.status} />
                      </td>
                      <td>
                        <Link
                          className="row-open"
                          to={`/reports/${item.id}`}
                          aria-label={`Open ${item.reference}`}
                        >
                          <ArrowUpRight size={17} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mobile-case-list">
              {visibleCases.map((item) => (
                <Link
                  className="mobile-case"
                  key={item.id}
                  to={`/reports/${item.id}`}
                >
                  <div className="mobile-case__top">
                    <UrgencyLabel urgency={item.urgency} />
                    <StatusLabel status={item.status} />
                  </div>
                  <strong>{item.animal}</strong>
                  <span>{item.condition}</span>
                  <span className="case-location">
                    <MapPin size={14} />
                    {item.location}
                  </span>
                  <div className="mobile-case__foot">
                    <span className="case-reference">
                      {item.reference} · {formatDateTime(item.receivedAt)}
                    </span>
                    <ArrowRight size={16} />
                  </div>
                </Link>
              ))}
            </div>
            <div className="ledger-pagination">
              <span>
                Showing {page * pageSize + 1}–
                {Math.min((page + 1) * pageSize, filtered.length)} of{" "}
                {filtered.length} cases
              </span>
              <div>
                <button
                  aria-label="Previous page"
                  disabled={page === 0}
                  onClick={() => setPage((value) => Math.max(0, value - 1))}
                >
                  <ArrowLeft size={15} />
                </button>
                <span>
                  {page + 1} / {pageCount}
                </span>
                <button
                  aria-label="Next page"
                  disabled={page + 1 >= pageCount}
                  onClick={() =>
                    setPage((value) => Math.min(pageCount - 1, value + 1))
                  }
                >
                  <ArrowRight size={15} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
      <p className="workflow-note">
        <ShieldCheck size={15} /> Outcomes are only counted after a coordinator
        records and verifies the result.
      </p>
    </section>
  );
}

export function CaseDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    cases,
    caregivers,
    loading,
    error,
    refresh,
    assignCaregiver,
    addCareUpdate,
    requestVerification,
    verifyOutcome,
  } = useWorkspace();
  const { user, isDemo } = useAuth();
  const { showToast } = useToast();
  const [note, setNote] = useState("");
  const [outcome, setOutcome] = useState("");
  const [confirmVerify, setConfirmVerify] = useState(false);
  const [busy, setBusy] = useState(false);
  const item = cases.find((record) => record.id === id);

  if (loading) return <LoadingState label="Opening case record" />;
  if (error)
    return <ErrorMessage onRetry={() => void refresh()}>{error}</ErrorMessage>;
  if (!item)
    return (
      <EmptyState
        title="Report not found"
        detail="This case may have been removed or you may not have permission to view it."
        action={
          <Link to="/reports" className="button button--secondary">
            Back to reports
          </Link>
        }
      />
    );

  const runAction = async (work: () => Promise<void>, message: string) => {
    setBusy(true);
    try {
      await work();
      showToast(message);
    } catch (cause) {
      showToast(
        cause instanceof Error
          ? cause.message
          : "The case could not be updated.",
        "error",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="case-detail-page">
      <button className="back-link" onClick={() => navigate("/reports")}>
        <ArrowLeft size={16} /> All reports
      </button>
      <div className="case-detail-heading">
        <div>
          <div className="case-reference detail-reference">
            {item.reference}
          </div>
          <h1 className="h-display page-title">{item.animal}</h1>
          <p className="page-description">
            {item.condition} <span>·</span> {item.location}
          </p>
        </div>
        <div className="case-detail-status">
          <UrgencyLabel urgency={item.urgency} />
          <StatusLabel status={item.status} />
        </div>
      </div>
      <div className="detail-grid">
        <div className="detail-primary">
          <section className="detail-section">
            <div className="section-heading">
              <h2 className="h-display">Report details</h2>
              <time>{formatDateTime(item.receivedAt)}</time>
            </div>
            <dl className="case-facts">
              <div>
                <dt>Animal</dt>
                <dd>
                  {item.animal} <span>({item.species})</span>
                </dd>
              </div>
              <div>
                <dt>Condition</dt>
                <dd>{item.condition}</dd>
              </div>
              <div>
                <dt>Location</dt>
                <dd>
                  <MapPin size={15} />
                  {item.location}
                </dd>
              </div>
              <div>
                <dt>Reporter</dt>
                <dd>
                  {item.reporterName}
                  <a href={`mailto:${item.reporterEmail}`}>
                    {item.reporterEmail}
                  </a>
                </dd>
              </div>
            </dl>
            <p className="case-description">{item.description}</p>
            {item.evidence.length > 0 && (
              <div className="evidence-list">
                <h3>Attached evidence</h3>
                {item.evidence.map((file) => (
                  <div className="evidence-item" key={file.id}>
                    {file.url && (
                      <img
                        src={file.url}
                        alt={`Evidence submitted for ${item.reference}`}
                      />
                    )}
                    {file.url ? (
                      <a href={file.url} target="_blank" rel="noreferrer">
                        {file.fileName}
                      </a>
                    ) : (
                      <span>{file.fileName}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
          <section className="detail-section">
            <div className="section-heading">
              <h2 className="h-display">Case timeline</h2>
              <span>{item.updates.length} updates</span>
            </div>
            <ol className="timeline">
              {item.updates.map((update) => (
                <li className="timeline-item" key={update.id}>
                  <span
                    className={`timeline-marker timeline-marker--${update.kind}`}
                    aria-hidden="true"
                  />
                  <div>
                    <strong>{update.content}</strong>
                    <span>
                      {update.author} ·{" "}
                      <time>{formatDateTime(update.createdAt)}</time>
                    </span>
                  </div>
                </li>
              ))}
            </ol>
            {item.status === "verified" && item.outcome && (
              <div className="verified-outcome">
                <ShieldCheck size={18} />
                <div>
                  <strong>Verified outcome</strong>
                  <p>{item.outcome}</p>
                </div>
              </div>
            )}
          </section>
        </div>
        <aside className="case-action-panel">
          <h2 className="h-display">Next action</h2>
          <p className="text-muted">
            Record what happens next so the report remains auditable.
          </p>
          {(isDemo || user?.role === "coordinator" || user?.role === "admin") &&
            (item.status === "needs_triage" ||
              item.status === "awaiting_assignment" ||
              item.status === "assigned") && (
              <div className="action-block">
                <label className="field__label" htmlFor="assign-caregiver">
                  {item.caregiverId ? "Reassign caregiver" : "Assign caregiver"}
                </label>
                <select
                  id="assign-caregiver"
                  className="field__control"
                  defaultValue={item.caregiverId ?? ""}
                  disabled={busy}
                  onChange={(event) => {
                    if (event.target.value)
                      void runAction(
                        () => assignCaregiver(item.id, event.target.value),
                        "Caregiver assigned to the case.",
                      );
                  }}
                >
                  <option value="">Choose caregiver</option>
                  {caregivers
                    .filter(
                      (caregiver) =>
                        caregiver.availability !== "At capacity" ||
                        caregiver.id === item.caregiverId,
                    )
                    .map((caregiver) => (
                      <option value={caregiver.id} key={caregiver.id}>
                        {caregiver.name} · {caregiver.serviceArea}
                      </option>
                    ))}
                </select>
                <small className="field__hint">
                  Only caregivers marked available or already assigned are
                  shown.
                </small>
              </div>
            )}
          {(isDemo ||
            user?.role === "caregiver" ||
            user?.role === "coordinator" ||
            user?.role === "admin") &&
            ["assigned", "in_care"].includes(item.status) && (
              <div className="action-block">
                <label className="field__label" htmlFor="care-update">
                  Field care update
                </label>
                <textarea
                  id="care-update"
                  className="field__control field__textarea"
                  placeholder="What did the caregiver observe or do?"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  maxLength={1000}
                />
                <Button
                  variant="secondary"
                  disabled={busy || note.trim().length < 8}
                  onClick={() =>
                    void runAction(async () => {
                      await addCareUpdate(item.id, note.trim());
                      setNote("");
                    }, "Field care update added.")
                  }
                >
                  Add care update
                </Button>
              </div>
            )}
          {(isDemo ||
            user?.role === "caregiver" ||
            user?.role === "coordinator" ||
            user?.role === "admin") &&
            item.status === "in_care" && (
              <div className="action-block">
                <label className="field__label" htmlFor="verification-notes">
                  Submit outcome for review
                </label>
                <textarea
                  id="verification-notes"
                  className="field__control field__textarea"
                  placeholder="Describe the care delivered and observed result."
                  value={outcome}
                  onChange={(event) => setOutcome(event.target.value)}
                  maxLength={1000}
                />
                <Button
                  variant="secondary"
                  disabled={busy || outcome.trim().length < 10}
                  onClick={() =>
                    void runAction(async () => {
                      await requestVerification(item.id, outcome.trim());
                      setOutcome("");
                    }, "Outcome submitted for coordinator review.")
                  }
                >
                  Request verification
                </Button>
                <small className="field__hint">
                  The case must be in care. A coordinator reviews before
                  outcomes count.
                </small>
              </div>
            )}
          {(isDemo || user?.role === "coordinator" || user?.role === "admin") &&
            item.status === "awaiting_verification" && (
              <div className="action-block">
                <label className="field__label" htmlFor="outcome-note">
                  Verified outcome
                </label>
                <textarea
                  id="outcome-note"
                  className="field__control field__textarea"
                  placeholder="Confirm the result and how it was checked."
                  value={outcome}
                  onChange={(event) => setOutcome(event.target.value)}
                  maxLength={1000}
                />
                <Button
                  variant="primary"
                  disabled={busy || outcome.trim().length < 10}
                  onClick={() => setConfirmVerify(true)}
                >
                  <ShieldCheck size={16} /> Verify outcome
                </Button>
                <small className="field__hint">
                  Only an authorized coordinator can confirm this outcome.
                </small>
              </div>
            )}
          {item.status === "verified" && (
            <div className="action-complete">
              <ShieldCheck size={18} />
              <strong>Outcome verified</strong>
              <p>This case is included in verified outcome totals.</p>
            </div>
          )}
          {item.status === "awaiting_assignment" && (
            <p className="action-hint">
              Select an available caregiver to begin the field response.
            </p>
          )}
        </aside>
      </div>
      {confirmVerify && (
        <Modal
          title="Verify this outcome?"
          onClose={() => setConfirmVerify(false)}
        >
          <p className="modal-copy">
            This record will be counted as a verified animal welfare outcome.
            Confirm the care notes and evidence have been reviewed.
          </p>
          <div className="modal-outcome">
            <span>Outcome</span>
            <p>{outcome}</p>
          </div>
          <div className="modal-actions">
            <Button variant="secondary" onClick={() => setConfirmVerify(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={busy}
              onClick={() => {
                void runAction(async () => {
                  await verifyOutcome(item.id, outcome.trim());
                  setConfirmVerify(false);
                  setOutcome("");
                }, "Outcome verified and recorded.");
              }}
            >
              <ShieldCheck size={16} /> Confirm verification
            </Button>
          </div>
        </Modal>
      )}
    </section>
  );
}
