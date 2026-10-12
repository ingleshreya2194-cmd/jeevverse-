# JeevVerse

JeevVerse is an animal-welfare reporting workspace for rescue teams. It supports report intake, triage, caregiver assignment, field care updates, and a separately verified outcome. The frontend is a React/Vite/TypeScript application served on Render by a small Node.js HTTP server; production data and authentication use Supabase.

See [`frontend/README.md`](./frontend/README.md) for local setup, Render Web Service settings, required environment variables, Supabase migration and RLS setup, release checks, troubleshooting, and custom-domain instructions.

Key production configuration: Render Node.js Web Service with root directory `frontend`, build command `npm ci && npm run build`, and start command `npm run start`. The built frontend is served from `dist` by a minimal Node server. Supply only the public `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` values in Render's environment settings; never use the Supabase service-role key in the frontend.
"# jeevverse-" 
