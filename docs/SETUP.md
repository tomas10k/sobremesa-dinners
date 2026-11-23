# Setup and operations

Everything needed to run, deploy and maintain the site. For what the project is, see the [README](../README.md). For how the two of us work on branches, see [CONTRIBUTING.md](../CONTRIBUTING.md).

## Run it locally

```bash
npm install
bash scripts/setup.sh        # first time only: links Supabase, writes .env.local, sets up Vercel
npm run dev                  # http://localhost:3000
```

Without `.env.local` the site still renders with placeholder events; the forms answer `503` until Supabase is connected.

## Environment variables

See [`.env.example`](../.env.example). Local values go in `.env.local` (ignored by git); production values go in Vercel → Settings → Environment Variables.

| Variable | Where it can live | What it does |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Browser + server | The project address |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Browser + server | Acts as the `anon` role, so row-level security applies: it can read published events and only the columns the site shows |
| `SUPABASE_SECRET_KEY` | **Server only** | Bypasses row-level security. Used only in `src/app/api/*` after input is validated. Never prefix it with `NEXT_PUBLIC_` |
| `RESEND_API_KEY` | Server only | Sends guest emails. Without it, the admin can preview emails but not send them |
| `EMAIL_FROM` | Server only | The sender, on the verified `sobremesadinners.com` domain |
| `CRON_SECRET` | Server only | Vercel sends it to `/api/cron/reminders`; also salts the hashed IPs used for rate limiting |
| `NEXT_PUBLIC_SITE_URL` | Browser + server | Base for links inside emails. Defaults to the live domain |

If a key leaks: rotate it (Supabase → Settings → API, or Resend), update Vercel, redeploy.

## Database

The schema lives in [`supabase/migrations`](../supabase/migrations). Schema changes are always new migration files. Apply them with the Supabase CLI:

```bash
supabase login
supabase link --project-ref <your-project-ref>
supabase db push
```

## Access policy

- **Visitors** read published events (upcoming or past) through the publishable key, limited to safe columns. Venue, sponsor and notes are not readable. Speaker names on dinner pages come from a security-definer function that only returns speakers who agreed to be shown.
- **Public forms** never write to the database from the browser. Each form posts JSON to a route handler that rate-limits it, validates it with the zod schemas in [`src/lib/schemas.ts`](../src/lib/schemas.ts) (types, lengths, allowed values, LinkedIn URLs, the 200-word limit, a honeypot field) and only then inserts with the secret key. Fields like `status` and `notes` are never accepted from the client.
- **Guest links** (`/invitacion/<code>`, `/confirmar/<code>`, `/feedback/<code>`) use unguessable 16-character codes, looked up only on the server.
- **Admins** sign in with Google. Only addresses in the `admins` table pass `is_admin()`, which every table's RLS policy checks; any other signed-in account sees nothing. Photo buckets are writable by admins only.
- The student essay limit is enforced three times: in the textarea, in the API, and as a `check` constraint in Postgres.

## Tests and checks

```bash
npm run lint && npm run typecheck && npm test && npm run build
```

GitHub Actions runs all four on every push and pull request ([`.github/workflows/ci.yml`](../.github/workflows/ci.yml)).

## Deploy and roll back

- Vercel builds every push. `main` goes to production; pull requests get preview URLs.
- The morning reminder runs from [`vercel.json`](../vercel.json) every day at 16:00 UTC (8am Pacific standard time).
- If a deploy breaks something: Vercel → Deployments → pick the last good one → **Promote to Production**. A failed build never replaces the live version.

## Production checklist

| | |
|---|---|
| Health check | `GET /api/health` returns `200 {"ok":true}` when the app can reach the database |
| Alert | A free uptime monitor (e.g. UptimeRobot) on `/api/health`, emailing both owners |
| Rollback | Promote the previous deployment in Vercel |
| Likely failure | Supabase free projects pause after ~7 days with no traffic; forms then fail with 500/503. The uptime ping keeps it awake; otherwise restore it from the Supabase dashboard |
