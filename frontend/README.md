# JeevVerse

JeevVerse is an animal-welfare reporting workspace built with React, Vite, TypeScript, and vanilla CSS. It runs on Render as a Node.js Web Service.

## Data modes

| Mode | Set `VITE_WORKSPACE_MODE` to | Data behavior |
| --- | --- | --- |
| Browser-local demo (default) | `demo` (or leave unset) | No Supabase connection. Demo records and changes stay in this browser's local storage; they are not sent to a response team or shared across devices. |
| Shared live data (optional) | `supabase` | Requires both Supabase public values, an initialized database, and configured authentication. |

Demo records are fictional. Demo sign-in is simulated and is not an access-control boundary. In demo mode, selected images are only previewed in the current page; they are not uploaded or shared. Do not use demo mode for real incident reports.

## Local setup

Requirements: Node.js 20.19+ or 22.12+, npm 10+, and Git.

```powershell
cd frontend
npm ci
Copy-Item .env.example .env.local
npm run dev
```

The example environment file selects browser-local demo mode. You can also leave `VITE_WORKSPACE_MODE` unset; demo mode is the default in development and production.

Checks:

```powershell
npm run typecheck
npm run lint
npm run build
```

## Environment variables

| Name | Required for | Value |
| --- | --- | --- |
| `VITE_WORKSPACE_MODE` | Optional; defaults to browser-local demo | `demo` or `supabase` |
| `VITE_SUPABASE_URL` | Optional live mode only | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Optional live mode only | Supabase publishable/anon public key |

Vite embeds every `VITE_` value in browser JavaScript. The Supabase URL and publishable key are public client configuration—not secrets. Never put a Supabase service-role key, database password, or other private credential in a `VITE_` variable.

## Deploy on Render without Supabase

Create a **Web Service** connected to this GitHub repository and set:

- **Runtime:** Node
- **Branch:** `main` (or the branch connected to the service)
- **Root Directory:** `frontend`
- **Build Command:** `npm ci && npm run build`
- **Start Command:** `npm run start`
- **Environment:** `VITE_WORKSPACE_MODE=demo`

No Supabase variables, database, Python, Gunicorn, or publish directory are required for this mode. `PORT` is provided by Render. The included [`render.yaml`](../render.yaml) declares the same Web Service defaults.

After pushing changes to the branch connected to Render, use **Manual Deploy → Deploy latest commit** if the service does not deploy automatically. The built React app is served from `dist` by [`server.mjs`](./server.mjs), which also returns the app shell for client-side routes.

## Optional: enable shared Supabase data

Only use this if reports need to be shared with an authenticated response team. Set `VITE_WORKSPACE_MODE=supabase` and provide both `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Render, then deploy again. The database schema, RLS policies, private image bucket, and RPCs must also be applied to that same Supabase project; otherwise report submissions can fail. Review and apply [`supabase/migrations/20261011000000_initial_schema.sql`](../supabase/migrations/20261011000000_initial_schema.sql) before switching modes. Never expose the service-role key.

## Troubleshooting

- **`npm run start` says “Missing script”:** confirm Root Directory is `frontend` and that Render is deploying a commit containing `frontend/package.json` with the `start` script.
- **Report submission in demo mode:** the case is stored in this browser's local storage only. It does not reach a real response team, and image files are not uploaded.
- **Supabase report submission fails:** confirm `VITE_WORKSPACE_MODE=supabase`, both public values point to the same project, and the schema/RLS migration has been applied there.
- **Blank page or missing assets:** confirm Root Directory is `frontend`, run `npm run build`, and use `npm run start`. Keep Vite's base path at `/` for the default Render domain/custom root domain.
- **Nested route refresh gives a 404:** confirm the Web Service is running `npm run start`; `server.mjs` falls back to `dist/index.html` for client-side routes.

## Redeploy and custom domain

Every push to the linked deploy branch triggers a Render Web Service build and deploy. Check the build and runtime logs, then open the service URL. To use a custom domain, add it in Render's **Settings → Custom Domains**, configure the DNS records Render provides, and wait for TLS to activate.

## Data and security notes

- Browser-local demo changes are kept in that browser's local storage. They are not synchronized to other browsers or devices.
- All sample cases, locations, outcomes, and caregivers are fictional and must not be treated as real incident reports.
- Demo sign-in only simulates a coordinator and is not a security boundary. Do not store real or sensitive report data in demo mode.
- For shared live data, use Supabase mode with the reviewed RLS migration. Evidence storage is private in Supabase mode.
