# Finnova: Environment and Setup Guide

This is the "from zero to running app" guide. Follow it top to bottom the first time. If something breaks, jump to the Troubleshooting table near the end.

Finnova is a Next.js 16 app with Prisma + PostgreSQL and Auth.js (NextAuth v5) for login. You do not need to understand all of that yet. You just need the app running on `http://localhost:3000`.

---

## 1. Prerequisites

Install these first. You only do this once per machine.

| Tool | Version | Why |
|---|---|---|
| Node.js | 20 or higher | Runs Next.js and the build tools |
| npm | comes with Node | Installs packages |
| Git | any recent | Clones the repo |
| Docker Desktop | any recent | Easiest way to run PostgreSQL locally |
| PostgreSQL 16 | optional | Only if you do not want Docker |

Check what you have:

```bash
node -v
npm -v
git --version
docker --version
```

If `node -v` prints something below `v20`, upgrade Node before continuing.

---

## 2. Clone the Repo

```bash
git clone <your-repo-url> Finnova
cd Finnova
```

If you already have the folder, just `cd` into it.

---

## 3. Install Dependencies

```bash
npm install
```

This reads `package.json` and downloads everything. Because `package.json` has a `postinstall` script (`prisma generate`), Prisma will also generate its client types automatically at the end of install.

Key dependencies being installed:

- `next` 16.1.7 (framework)
- `react` 19.2.3
- `@prisma/client` + `prisma` (database)
- `next-auth` v5 beta + `@auth/prisma-adapter` (login)
- `bcryptjs` (password hashing)
- `zod` (input validation)
- `recharts` (dashboard charts)
- `tailwindcss` v4 (styling)

---

## 4. Create Your `.env` File

Copy the example file:

```bash
cp .env.example .env
```

On Windows without a Unix shell, use:

```bash
copy .env.example .env
```

Now open `.env` in your editor. Here is every variable from `.env.example` and what to do with each.

### Environment variables

| Variable | What it is | Example value | Notes |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL. Only needed if you use Supabase Cloud instead of local Postgres. | `https://xxxx.supabase.co` | Leave the example value if you are running Postgres locally via Docker. It is unused in local-only mode. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable (anon) key | `sb_publishable_...` | Same as above. Only matters for Supabase Cloud. |
| `DATABASE_URL` | Postgres connection string used by Prisma (`prisma/schema.prisma` reads it via `env("DATABASE_URL")`) | `postgresql://postgres:postgres@localhost:5432/finance_tracker` | For local Docker setup, use the value above. For Supabase, replace `DB_PASSWORD` with the real password. |
| `AUTH_SECRET` | Secret used by Auth.js to sign JWT sessions. Read in `auth.ts`. | `<32 random bytes base64>` | Must be set or login will crash. Generate it, do not invent one. Never commit it. |
| `AUTH_TRUST_HOST` | Tells Auth.js to trust the current host header in dev | `true` | Keep `"true"` for local dev. |
| `NEXTAUTH_URL` | Public URL in production | `http://localhost:3000` | Commented out in `.env.example`. You do not need it for local dev. |

### Local Docker DATABASE_URL (copy this)

If you are going to use Docker (recommended for beginners), overwrite `DATABASE_URL` in your `.env` with:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/finance_tracker"
```

That matches `docker-compose.yml`:

- user: `postgres`
- password: `postgres`
- database: `finance_tracker`
- port: `5432`

### Warnings

- `.env` is in `.gitignore`. Never commit it. Never paste real secrets into chat or issues.
- `NEXT_PUBLIC_` variables are shipped to the browser. Do not put secrets in any variable that starts with `NEXT_PUBLIC_`.
- `AUTH_SECRET` must be truly random. Do not use "mysecret", "123456", or anything you typed by hand.

---

## 5. Generate `AUTH_SECRET`

Pick one of these. Run it in a terminal, copy the output, paste it into `.env` as the value of `AUTH_SECRET`.

### macOS / Linux / Git Bash / WSL

```bash
openssl rand -base64 32
```

### Windows without openssl (use Node, which you already have)

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Windows PowerShell alternative

```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Max 256 } | ForEach-Object { [byte]$_ }))
```

Paste the result into `.env`:

```env
AUTH_SECRET="paste-the-generated-string-here"
```

---

## 6. Start PostgreSQL

### Option A: Docker (recommended)

From the repo root:

```bash
docker compose up -d
```

This reads `docker-compose.yml` and starts a `postgres:16-alpine` container in the background, with data persisted in a Docker volume called `finance_tracker_pg`. The container exposes port `5432` on your machine.

Check it is running:

```bash
docker compose ps
```

Stop it when you are done for the day:

```bash
docker compose down
```

Your data stays in the volume, so next time you `docker compose up -d` everything is still there.

### Option B: Local Postgres install

If you installed Postgres yourself instead of using Docker:

1. Make sure the service is running.
2. Create a database: `createdb finance_tracker`
3. Set `DATABASE_URL` in `.env` to match your user, password, host, port, and database name.

---

## 7. Run the First Migration

This creates all the tables defined in `prisma/schema.prisma` (User, Account, Category, Transaction, Budget, SavingsGoal, RecurringTransaction).

```bash
npx prisma migrate dev
```

If it is the very first time, Prisma may ask for a migration name. Type something like `init` and press Enter.

### Optional: run the seed

```bash
npx prisma db seed
```

The seed script (`prisma/seed.ts`) is intentionally minimal. It just counts users and prints a message telling you to register via `/register` in the app. It does not create a demo user for you. Running it is safe but optional.

---

## 8. Start the Dev Server

```bash
npm run dev
```

Open `http://localhost:3000` in your browser.

---

## 9. What Happens on First Run

- The app boots and Next.js compiles on demand.
- Middleware protects the dashboard. Visiting `/` redirects you to `/login`.
- You do not have an account yet. Click the register link and create one at `/register`. Your password is hashed with `bcryptjs` and stored in the `User.passwordHash` column.
- After registering, log in. You should land on the dashboard.
- The dashboard is empty. Create an Account (like "Cash" or "Bank"), add a Category, then add a Transaction. Charts start appearing once there is data.

---

## 10. Verify Your Setup Works

Tick these off in order. If any fail, go to Troubleshooting.

- [ ] `docker compose ps` shows the `db` service as running (or your local Postgres is up).
- [ ] `npm run dev` prints `Ready` and a URL without errors.
- [ ] Visiting `http://localhost:3000` redirects you to `/login`.
- [ ] `/register` loads and you can create a new account.
- [ ] After login, the dashboard loads (even if empty).
- [ ] You can create an Account, a Category, and a Transaction without server errors.
- [ ] `npx prisma studio` opens a DB browser and shows your user row in the `User` table.

---

## 11. Troubleshooting

Format: symptom on the left, fix on the right.

| Symptom | Fix |
|---|---|
| Prisma error `P1001: Can't reach database server` | Postgres is not running. Run `docker compose up -d`. If using local Postgres, start the service. |
| Terminal says `Environment variable not found: DATABASE_URL` | You have no `.env` file or it does not contain `DATABASE_URL`. Run `cp .env.example .env` and edit it. |
| `AUTH_SECRET is not defined` or login throws a server 500 on submit | `AUTH_SECRET` is missing from `.env`. Generate one (see section 5) and restart `npm run dev`. |
| Login fails with error code `database_unavailable` | Defined in `auth.ts` as `DatabaseUnavailableError`. It means Prisma got `P1001`/`P1000`. Start Postgres. |
| `Error: listen EADDRINUSE: address already in use :::5432` | Another Postgres is already using 5432. Either stop the other one, or change the host port in `docker-compose.yml` (e.g. `"5433:5432"`) and update `DATABASE_URL` to use `:5433`. |
| `Error: listen EADDRINUSE: address already in use :::3000` | Another Next.js dev server is running. Kill it, or run `npm run dev -- -p 3001`. |
| TypeScript errors about missing Prisma types, or `@prisma/client did not initialize yet` | Prisma client is out of sync. Run `npx prisma generate`. |
| `P2021: The table 'public.User' does not exist` | Migrations have not been applied to this database. Run `npx prisma migrate dev`. |
| You know the password is right but login says "invalid credentials" | Reset it. Run `npx prisma studio`, open the `User` table, delete your user, and register again. Or update `passwordHash` manually with a new bcrypt hash. |
| `next-auth` warns `UntrustedHost` | Set `AUTH_TRUST_HOST="true"` in `.env`. |
| `cp` not recognized on Windows | Use `copy .env.example .env` in cmd/PowerShell, or switch to Git Bash. |
| Port 5432 or 3000 still reported busy after closing the terminal | Processes can linger. On Windows: `netstat -ano \| findstr :3000` then `taskkill /PID <pid> /F`. |
| `npm install` fails on `bcryptjs` or native modules | Delete `node_modules` and `package-lock.json`, then run `npm install` again. |

---

## 12. Reset Everything and Start Over

Sometimes the cleanest fix is a wipe. This deletes all local data.

```bash
docker compose down -v
```

The `-v` flag also removes the `finance_tracker_pg` volume, so the database is gone. Then:

```bash
docker compose up -d
npx prisma migrate dev
npx prisma db seed
npm run dev
```

You are back at a clean slate. You will need to register a new user again.

If you are using local Postgres instead of Docker, drop and recreate the database:

```bash
dropdb finance_tracker
createdb finance_tracker
npx prisma migrate dev
```

---

## 13. Windows-Specific Gotchas

- Prefer Git Bash or WSL for running commands. Most docs in this repo assume a Unix-style shell.
- Use forward slashes `/` in paths inside code and config files, even on Windows. Backslashes in JSON or `.env` strings will break things.
- Docker Desktop must be running before `docker compose up -d` will work. Check the system tray.
- If you see `CRLF will be replaced by LF` warnings from Git, that is fine. Do not panic.
- PowerShell does not have `cp`, `openssl`, or `cat` by default. Use the Windows/Node alternatives above.
- Antivirus tools sometimes quarantine files inside `node_modules`. If `npm install` keeps failing in the same file, check your AV quarantine.

---

## 14. Useful Commands Cheat Sheet

```bash
# install deps (also runs prisma generate)
npm install

# start / stop postgres
docker compose up -d
docker compose down

# prisma
npx prisma migrate dev       # apply schema changes in dev
npx prisma generate          # rebuild the prisma client types
npx prisma studio            # visual DB browser at localhost:5555
npx prisma db seed           # run prisma/seed.ts

# next.js
npm run dev                  # dev server
npm run build                # production build
npm start                    # run the production build
npm run lint                 # eslint
```

---

## 15. Where to Go Next

- `docs/ABSOLUTE_BASICS.md` — vocabulary: what a framework, database, migration, and env var actually are.
- `docs/GIT_FOR_FIRST_PROJECT.md` — git basics (clone, commit, branch, push) for your first real project.
- `docs/DEBUGGING_PLAYBOOK.md` — what to do when things break, step by step.

You now have the app running locally. Go build something.
