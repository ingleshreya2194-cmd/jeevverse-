import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useState, type ReactNode } from "react";
import {
  ChartBar,
  List,
  ListChecks,
  PawPrint,
  Plus,
  SignOut,
  Users,
  X,
} from "@phosphor-icons/react";
import { useAuth } from "../../auth/useAuth";
import { useToast } from "../ui/useToast";

const links = [
  { to: "/reports", label: "Reports", icon: ListChecks },
  { to: "/impact", label: "Impact", icon: ChartBar },
  { to: "/caregivers", label: "Caregivers", icon: Users },
];

export function AppShell({ children }: { children: ReactNode }) {
  const [navOpen, setNavOpen] = useState(false);
  const { user, signOut, isDemo } = useAuth();
  const { showToast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const title = location.pathname.startsWith("/impact")
    ? "Impact"
    : location.pathname.startsWith("/caregivers")
      ? "Caregivers"
      : location.pathname.startsWith("/reports/new")
        ? "Submit report"
        : location.pathname.startsWith("/reports/")
          ? "Case details"
          : "Reports";

  const handleSignOut = async () => {
    try {
      await signOut();
      showToast("You have signed out.");
      navigate("/auth/login");
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Could not sign out.",
        "error",
      );
    }
  };

  return (
    <div className="app-shell">
      <aside
        className={`sidebar ${navOpen ? "sidebar--open" : ""}`}
        aria-label="Main navigation"
      >
        <div className="brand-lockup">
          <span className="brand-mark">
            <PawPrint size={19} weight="duotone" />
          </span>
          <span className="brand-wordmark">
            jeev<span>verse</span>
          </span>
          <button
            className="sidebar-close icon-button"
            onClick={() => setNavOpen(false)}
            aria-label="Close navigation"
          >
            <X size={20} />
          </button>
        </div>
        <div className="workspace-label">Response workspace</div>
        <nav className="side-nav" aria-label="Workspace">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/reports"}
              className={({ isActive }) =>
                `side-link ${isActive ? "side-link--active" : ""}`
              }
              onClick={() => setNavOpen(false)}
            >
              <Icon size={19} weight="regular" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <NavLink
          to="/reports/new"
          className="sidebar-create"
          onClick={() => setNavOpen(false)}
        >
          <Plus size={18} weight="bold" />
          <span>Submit a report</span>
        </NavLink>
        <div className="sidebar-bottom">
          <div className="service-area">
            <span className="service-area__pin" aria-hidden="true" />
            <div>
              <small>Service area</small>
              <strong>
                {isDemo ? "Pune, Maharashtra (demo)" : "Not configured"}
              </strong>
            </div>
          </div>
          <div className="sidebar-footer">
            <div className="user-mark" aria-hidden="true">
              {user?.email?.slice(0, 1).toUpperCase() ?? "JV"}
            </div>
            <div className="user-data">
              <strong>{user?.email ?? "Demo workspace"}</strong>
              <span>{isDemo ? "Local demo" : "Team member"}</span>
            </div>
            {user ? (
              <button
                className="icon-button signout-button"
                onClick={handleSignOut}
                aria-label="Sign out"
              >
                <SignOut size={17} />
              </button>
            ) : (
              <NavLink className="signin-link" to="/auth/login">
                Sign in
              </NavLink>
            )}
          </div>
        </div>
      </aside>
      {navOpen && (
        <button
          className="sidebar-scrim"
          onClick={() => setNavOpen(false)}
          aria-label="Close navigation"
        />
      )}
      <main className="main-area">
        <header className="topbar">
          <button
            className="mobile-menu icon-button"
            onClick={() => setNavOpen(true)}
            aria-label="Open navigation"
          >
            <List size={21} />
          </button>
          <div className="topbar__title">
            <span className="topbar__breadcrumb">
              JeevVerse <span>/</span> {title}
            </span>
            <span className="mobile-brand">JeevVerse response</span>
          </div>
          <div className="topbar__actions">
            {isDemo && (
              <span className="mode-label">
                <span /> Local demo data
              </span>
            )}
            <NavLink
              to="/reports/new"
              className="button button--primary topbar-submit"
            >
              <Plus size={16} weight="bold" /> New report
            </NavLink>
          </div>
        </header>
        <div className="page-content">{children}</div>
      </main>
    </div>
  );
}
