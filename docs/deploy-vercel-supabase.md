# Deploy on Vercel with Supabase

The first build creates the tables, locks Supabase's public data API and loads the demo data. Later builds only apply schema changes; they never delete or re-seed data.

## 1. Get two connection strings from Supabase
Supabase dashboard › your project › **Connect** (top bar) › ORMs/Prisma (or "Connection string"):
- **Transaction pooler** (port **6543**) → `DATABASE_URL`, and add `?pgbouncer=true&connection_limit=1` at the end.
- **Session pooler** (port **5432**) → `DIRECT_URL`.

Use the pooler strings, not `db.<ref>.supabase.co`: that direct address is IPv6-only, which Vercel can't reach.
If the password contains special characters, encode them: `@` → `%40`, `#` → `%23`, `/` → `%2F`, `:` → `%3A`.

## 2. Vercel › Project › Settings › Environment Variables
Tick **Production, Preview and Development** for every variable. Deploys from a branch other than `main` are *Preview* deployments and only see variables ticked for Preview.

| Name | Value |
|---|---|
| `DATABASE_URL` | transaction pooler string + `?pgbouncer=true&connection_limit=1` |
| `DIRECT_URL` | session pooler string |
| `DB_SETUP_ON_BUILD` | `true` |
| `ENCRYPTION_KEY` | 64 hex characters (`openssl rand -hex 32`). Keep it forever: losing it makes NIDA/salary/account data unreadable. |
| `SESSION_SECRET` | 48+ random characters (`openssl rand -base64 48`) |
| `APP_URL` | your site address, e.g. `https://mruk-skywood.vercel.app` |
| `STORAGE_ADAPTER` | `supabase` |
| `SUPABASE_URL` | `https://<project-ref>.supabase.co` |
| `SUPABASE_SECRET_KEY` | the `sb_secret_…` key (server only) |
| `DEMO_MODE` | `true` while testing (enables the mini app demo sign-in); remove for launch |
| `SEED_STAFF_PASSWORD` | the first password for staff accounts |

Do **not** add the publishable key: the app never needs it in the browser.

## 3. Deploy
Redeploy. In the build log look for `[db:deploy] … Seed complete` (first time) or `Data already present` (later).

## 4. After it works
- Rotate the database password and the secret key in Supabase if they were ever shared in chat or email, then update the two connection strings and `SUPABASE_SECRET_KEY` in Vercel.
- Change the staff passwords at first sign-in.
- Before real customers: set `DEMO_MODE` to false and confirm the data-location question with Azania Bank (see README).
