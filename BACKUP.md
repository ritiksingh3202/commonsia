# Commonsia — Database Backups & Disaster Recovery

All user data lives in Postgres on Supabase (`rwuekemvfdpfihurdads`). Redis (Upstash) is
cache-only — no backup needed; it's rebuilt from Postgres on first read.

This doc covers:

1. [Layered strategy](#layered-strategy) — what's protecting you, and against what
2. [One-time setup](#one-time-setup) — secrets + tools you need once
3. [Running an on-demand backup](#running-an-on-demand-backup)
4. [Automated nightly backups](#automated-nightly-backups)
5. [Restoring from a backup](#restoring-from-a-backup)
6. [Disaster-recovery drill](#disaster-recovery-drill) — rehearse before you need it

---

## Layered strategy

| Layer | Scope | Retention | Where it lives |
| --- | --- | --- | --- |
| **1. Supabase native backup** | Whole DB, click-to-restore | Free: 1 day · Pro: 7-day PITR | Supabase dashboard → Database → Backups |
| **2. Nightly off-site dump** | Whole DB, file you control | 90 days (artifact) | GitHub Actions artifacts |
| **3. On-demand local dump** | Whole DB, before migrations | Forever (manual) | Your laptop under `/backups` |

Supabase's own backup is the fastest to restore from. Your off-site GitHub Actions copy is
the insurance policy if Supabase itself has a problem (outage, data loss, billing lockout).
The local script is for "I'm about to do something scary, give me a safety net" moments.

---

## One-time setup

### Install the Postgres client tools (needed only for local scripts)

- **Windows:** download the installer from
  <https://www.enterprisedb.com/downloads/postgres-postgresql-downloads> → choose version 15
  or newer → in the installer, enable **Command Line Tools** (you can skip Server). Add the
  install's `bin` folder (e.g. `C:\Program Files\PostgreSQL\15\bin`) to your `PATH`, then
  reopen PowerShell.
- **macOS:** `brew install libpq && brew link --force libpq`
- **Ubuntu/Debian/WSL:** `sudo apt install postgresql-client-15`

Verify: `pg_dump --version` should print `15.x` or newer.

### Add the GitHub Actions secret (needed for nightly backups)

1. In Supabase dashboard → **Database → Connection string → URI** copy the **Direct
   connection** URL (port `5432`, not the pooler on `6543`).
2. In GitHub → your repo → **Settings → Secrets and variables → Actions → New repository
   secret**:
   - Name: `SUPABASE_DIRECT_URL`
   - Value: the full `postgresql://...:5432/postgres?sslmode=require` string.
3. Go to the **Actions** tab → enable workflows if prompted. The workflow file is
   `.github/workflows/db-backup.yml`.

> ⚠ The **transaction pooler** URL on port `6543` will not work with `pg_dump`. Use the
> direct `:5432` URL. The workflow validates this for you and fails loudly otherwise.

---

## Running an on-demand backup

From the repo root:

```powershell
# Windows
.\scripts\backup-db.ps1
```

```bash
# macOS / Linux / WSL
./scripts/backup-db.sh
```

You'll get a file like `backups/2026-04-21_1430.dump.gz`. It's already gitignored.

---

## Automated nightly backups

Once the `SUPABASE_DIRECT_URL` secret is set, the workflow runs **every night at 02:30 UTC
(08:00 IST)** and whenever you click **Run workflow** from the Actions tab.

Each run:

1. Installs Postgres 15 client tools on a fresh Ubuntu runner.
2. Runs `pg_dump --format=custom --no-owner --no-privileges` against your DB.
3. Gzips the dump.
4. Uploads it as a private workflow artifact named `db-backup-<timestamp>` with 90-day
   retention.

To grab a backup: **Actions** tab → click the run → scroll to the **Artifacts** section →
download the `.dump.gz`.

### Changing the retention or schedule

Edit `.github/workflows/db-backup.yml`:

- `retention-days: 90` — drop to 30 for tighter rotation, raise to max allowed on your plan.
- `cron: "30 2 * * *"` — [crontab.guru](https://crontab.guru/) is helpful for tweaking.

---

## Restoring from a backup

### Safe rehearsal first (strongly recommended)

1. Create a **new, empty Supabase project** (free tier is fine).
2. Copy its **Direct connection** URL.
3. Restore the dump into the empty project:

   ```powershell
   # Windows
   $env:RESTORE_URL = "postgresql://...:5432/postgres?sslmode=require"
   .\scripts\restore-db.ps1 .\backups\2026-04-21_0200.dump.gz
   ```

   ```bash
   # macOS / Linux / WSL
   RESTORE_URL="postgresql://...:5432/postgres?sslmode=require" \
     ./scripts/restore-db.sh ./backups/2026-04-21_0200.dump.gz
   ```

4. Point a local dev build at that rehearsal project (copy the URL into `.env.local`) and
   spot-check: log in as a mentor and as a student, open a profile, send a test message,
   etc.
5. When satisfied, run the same restore against your real production URL.

### Restoring into the real production DB

The script reads `DIRECT_URL` from `.env` when `RESTORE_URL` isn't set, and asks you to
type the hostname to confirm before dropping anything:

```powershell
.\scripts\restore-db.ps1 .\backups\2026-04-21_0200.dump.gz
```

```bash
./scripts/restore-db.sh ./backups/2026-04-21_0200.dump.gz
```

> ⚠ `pg_restore` with `--clean --if-exists` drops every table in the `public` schema before
> recreating. Always confirm you're pointed at the intended project. The script prints the
> target host and blocks until you re-type it.

After the restore, run `npx prisma migrate status` to verify the migration history lines up
with your app code.

### Rolling forward migrations after a restore

If the backup is older than your latest code, the schema may lag behind. Run:

```bash
npx prisma migrate deploy
```

That replays any migrations not already in `_prisma_migrations` against the restored DB.

---

## Disaster-recovery drill

Do this once, and again after any major schema change. It's the only way to confirm your
backups are actually restorable.

1. **Trigger a fresh backup** — Actions tab → `Nightly DB Backup` → **Run workflow**.
2. **Download the artifact.**
3. **Restore into a scratch Supabase project** using `restore-db.(ps1|sh)` with
   `RESTORE_URL` pointed at the scratch project.
4. **Boot the app against the scratch project** (temporarily swap `.env.local`) and verify:
   - Mentor login + dashboard loads
   - Student login + dashboard loads
   - `/mentors` list renders the expected people
   - A direct message thread still shows history
5. **Note how long the whole drill took** — that's your real RTO (Recovery Time Objective).
6. **Delete the scratch project** when done.

If any step fails, fix the gap (usually missing env var, missing `prisma migrate deploy`,
or a secret that needs rotating) and document it here.

---

## What's *not* in these backups

- **Redis cache (Upstash).** It's regenerated from Postgres on first read — safe to lose.
- **Uploaded files in Supabase Storage**, if you start using it later. Right now avatars and
  portfolios are stored as data URLs **inside the Postgres `User` table**, so they're
  included in every dump. If you migrate to Supabase Storage buckets, add a bucket export
  step (Supabase CLI: `supabase storage download`).
- **Secrets (`.env`, `AUTH_SECRET`, OAuth client secrets).** Store those in a password
  manager — they're not in Postgres and can't be recovered from a DB dump.
