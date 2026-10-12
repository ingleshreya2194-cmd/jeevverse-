import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CalendarBlank, ShieldCheck } from "@phosphor-icons/react";
import { useWorkspace } from "../../data/useWorkspace";
import { useAuth } from "../../auth/useAuth";
import {
  EmptyState,
  LoadingState,
  ErrorMessage,
} from "../../components/ui/Primitives";
import { formatDate } from "../../lib/formatters";

const ranges = [7, 30, 90] as const;

type Range = (typeof ranges)[number];
const rangeLabels: Record<Range, string> = {
  7: "7 days",
  30: "30 days",
  90: "90 days",
};
const breakdown = [
  { status: "verified", label: "Verified outcomes", tone: "verified" },
  {
    status: "awaiting_verification",
    label: "Awaiting outcome review",
    tone: "review",
  },
  { status: "in_care", label: "In active care", tone: "care" },
  {
    status: "awaiting_assignment",
    label: "Awaiting assignment",
    tone: "pending",
  },
  { status: "needs_triage", label: "Needs first review", tone: "triage" },
];

export function ImpactPage() {
  const { cases, loading, error, refresh } = useWorkspace();
  const { isDemo } = useAuth();
  const [range, setRange] = useState<Range>(30);
  const [today] = useState(() => new Date().toISOString().slice(0, 10));
  const startIso = useMemo(() => {
    const start = new Date(`${today}T00:00:00.000Z`);
    start.setUTCDate(start.getUTCDate() - range);
    return start.toISOString();
  }, [today, range]);
  const periodCases = useMemo(
    () =>
      cases.filter((item) => new Date(item.receivedAt) >= new Date(startIso)),
    [cases, startIso],
  );
  const verified = periodCases.filter((item) => item.status === "verified");
  const reached = periodCases.filter((item) =>
    ["in_care", "awaiting_verification", "verified", "closed"].includes(
      item.status,
    ),
  );
  const counts = useMemo(
    () =>
      Object.fromEntries(
        breakdown.map(({ status }) => [
          status,
          periodCases.filter((item) => item.status === status).length,
        ]),
      ) as Record<string, number>,
    [periodCases],
  );
  const maxCount = Math.max(1, ...Object.values(counts));

  return (
    <section className="impact-page" aria-labelledby="impact-heading">
      <div className="page-heading page-heading--impact">
        <div>
          <h1 id="impact-heading" className="h-display page-title">
            Impact you can account for
          </h1>
          <p className="page-description">
            Cases reflect one reported animal each. Outcomes count only after a
            response coordinator verifies them.
            {isDemo && " All figures shown are fictional demo examples."}
          </p>
        </div>
        <label className="range-filter">
          <CalendarBlank size={16} />
          <span className="visually-hidden">Select reporting period</span>
          <select
            value={range}
            onChange={(event) => setRange(Number(event.target.value) as Range)}
          >
            {ranges.map((value) => (
              <option key={value} value={value}>
                {rangeLabels[value]}
              </option>
            ))}
          </select>
        </label>
      </div>
      {loading ? (
        <LoadingState label="Calculating verified outcomes" />
      ) : error ? (
        <ErrorMessage onRetry={() => void refresh()}>{error}</ErrorMessage>
      ) : periodCases.length === 0 ? (
        <EmptyState
          title="No reports in this period"
          detail="Choose a longer date range, or return when your response team has recorded its first report."
          action={
            <Link to="/reports/new" className="button button--primary">
              Submit a report <ArrowRight size={16} />
            </Link>
          }
        />
      ) : (
        <>
          <div className="impact-proof">
            <div className="impact-primary-stat">
              <span>Verified outcomes</span>
              <strong className="h-display">{verified.length}</strong>
              <small>
                <ShieldCheck size={15} /> Care record reviewed
              </small>
            </div>
            <div className="impact-secondary-stat">
              <span>Animals reached</span>
              <strong className="h-display">{reached.length}</strong>
              <small>Care started or completed</small>
            </div>
            <div className="impact-secondary-stat">
              <span>Reports received</span>
              <strong className="h-display">{periodCases.length}</strong>
              <small>Within the selected period</small>
            </div>
            <p className="impact-period">
              {formatDate(startIso)} — {formatDate(today)}
            </p>
          </div>
          <div className="impact-detail-layout">
            <section className="impact-breakdown">
              <div className="section-heading">
                <div>
                  <h2 className="h-display">Where reports stand</h2>
                  <p>Current case state for reports received in this period.</p>
                </div>
                <span className="text-mono">{periodCases.length} TOTAL</span>
              </div>
              <div className="breakdown-list">
                {breakdown.map(({ status, label, tone }) => {
                  const count = counts[status] ?? 0;
                  return (
                    <div className="breakdown-item" key={status}>
                      <div className="breakdown-label">
                        <span
                          className={`breakdown-key breakdown-key--${tone}`}
                        />
                        <span>{label}</span>
                        <strong>{count}</strong>
                      </div>
                      <div
                        className="breakdown-track"
                        role="progressbar"
                        aria-label={label}
                        aria-valuemin={0}
                        aria-valuemax={periodCases.length}
                        aria-valuenow={count}
                      >
                        <span
                          className={`breakdown-fill breakdown-fill--${tone}`}
                          style={{ width: `${(count / maxCount) * 100}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="impact-note">
                <ShieldCheck size={15} /> Verification requires a written
                outcome and a review step. Reports still in care are not counted
                as complete.
              </p>
            </section>
            <aside className="impact-aside">
              <div className="impact-aside__rule" />
              <h2 className="h-display">Evidence before totals.</h2>
              <p>
                Each count links back to a case, a field update, and the person
                who confirmed what happened.
              </p>
              <Link to="/reports?status=verified" className="text-action">
                Review verified cases <ArrowRight size={15} />
              </Link>
              <div className="impact-aside__figure" aria-hidden="true">
                <span className="trace-ring trace-ring--one" />
                <span className="trace-ring trace-ring--two" />
                <span className="trace-ring trace-ring--three" />
                <span className="trace-node trace-node--report" />
                <span className="trace-node trace-node--care" />
                <span className="trace-node trace-node--verified" />
                <span className="trace-route" />
              </div>
              <div className="trace-legend">
                <span>
                  <i className="trace-node--report" /> Report
                </span>
                <span>
                  <i className="trace-node--care" /> Care
                </span>
                <span>
                  <i className="trace-node--verified" /> Verified
                </span>
              </div>
            </aside>
          </div>
        </>
      )}
    </section>
  );
}
