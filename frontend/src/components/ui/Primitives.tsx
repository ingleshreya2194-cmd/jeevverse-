import {
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import {
  STATUS_LABELS,
  URGENCY_LABELS,
  type CaseReport,
} from "../../types/domain";

export function Button({
  className = "",
  variant = "secondary",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "quiet";
}) {
  return (
    <button
      className={`button button--${variant} ${className}`.trim()}
      {...props}
    >
      {children}
    </button>
  );
}

export function TextField({
  id,
  label,
  hint,
  error,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
  error?: string;
}) {
  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>
        {label}
        {props.required && <span className="required-mark"> *</span>}
      </label>
      <input
        className={`field__control ${error ? "field__control--error" : ""}`}
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={
          [hint ? `${id}-hint` : "", error ? `${id}-error` : ""]
            .filter(Boolean)
            .join(" ") || undefined
        }
        {...props}
      />
      {hint && (
        <small id={`${id}-hint`} className="field__hint">
          {hint}
        </small>
      )}
      {error && (
        <small id={`${id}-error`} className="field__error">
          {error}
        </small>
      )}
    </div>
  );
}

export function SelectField({
  id,
  label,
  error,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>
        {label}
        {props.required && <span className="required-mark"> *</span>}
      </label>
      <select
        id={id}
        className={`field__control ${error ? "field__control--error" : ""}`}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        {...props}
      >
        {children}
      </select>
      {error && (
        <small id={`${id}-error`} className="field__error">
          {error}
        </small>
      )}
    </div>
  );
}

export function StatusLabel({ status }: { status: CaseReport["status"] }) {
  const className =
    status === "verified" || status === "closed"
      ? "status-label--verified"
      : status === "needs_triage" || status === "awaiting_assignment"
        ? "status-label--pending"
        : "status-label--active";
  return (
    <span className={`status-label ${className}`}>
      <span className="status-label__mark" aria-hidden="true" />
      {STATUS_LABELS[status]}
    </span>
  );
}

export function UrgencyLabel({ urgency }: { urgency: CaseReport["urgency"] }) {
  return (
    <span className={`urgency-label urgency-label--${urgency}`}>
      <span className="urgency-label__mark" aria-hidden="true" />
      {URGENCY_LABELS[urgency]}
    </span>
  );
}

export function EmptyState({
  title,
  detail,
  action,
}: {
  title: string;
  detail: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <span className="empty-state__line" aria-hidden="true" />
      <h3 className="h-display">{title}</h3>
      <p className="text-muted">{detail}</p>
      {action}
    </div>
  );
}

export function LoadingState({
  label = "Loading records",
}: {
  label?: string;
}) {
  return (
    <div className="loading-state" role="status">
      <span className="loader" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

export function ErrorMessage({
  children,
  onRetry,
}: {
  children: ReactNode;
  onRetry?: () => void;
}) {
  return (
    <div className="error-message" role="alert">
      <span>{children}</span>
      {onRetry && (
        <button type="button" className="text-action" onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  );
}
