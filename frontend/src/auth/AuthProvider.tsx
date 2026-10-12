import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";
import { AuthContext, type WorkspaceUser } from "./AuthContext";
import { isDemoMode, supabase } from "../lib/supabase";
import type { UserRole } from "../types/domain";

const DEMO_SESSION_KEY = "jeevverse-demo-session";

function getDemoUser(): WorkspaceUser | null {
  try {
    const email = localStorage.getItem(DEMO_SESSION_KEY);
    return email ? { id: "demo-user", email, role: "coordinator" } : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<WorkspaceUser | null>(() =>
    isDemoMode ? getDemoUser() : null,
  );
  const [isReady, setReady] = useState(isDemoMode || !supabase);

  const applySession = useCallback(async (supabaseUser: User | null) => {
    if (!supabaseUser) {
      setUser(null);
      return;
    }
    let role: UserRole = "reporter";
    if (supabase) {
      const { data } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", supabaseUser.id)
        .maybeSingle();
      if (
        data?.role &&
        ["reporter", "caregiver", "coordinator", "admin"].includes(data.role)
      )
        role = data.role as UserRole;
    }
    setUser({ id: supabaseUser.id, email: supabaseUser.email, role });
  }, []);

  useEffect(() => {
    if (isDemoMode) return;
    if (!supabase) return;

    let active = true;
    void supabase.auth
      .getSession()
      .then(async ({ data, error }) => {
        if (!active) return;
        if (!error) await applySession(data.session?.user ?? null);
        setReady(true);
      })
      .catch(() => {
        if (active) setReady(true);
      });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      queueMicrotask(() => {
        if (!active) return;
        void applySession(session?.user ?? null).finally(() => {
          if (active) setReady(true);
        });
      });
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [applySession]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      if (isDemoMode) {
        if (!email.includes("@") || password.length < 6)
          throw new Error(
            "Enter a valid email and a password with at least 6 characters.",
          );
        localStorage.setItem(DEMO_SESSION_KEY, email.trim());
        setUser({ id: "demo-user", email: email.trim(), role: "coordinator" });
        return;
      }
      if (!supabase)
        throw new Error(
          "Supabase is not configured. Add both public Supabase values to use live sign-in.",
        );
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      const { data } = await supabase.auth.getUser();
      await applySession(data.user);
    },
    [applySession],
  );

  const signUp = useCallback(
    async (email: string, password: string, name: string) => {
      if (isDemoMode) {
        await signIn(email, password);
        return;
      }
      if (!supabase) throw new Error("Supabase is not configured.");
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { display_name: name } },
      });
      if (error) throw error;
    },
    [signIn],
  );

  const signOut = useCallback(async () => {
    if (isDemoMode) {
      localStorage.removeItem(DEMO_SESSION_KEY);
      setUser(null);
      return;
    }
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setUser(null);
  }, []);

  const sendRecovery = useCallback(async (email: string) => {
    if (isDemoMode) return;
    if (!supabase) throw new Error("Supabase is not configured.");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/recovery`,
    });
    if (error) throw error;
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    if (!supabase)
      throw new Error(
        "Password reset is available only with live Supabase authentication.",
      );
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) throw signOutError;
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      isReady,
      isDemo: isDemoMode,
      signIn,
      signUp,
      signOut,
      sendRecovery,
      updatePassword,
    }),
    [user, isReady, signIn, signUp, signOut, sendRecovery, updatePassword],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
