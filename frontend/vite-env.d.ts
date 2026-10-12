/// <reference types="vite/client" />
/// <reference types="vite-plugin-svgr/client" />

interface ImportMetaEnv {
  readonly VITE_WORKSPACE_MODE?: "demo" | "supabase";
}
