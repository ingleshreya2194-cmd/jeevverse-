import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() ?? "";
const supabasePublicKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? "";
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

export const configurationMode =
  validSupabaseUrl && supabasePublicKey.length >= 20
    ? "live"
    : !supabaseUrl && !supabasePublicKey && import.meta.env.DEV
      ? "demo"
      : "invalid";

export const configurationMessage =
  configurationMode === "invalid"
    ? "Supabase configuration is incomplete or invalid. Production builds require both VITE_SUPABASE_URL and the public VITE_SUPABASE_ANON_KEY. Local demo mode is available only in the development server."
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
