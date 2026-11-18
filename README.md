# Sobremesa Dinners

Small dinners to connect the Latino way: 3 speakers, 7–12 MBA students, one table in San Francisco or Berkeley. This repo is the public site (Spanish by default, English toggle) and the forms that feed the planning database.

**Live:** https://sobremesa-dinners.vercel.app · **Health:** https://sobremesa-dinners.vercel.app/api/health

**Stack:** Next.js 16 (App Router) · Supabase Postgres · Vercel. Owners: Tomás Diez Canedo and Daniela Olavarrieta. How we work together: [CONTRIBUTING.md](CONTRIBUTING.md).

## Pages

| Route | What it is |
|---|---|
| `/` | Home: hero, definition, events, who we are |
| `/speaker` | Speaker sign-up: profile, availability, open dinners, referrals, extras |
| `/estudiante` | Student application with a hard 200-word essay. `/estudiante?cena=1` preselects dinner No. 1 (use it for invite QR codes) |
| `/proponer` | Propose speakers, topics or both, as many as you like |
| `/api/health` | Health check: `200 {"ok":true}` when the app can reach the database |

## Run it locally

```bash
npm install
bash scripts/setup.sh        # first time only: links Supabase, writes .env.local, sets up Vercel
npm run dev                  # http://localhost:3000
```

Without `.env.local` the site still renders with placeholder events; the forms answer `503` until Supabase is connected.

## Database

The schema lives in [`supabase/migrations`](supabase/migrations). Apply it with the Supabase CLI:

```bash
supabase login
supabase link --project-ref <your-project-ref>
supabase db push
```

## Keys: publishable vs secret

| Variable | Where it can live | What it can do |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Browser + server | Just the project address |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Browser + server | Acts as the `anon` role, so row-level security applies: it can only read published events (and only the columns the site shows) |
| `SUPABASE_SECRET_KEY` | **Server only** | Bypasses row-level security. Used only inside `src/app/api/*` after input is validated. Never prefix it with `NEXT_PUBLIC_` |

Local values go in `.env.local` (ignored by git). Production values go in Vercel → Settings → Environment Variables, with separate values for Preview and Production. If a key leaks: rotate it in Supabase → Settings → API, update Vercel, redeploy.

## Access policy

- **Visitors** can read published events (`status` upcoming or past) through the publishable key, limited to safe columns. The venue, sponsor and notes columns are not readable.
- **Form submissions** never touch the database from the browser. Each form posts JSON to a route handler that validates it with the zod schemas in [`src/lib/schemas.ts`](src/lib/schemas.ts) (types, lengths, allowed values, LinkedIn URLs, the 200-word limit, a honeypot field) and only then inserts with the secret key. Fields like `status` and `notes` are not accepted from the client.
- **Admins** are the emails in the `admins` table. Every table has an RLS policy that lets only `is_admin()` users read or change rows; any other signed-in account sees nothing. This is what the admin dashboard (next phase) will use.
- The student essay limit is enforced three times: in the textarea (typing or pasting past 200 words is cut), in the API, and as a `check` constraint in Postgres.

## Tests

```bash
npm test          # unit tests: word limit + every validation rule
npm run lint
npm run typecheck
```

GitHub Actions runs all of these plus `npm run build` on every push and pull request (`.github/workflows/ci.yml`).

## Deploy and roll back

- Vercel builds every push. `main` goes to production; pull requests get preview URLs.
- If a deploy breaks something: Vercel → Deployments → pick the last good one → **Promote to Production**.
- A failed build never replaces the live version.

## Production checklist

| | |
|---|---|
| Owner | Tomás (diezcanedot@gmail.com), Daniela (dolavarrietag@gmail.com) |
| Health check | `GET /api/health` |
| Alert | Point a free uptime monitor (e.g. UptimeRobot) at `/api/health`, emailing both owners |
| Rollback | Promote previous deployment in Vercel |
| Likely failure | Supabase free projects pause after ~7 days with no traffic; forms then fail with 500/503. The uptime ping keeps it awake; otherwise restore it from the Supabase dashboard |
| Backups | Supabase free tier keeps daily backups for 7 days; export tables to CSV before big changes |
