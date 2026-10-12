# JeevVerse

JeevVerse is an animal-welfare reporting workspace for rescue teams. Its Render Node.js Web Service defaults to browser-local demo mode and does not require Supabase. Demo reports stay in the current browser and are not sent to a rescue team; shared live data is an optional Supabase mode.

See [`frontend/README.md`](./frontend/README.md) for local setup, Render Web Service settings, demo-mode limitations, and optional Supabase configuration.

Render configuration: Runtime Node, root directory `frontend`, build command `npm ci && npm run build`, start command `npm run start`. Demo mode requires no Supabase environment variables.
