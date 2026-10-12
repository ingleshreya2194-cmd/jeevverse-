# JeevVerse

JeevVerse is an animal-welfare reporting workspace for rescue teams. It supports report intake, triage, caregiver assignment, field care updates, and a separately verified outcome. The frontend is a static React/Vite/TypeScript application; production data and auth use Supabase. No Node backend service is required.

See [`frontend/README.md`](./frontend/README.md) for local setup, the full **Deploy JeevVerse on Render** guide, required environment variables, Supabase migration and RLS setup, release checks, troubleshooting, and custom-domain instructions.

Key production configuration: Render Static Site with root directory `frontend`, build command `npm ci && npm run build`, publish directory `dist`, and the rewrite `/*` → `/index.html`. Supply only the public `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` values in Render's environment settings; never use the Supabase service-role key in the frontend.
"# jeevverse-" 
