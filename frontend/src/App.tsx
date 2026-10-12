import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { AppShell } from "./components/layout/AppShell";
import { useAuth } from "./auth/useAuth";
import { configurationMessage, configurationMode } from "./lib/supabase";
import { ReportsPage, CaseDetailPage } from "./features/reports/ReportsPage";
import { SubmitReportPage } from "./features/submit-report/SubmitReportPage";
import { ImpactPage } from "./features/impact/ImpactPage";
import { CaregiversPage } from "./features/caregivers/CaregiversPage";
import { AuthPage } from "./features/auth/AuthPage";
import { EmptyState } from "./components/ui/Primitives";

function ProtectedPage({ children }: { children: ReactNode }) {
  const { user, isReady, isDemo } = useAuth();
  const location = useLocation();
  if (!isReady)
    return (
      <div className="auth-loading">
        <span className="loader" aria-label="Loading session" />
      </div>
    );
  if (!isDemo && !user)
    return <Navigate to="/auth/login" replace state={{ from: location }} />;
  return <AppShell>{children}</AppShell>;
}

function ConfigurationNotice() {
  if (configurationMode === "live" || !configurationMessage) return null;
  return (
    <div
      className={`configuration-notice ${configurationMode === "invalid" ? "configuration-notice--error" : ""}`}
      role={configurationMode === "invalid" ? "alert" : "status"}
    >
      <span className="configuration-notice__dot" />
      <div>
        <strong>
          {configurationMode === "demo"
            ? "Browser-local demo mode"
            : "Workspace mode setup required"}
        </strong>
        <p>
          {configurationMode === "demo"
            ? "Demo reports stay in this browser only and are not sent to a response team. Examples are fictional; photos are not uploaded."
            : configurationMessage}
        </p>
      </div>
    </div>
  );
}

function NotFoundPage() {
  return (
    <AppShell>
      <EmptyState
        title="Page not found"
        detail="The page you are looking for is not available."
        action={
          <a className="button button--secondary" href="/reports">
            Return to reports
          </a>
        }
      />
    </AppShell>
  );
}

export default function App() {
  return (
    <>
      <ConfigurationNotice />
      <Routes>
        <Route path="/auth/:mode" element={<AuthPage />} />
        <Route path="/" element={<Navigate to="/reports" replace />} />
        <Route
          path="/reports"
          element={
            <ProtectedPage>
              <ReportsPage />
            </ProtectedPage>
          }
        />
        <Route
          path="/reports/new"
          element={
            <ProtectedPage>
              <SubmitReportPage />
            </ProtectedPage>
          }
        />
        <Route
          path="/reports/:id"
          element={
            <ProtectedPage>
              <CaseDetailPage />
            </ProtectedPage>
          }
        />
        <Route
          path="/impact"
          element={
            <ProtectedPage>
              <ImpactPage />
            </ProtectedPage>
          }
        />
        <Route
          path="/caregivers"
          element={
            <ProtectedPage>
              <CaregiversPage />
            </ProtectedPage>
          }
        />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  );
}
