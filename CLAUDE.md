@AGENTS.md

# Sobremesa Dinners

- Design is final: keep the A24 / linen / open-book look in `src/app/globals.css`. One ink color (`--ink`), Archivo wide, type scale `--t-head` / `--t-body` / `--t-meta`. `prototype/index.html` is the original static mockup.
- All copy lives in `src/lib/i18n.ts` (Spanish first, English must have the same keys).
- Public writes only go through `src/app/api/*` route handlers: validate with `src/lib/schemas.ts`, then insert with `serviceClient()`. Never expose `SUPABASE_SECRET_KEY` to client code.
- Schema changes are new files in `supabase/migrations/`; keep RLS enabled on every table.
- Before committing: `npm run lint && npm run typecheck && npm test && npm run build`.
- Two people work on this repo (see `CONTRIBUTING.md`): never commit to `main`. Work on a branch named `<name>/<change>`, push it, and open a pull request with `gh pr create`.
