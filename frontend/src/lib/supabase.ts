import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() ?? "";
const supabasePublicKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? "";
const requestedWorkspaceMode =
  import.meta.env.VITE_WORKSPACE_MODE?.trim().toLowerCase() || "demo";
let validSupabaseUrl = false;
try {
  const parsed = new URL(supabaseUrl);
  validSupabaseUrl =
    parsed.protocol === "https:" ||
    (parsed.protocol === "http:" &&
      ["localhost", "127.0.0.1"].includes(parsed.hostname));
} catch {
  validSupabaseUrl = false;
}

const hasValidSupabaseConfig = validSupabaseUrl && supabasePublicKey.length >= 20;

export const configurationMode =
  requestedWorkspaceMode === "demo"
    ? "demo"
    : requestedWorkspaceMode === "supabase" && hasValidSupabaseConfig
      ? "live"
      : "invalid";

export const configurationMessage =
  configurationMode === "demo"
    ? "Reports and changes are saved in this browser only. They are not sent to a response team."
    : configurationMode === "invalid"
      ? requestedWorkspaceMode === "supabase"
        ? "Supabase mode requires a valid VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY."
        : 'Set VITE_WORKSPACE_MODE to "demo" or "supabase".'
      : null;

export const supabase =
  configurationMode === "live"
    ? createClient(supabaseUrl, supabasePublicKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      })
    : null;

export const isDemoMode = configurationMode === "demo";
