#!/usr/bin/env bash
# One-time setup: Supabase schema + keys, then Vercel project + first deploy.
# Run from the project folder:  bash scripts/setup.sh
set -euo pipefail

REF="xjwwmqcawttdbnizxmeu"
REPO="https://github.com/tomas10k/sobremesa-dinners"
cd "$(dirname "$0")/.."

step() { printf '\n\033[1m%s\033[0m\n' "$1"; }

step "1/6  Supabase login (a browser tab opens; approve it)"
supabase projects list >/dev/null 2>&1 || supabase login

step "2/6  Link this folder to the Supabase project"
read -r -s -p "Database password (the one you set when creating the project): " SUPABASE_DB_PASSWORD
echo
export SUPABASE_DB_PASSWORD
supabase link --project-ref "$REF" --password "$SUPABASE_DB_PASSWORD"

step "3/6  Create the tables and access rules"
supabase db push --password "$SUPABASE_DB_PASSWORD" --yes

step "4/6  Write .env.local with the project keys"
supabase projects api-keys --project-ref "$REF" --reveal -o json > .supabase-keys.tmp
node - "$REF" <<'EOF'
const fs = require("fs");
const ref = process.argv[2];
const keys = JSON.parse(fs.readFileSync(".supabase-keys.tmp", "utf8"));
const list = Array.isArray(keys) ? keys : keys.keys ?? [];
const pick = (type, legacyName) =>
  (list.find((k) => k.type === type) ?? list.find((k) => k.name === legacyName))?.api_key;
const publishable = pick("publishable", "anon");
const secret = pick("secret", "service_role");
if (!publishable || !secret) {
  console.error("Could not find both keys. Create a secret key in Supabase → Settings → API Keys and rerun.");
  process.exit(1);
}
fs.writeFileSync(
  ".env.local",
  `NEXT_PUBLIC_SUPABASE_URL=https://${ref}.supabase.co\n` +
    `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${publishable}\n` +
    `SUPABASE_SECRET_KEY=${secret}\n`,
  { mode: 0o600 },
);
console.log("Wrote .env.local (not committed to git).");
EOF
rm -f .supabase-keys.tmp

step "5/6  Vercel login, project and environment variables"
vercel whoami >/dev/null 2>&1 || vercel login
vercel link --yes --project sobremesa-dinners
vercel git connect "$REPO" --yes || echo "(Git already connected, or connect it in Vercel → Settings → Git)"
set -a; . ./.env.local; set +a
for env in production preview development; do
  for name in NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY SUPABASE_SECRET_KEY; do
    vercel env rm "$name" "$env" --yes >/dev/null 2>&1 || true
    printf '%s' "${!name}" | vercel env add "$name" "$env" >/dev/null && echo "  $name → $env"
  done
done

step "6/6  Deploy to production"
vercel deploy --prod --yes

printf '\n\033[1mDone.\033[0m Copy the Production URL above and send it to Claude.\n'
