import { useState, type FormEvent } from "react";
import {
  Link,
  Navigate,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import { ArrowLeft, Eye, EyeSlash, PawPrint } from "@phosphor-icons/react";
import { useAuth } from "../../auth/useAuth";
import { useToast } from "../../components/ui/useToast";
import { Button } from "../../components/ui/Primitives";

export function AuthPage() {
  const { mode = "login" } = useParams();
  const normalizedMode = [
    "login",
    "register",
    "forgot-password",
    "recovery",
  ].includes(mode)
    ? mode
    : "login";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [formError, setFormError] = useState("");
  const {
    user,
    isReady,
    isDemo,
    signIn,
    signUp,
    sendRecovery,
    updatePassword,
  } = useAuth();
  const { showToast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const destination =
    (location.state as { from?: { pathname?: string } } | null)?.from
      ?.pathname ?? "/reports";
  const isRecoveryRequest = normalizedMode === "forgot-password";
  const isPasswordChange = normalizedMode === "recovery";

  if (!isReady)
    return (
      <div className="auth-loading">
        <span className="loader" aria-label="Loading session" />
      </div>
    );
  if (user && !isPasswordChange) return <Navigate to={destination} replace />;
  const title =
    normalizedMode === "register"
      ? "Create a team account"
      : isRecoveryRequest
        ? "Reset your password"
        : isPasswordChange
          ? "Choose a new password"
          : "Sign in to your workspace";
  const subtitle =
    normalizedMode === "register"
      ? "Join the response team to review reports and coordinate field care."
      : isRecoveryRequest
        ? "We will send a password reset link to the address on your account."
        : isPasswordChange
          ? "Use a new password to secure your JeevVerse account."
          : "Access the animal welfare response queue.";

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setFormError("");
    try {
      if (isRecoveryRequest) {
        await sendRecovery(email);
        setSent(true);
      } else if (isPasswordChange) {
        if (password.length < 8)
          throw new Error("Use a password with at least 8 characters.");
        await updatePassword(password);
        setSent(true);
        showToast("Password updated. Sign in with your new password.");
      } else if (normalizedMode === "register") {
        if (name.trim().length < 2) throw new Error("Enter your name.");
        if (password.length < 8)
          throw new Error("Use a password with at least 8 characters.");
        await signUp(email, password, name.trim());
        if (!isDemo) {
          setSent(true);
          showToast("Check your email to finish setting up your account.");
        } else {
          showToast("Demo session started.");
          navigate(destination, { replace: true });
        }
      } else {
        await signIn(email, password);
        showToast(isDemo ? "Local demo session started." : "Welcome back.");
        navigate(destination, { replace: true });
      }
    } catch (cause) {
      setFormError(
        cause instanceof Error
          ? cause.message
          : "We could not complete that request. Try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="auth-page">
      <Link className="auth-back" to="/reports">
        <ArrowLeft size={16} /> Back to response queue
      </Link>
      <section className="auth-panel">
        <div className="auth-brand">
          <span className="brand-mark">
            <PawPrint size={20} weight="duotone" />
          </span>
          <span className="brand-wordmark">
            jeev<span>verse</span>
          </span>
        </div>
        <h1 className="h-display">
          {sent
            ? isPasswordChange
              ? "Password updated"
              : isRecoveryRequest
                ? "Check your inbox"
                : "Confirm your account"
            : title}
        </h1>
        <p className="auth-description">
          {sent
            ? isPasswordChange
              ? "Your password is updated. Sign in with the new password to return to the workspace."
              : isRecoveryRequest
                ? "If an account exists for that email, a password reset link is on its way."
                : "We sent a confirmation link to your email. Open it to finish creating your account."
            : subtitle}
        </p>
        {!sent && (
          <form
            className="auth-form"
            onSubmit={(event) => void handleSubmit(event)}
            noValidate
          >
            {normalizedMode === "register" && (
              <div className="field">
                <label className="field__label" htmlFor="auth-name">
                  Full name
                </label>
                <input
                  className="field__control"
                  id="auth-name"
                  autoComplete="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                />
              </div>
            )}
            {(normalizedMode === "login" ||
              normalizedMode === "register" ||
              isRecoveryRequest) && (
              <div className="field">
                <label className="field__label" htmlFor="auth-email">
                  Email address
                </label>
                <input
                  className="field__control"
                  id="auth-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </div>
            )}
            {!isRecoveryRequest && normalizedMode !== "forgot-password" && (
              <div className="field">
                <div className="password-label">
                  <label className="field__label" htmlFor="auth-password">
                    {isPasswordChange ? "New password" : "Password"}
                  </label>
                  {normalizedMode === "login" && (
                    <Link to="/auth/forgot-password">Forgot password?</Link>
                  )}
                </div>
                <div className="password-control">
                  <input
                    className="field__control"
                    id="auth-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete={
                      normalizedMode === "login"
                        ? "current-password"
                        : "new-password"
                    }
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                    onClick={() => setShowPassword((visible) => !visible)}
                  >
                    {showPassword ? <EyeSlash size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {(normalizedMode === "register" || isPasswordChange) && (
                  <small className="field__hint">At least 8 characters.</small>
                )}
              </div>
            )}
            {formError && (
              <p className="field__error auth-error" role="alert">
                {formError}
              </p>
            )}
            <Button variant="primary" type="submit" disabled={busy}>
              {busy
                ? "Please wait…"
                : normalizedMode === "register"
                  ? "Create account"
                  : isPasswordChange
                    ? "Update password"
                    : isRecoveryRequest
                      ? "Send reset link"
                      : "Sign in"}
            </Button>
          </form>
        )}
        {!sent && normalizedMode === "login" && (
          <p className="auth-switch">
            New to the response team?{" "}
            <Link to="/auth/register">Create an account</Link>
          </p>
        )}
        {!sent && normalizedMode === "register" && (
          <p className="auth-switch">
            Already part of the team? <Link to="/auth/login">Sign in</Link>
          </p>
        )}
        {sent && (
          <Link
            className="button button--secondary auth-return"
            to="/auth/login"
          >
            Return to sign in
          </Link>
        )}
        {isDemo && (
          <div className="demo-auth-note">
            <strong>Local demo access</strong>
            <span>
              Use any valid email and a password with at least 6 characters. No
              account is created; changes stay in this browser.
            </span>
          </div>
        )}
      </section>
      <p className="auth-footnote">
        Animal welfare reports stay private to authorized response teams.
      </p>
    </main>
  );
}
