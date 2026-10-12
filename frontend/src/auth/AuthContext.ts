import { createContext } from "react";
import type { User } from "@supabase/supabase-js";
import type { UserRole } from "../types/domain";

export type WorkspaceUser = Pick<User, "id" | "email"> & { role: UserRole };
export interface AuthValue {
  user: WorkspaceUser | null;
  isReady: boolean;
  isDemo: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
  sendRecovery: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
}

export const AuthContext = createContext<AuthValue | null>(null);
