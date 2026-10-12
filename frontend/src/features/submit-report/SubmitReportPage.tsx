import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Image,
  Paperclip,
  PawPrint,
  Trash,
  UploadSimple,
} from "@phosphor-icons/react";
import { useWorkspace } from "../../data/useWorkspace";
import { useToast } from "../../components/ui/useToast";
import { Button, SelectField, TextField } from "../../components/ui/Primitives";
import type { ReportDraft } from "../../types/domain";

const initialDraft: ReportDraft = {
  species: "",
  animal: "",
  condition: "",
  description: "",
  urgency: "routine",
  location: "",
  reporterName: "",
  reporterEmail: "",
};
const MAX_FILES = 4;
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const steps = ["Animal & condition", "Location & contact", "Evidence & review"];

export function SubmitReportPage() {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState(initialDraft);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const previewUrls = useRef<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [errorMessage, setErrorMessage] = useState("");
  const [completedReference, setCompletedReference] = useState<string | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { createReport } = useWorkspace();
  const { showToast } = useToast();
  const navigate = useNavigate();

  useEffect(
    () => () => previewUrls.current.forEach((url) => URL.revokeObjectURL(url)),
    [],
  );

  const update = (key: keyof ReportDraft, value: string) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: "" }));
  };

  const validate = (targetStep: number) => {
    const nextErrors: Record<string, string> = {};
    if (targetStep === 0) {
      if (!draft.species)
        nextErrors.species = "Select the closest animal group.";
      if (draft.animal.trim().length < 2)
        nextErrors.animal = "Add a short description of the animal.";
      if (!draft.condition) nextErrors.condition = "Choose the main concern.";
      if (draft.description.trim().length < 12)
        nextErrors.description =
          "Add at least a short sentence about what you observed.";
    }
    if (targetStep === 1) {
      if (draft.location.trim().length < 5)
        nextErrors.location = "Add an area, landmark, or street.";
      if (draft.reporterName.trim().length < 2)
        nextErrors.reporterName = "Enter your name.";
      if (
        draft.reporterEmail &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.reporterEmail)
      )
        nextErrors.reporterEmail = "Enter a valid email address.";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const incoming = Array.from(list);
    const invalid = incoming.find(
      (file) =>
        !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
        file.size > MAX_FILE_SIZE,
    );
    if (invalid) {
      setErrorMessage(
        `${invalid.name} is not a supported image or is larger than 5 MB.`,
      );
      return;
    }
    const accepted = incoming.slice(0, Math.max(0, MAX_FILES - files.length));
    const nextPreviews = accepted.map((file) => URL.createObjectURL(file));
    previewUrls.current.push(...nextPreviews);
    setPreviews((current) => [...current, ...nextPreviews]);
    if (files.length + incoming.length > MAX_FILES)
      setErrorMessage(`You can attach up to ${MAX_FILES} images.`);
    else setErrorMessage("");
    setFiles((current) => [...current, ...accepted]);
  };

  const submit = async () => {
    setBusy(true);
    setErrorMessage("");
    try {
      const record = await createReport(draft, files);
      setCompletedReference(record.reference);
      showToast(
        record.warnings?.length
          ? "Report received. One or more images could not be attached."
          : "Report submitted to the triage queue.",
        record.warnings?.length ? "error" : "success",
      );
      if (record.warnings?.length)
        setErrorMessage(
          `Report ${record.reference} was saved, but evidence could not be attached: ${record.warnings.join(" · ")}`,
        );
    } catch (cause) {
      setErrorMessage(
        cause instanceof Error
          ? cause.message
          : "Could not submit this report. Your details are still here; please try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  if (completedReference)
    return (
      <section className="submission-success">
        <div className="success-mark">
          <Check size={23} weight="bold" />
        </div>
        <h1 className="h-display">Report received</h1>
        <p>
          Your report has been added to the triage queue. The response team will
          review the details and follow up using the contact information
          provided.
        </p>
        {errorMessage && (
          <p className="upload-warning" role="alert">
            {errorMessage}
          </p>
        )}
        <div className="success-reference">
          <span>Case reference</span>
          <strong>{completedReference}</strong>
        </div>
        <div className="success-actions">
          <Link to="/reports" className="button button--primary">
            View response queue <ArrowRight size={16} />
          </Link>
          <button
            className="button button--secondary"
            onClick={() => navigate("/reports/new", { replace: true })}
          >
            Submit another report
          </button>
        </div>
      </section>
    );

  return (
    <section className="submit-page" aria-labelledby="submit-heading">
      <div className="page-heading">
        <div>
          <h1 id="submit-heading" className="h-display page-title">
            Submit an animal welfare report
          </h1>
          <p className="page-description">
            Share what you saw. The response team will review the report and
            coordinate next steps.
          </p>
        </div>
      </div>
      <div className="wizard-layout">
        <aside className="wizard-aside">
          <div className="wizard-mark">
            <PawPrint size={20} weight="duotone" />
          </div>
          <h2 className="h-display">
            A clear first report helps us respond safely.
          </h2>
          <p>
            Include only what you could observe without approaching or handling
            the animal.
          </p>
          <div className="report-safety">
            <strong>Keep your distance</strong>
            <span>
              Do not try to catch or transport an unfamiliar animal. If there is
              immediate danger to people, contact local emergency services.
            </span>
          </div>
        </aside>
        <div className="wizard-panel">
          <div
            className="wizard-progress"
            aria-label={`Step ${step + 1} of ${steps.length}`}
          >
            <div className="wizard-progress__bar">
              {steps.map((label, index) => (
                <div
                  className={`wizard-step ${index === step ? "wizard-step--current" : ""} ${index < step ? "wizard-step--complete" : ""}`}
                  key={label}
                >
                  <span className="wizard-step__number">
                    {index < step ? (
                      <Check size={13} weight="bold" />
                    ) : (
                      index + 1
                    )}
                  </span>
                  <span>{label}</span>
                </div>
              ))}
            </div>
            <div className="progress-track">
              <span
                style={{ width: `${((step + 1) / steps.length) * 100}%` }}
              />
            </div>
          </div>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (step < 2) {
                if (validate(step)) setStep((current) => current + 1);
              } else void submit();
            }}
            noValidate
          >
            {step === 0 && (
              <div className="wizard-fields">
                <div className="wizard-step-title">
                  <span>Step 1 of 3</span>
                  <h2 className="h-display">What did you observe?</h2>
                  <p>Start with the animal and the main concern.</p>
                </div>
                <div className="field-row">
                  <SelectField
                    id="species"
                    label="Animal type"
                    required
                    value={draft.species}
                    error={errors.species}
                    onChange={(event) => update("species", event.target.value)}
                  >
                    <option value="">Select an animal type</option>
                    {["Dog", "Cat", "Cow / cattle", "Bird", "Monkey", "Other / unsure"].map(
                      (value) => (
                        <option key={value}>{value}</option>
                      ),
                    )}
                  </SelectField>
                  <SelectField
                    id="condition"
                    label="Main concern"
                    required
                    value={draft.condition}
                    error={errors.condition}
                    onChange={(event) =>
                      update("condition", event.target.value)
                    }
                  >
                    <option value="">Select a concern</option>
                    {[
                      "Injury or illness",
                      "Abandoned or lost",
                      "Trapped or entangled",
                      "Found outside habitat",
                      "Unsafe environment",
                      "Other concern",
                    ].map((value) => (
                      <option key={value}>{value}</option>
                    ))}
                  </SelectField>
                </div>
                <TextField
                  id="animal"
                  label="Animal description"
                  required
                  placeholder="Example only: adult street dog with a paw injury"
                  value={draft.animal}
                  error={errors.animal}
                  onChange={(event) => update("animal", event.target.value)}
                />
                <div className="field">
                  <label className="field__label" htmlFor="description">
                    What happened? <span className="required-mark">*</span>
                  </label>
                  <textarea
                    className={`field__control field__textarea ${errors.description ? "field__control--error" : ""}`}
                    id="description"
                    rows={4}
                    placeholder="What did you see? When was the animal last observed?"
                    value={draft.description}
                    aria-invalid={Boolean(errors.description)}
                    aria-describedby={
                      errors.description ? "description-error" : undefined
                    }
                    onChange={(event) =>
                      update("description", event.target.value)
                    }
                  />
                  <small
                    className={
                      errors.description ? "field__error" : "field__hint"
                    }
                    id={errors.description ? "description-error" : undefined}
                  >
                    {errors.description ||
                      "Do not approach or disturb the animal."}
                  </small>
                </div>
                <SelectField
                  id="urgency"
                  label="How urgent does this seem?"
                  value={draft.urgency}
                  onChange={(event) =>
                    update(
                      "urgency",
                      event.target.value as ReportDraft["urgency"],
                    )
                  }
                >
                  <option value="routine">
                    Routine — animal is safe for now
                  </option>
                  <option value="high">
                    High — condition needs attention soon
                  </option>
                  <option value="urgent">
                    Urgent — immediate response may be needed
                  </option>
                </SelectField>
              </div>
            )}
            {step === 1 && (
              <div className="wizard-fields">
                <div className="wizard-step-title">
                  <span>Step 2 of 3</span>
                  <h2 className="h-display">Where was the animal?</h2>
                  <p>
                    Share enough detail to help a local caregiver find the right
                    place.
                  </p>
                </div>
                <TextField
                  id="location"
                  label="Area or nearest landmark"
                  required
                  autoComplete="street-address"
                  placeholder="Example only: Kothrud, Pune, Maharashtra"
                  value={draft.location}
                  error={errors.location}
                  onChange={(event) => update("location", event.target.value)}
                  hint="Avoid sharing a private home address unless necessary."
                />
                <div className="field-row">
                  <TextField
                    id="reporterName"
                    label="Your name"
                    required
                    autoComplete="name"
                    value={draft.reporterName}
                    error={errors.reporterName}
                    onChange={(event) =>
                      update("reporterName", event.target.value)
                    }
                  />
                  <TextField
                    id="reporterEmail"
                    label="Email for follow-up"
                    type="email"
                    autoComplete="email"
                    value={draft.reporterEmail}
                    error={errors.reporterEmail}
                    onChange={(event) =>
                      update("reporterEmail", event.target.value)
                    }
                    hint="Optional, but helps the team ask a follow-up question."
                  />
                </div>
              </div>
            )}
            {step === 2 && (
              <div className="wizard-fields">
                <div className="wizard-step-title">
                  <span>Step 3 of 3</span>
                  <h2 className="h-display">Add evidence and review</h2>
                  <p>
                    Photos are optional. Upload only images you have permission
                    to share.
                  </p>
                </div>
                <div className="upload-field">
                  <input
                    ref={inputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    hidden
                    onChange={(event) => addFiles(event.currentTarget.files)}
                  />
                  <button
                    type="button"
                    className="upload-target"
                    onClick={() => inputRef.current?.click()}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                      event.preventDefault();
                      addFiles(event.dataTransfer.files);
                    }}
                  >
                    <span className="upload-icon">
                      <UploadSimple size={20} />
                    </span>
                    <strong>Choose images or drop them here</strong>
                    <span>
                      JPEG, PNG or WebP · up to 5 MB each · {MAX_FILES} images
                      maximum
                    </span>
                  </button>
                  {files.length > 0 && (
                    <div
                      className="upload-previews"
                      aria-label="Selected evidence"
                    >
                      {files.map((file, index) => (
                        <div
                          className="upload-preview"
                          key={`${file.name}-${index}`}
                        >
                          <img
                            src={previews[index]}
                            alt={`Preview: ${file.name}`}
                          />
                          <span>
                            <Paperclip size={14} />
                            {file.name}
                          </span>
                          <button
                            type="button"
                            aria-label={`Remove ${file.name}`}
                            onClick={() => {
                              const removedUrl = previews[index];
                              URL.revokeObjectURL(removedUrl);
                              previewUrls.current = previewUrls.current.filter(
                                (url) => url !== removedUrl,
                              );
                              setPreviews((current) =>
                                current.filter(
                                  (_, fileIndex) => fileIndex !== index,
                                ),
                              );
                              setFiles((current) =>
                                current.filter(
                                  (_, fileIndex) => fileIndex !== index,
                                ),
                              );
                            }}
                          >
                            <Trash size={15} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {errorMessage && (
                    <p className="field__error" role="alert">
                      {errorMessage}
                    </p>
                  )}
                </div>
                <div className="review-summary">
                  <h3>Review your report</h3>
                  <dl>
                    <div>
                      <dt>Animal</dt>
                      <dd>
                        {draft.animal} <span>· {draft.species}</span>
                      </dd>
                    </div>
                    <div>
                      <dt>Concern</dt>
                      <dd>
                        {draft.condition} <span>· {draft.urgency}</span>
                      </dd>
                    </div>
                    <div>
                      <dt>Location</dt>
                      <dd>{draft.location}</dd>
                    </div>
                    <div>
                      <dt>Reporter</dt>
                      <dd>
                        {draft.reporterName}
                        {draft.reporterEmail ? ` · ${draft.reporterEmail}` : ""}
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>
            )}
            {step < 2 && errorMessage && (
              <p className="field__error form-error" role="alert">
                {errorMessage}
              </p>
            )}
            <div className="wizard-actions">
              {step > 0 ? (
                <Button
                  type="button"
                  onClick={() => setStep((current) => current - 1)}
                >
                  <ArrowLeft size={16} /> Back
                </Button>
              ) : (
                <Link to="/reports" className="text-action">
                  Cancel
                </Link>
              )}
              {step < 2 ? (
                <Button type="submit" variant="primary">
                  Continue <ArrowRight size={16} />
                </Button>
              ) : (
                <Button type="submit" variant="primary" disabled={busy}>
                  <Image size={16} />
                  {busy ? "Submitting report…" : "Submit report"}
                </Button>
              )}
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
