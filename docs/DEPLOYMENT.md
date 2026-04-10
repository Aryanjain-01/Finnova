# Deploying Finnova to Production

This is a practical guide to shipping Finnova — a Next.js 16 + React 19 + Prisma + PostgreSQL + NextAuth v5 finance tracker — to a real production environment. It is written for a beginner finishing their first real full-stack project.

Deploying your app is exciting. It is also the moment where "it works on my machine" stops being an acceptable answer. Read this whole doc once before you click any deploy button.

---

## 1. Before you deploy — the reality check

Do not skip this section. A deploy on top of a half-finished app is how people lose a weekend debugging.

Tick each of these off before you touch a hosting dashboard:

- [ ] The app runs locally without errors: `npm run dev`
- [ ] `npm run build` completes cleanly (no TypeScript errors, no build failures)
- [ ] `npm run lint` passes, or any remaining warnings are known and documented
- [ ] You have tested the production build locally: `npm run build && npm start`, then click around
- [ ] All secrets live in environment variables, not in committed source files
- [ ] You have a plan for backing up the database (even if that plan is "my provider backs it up daily")
- [ ] You are genuinely okay with other people seeing and using this app

One more thing: **deploying is not the finish line, it is the starting line of operations.** Once real users are on your app, you are on the hook for monitoring it, updating it, and fixing it when things break. That is a good thing — you will learn more in one week of running a live app than in a month of local dev.

---

## 2. The 3 pieces you need to deploy

Every full-stack deployment needs three moving parts:

1. **App hosting** — somewhere that runs your Node.js server so Next.js can respond to requests.
2. **Database hosting** — somewhere that runs PostgreSQL so Prisma has a place to read and write data.
3. **A domain name** — optional but recommended. Lets you use `finnova.example.com` instead of `finnova-production.up.railway.app`.

You can host (1) and (2) on the same platform (Railway, Render, Fly) or split them (Vercel for the app, Neon for the database). Both patterns are fine. The split pattern is more common today.

A quick visual of the two shapes:

```
Split (Vercel + Neon):                Same platform (Railway):

  [Browser]                             [Browser]
      |                                     |
      v                                     v
  [Vercel: Next.js]                     [Railway: Next.js]
      |                                     |
      v                                     v
  [Neon: Postgres]                      [Railway: Postgres]
```

Finnova doesn't care which shape you pick. The code is the same either way.

---

## 3. `dev` vs `build` vs `start` — what each script does

From `package.json`:

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint",
  "postinstall": "prisma generate"
}
```

What each one actually does:

- **`npm run dev`** — starts the Next.js development server. You get hot module reload, helpful error overlays, source maps, and extra warnings. It is slow, unoptimized, and absolutely not meant for production.
- **`npm run build`** — compiles the entire app into an optimized production bundle under `.next/`. It type-checks the code, runs the lint configuration, bundles every route, generates static pages where it can, and regenerates the Prisma client (via the `postinstall` hook, which runs `prisma generate` automatically after `npm install`).
- **`npm start`** — runs the already-compiled build. It is fast, has no hot reload, and will crash immediately if you haven't run `npm run build` first or if any required env vars are missing.
- **`npm run lint`** — runs ESLint. Non-blocking by default, but a failing lint on CI should stop a deploy.

Rule: **in production, you run `npm run build` once, then `npm start` to serve the result.** You never run `npm run dev` on a production server. It is slower, less secure, and exposes internal error details.

---

## 4. Production environment variables

Finnova reads its config from environment variables. The template lives in `.env.example`:

```bash
# Supabase Cloud project URL + key (publishable/anon key)
NEXT_PUBLIC_SUPABASE_URL="https://ubjgihnxncpeiqsemuzg.supabase.co"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="sb_publishable_REPLACE_ME"

# Supabase Cloud Postgres (direct connection).
DATABASE_URL="postgresql://postgres:DB_PASSWORD@db.ubjgihnxncpeiqsemuzg.supabase.co:5432/postgres?sslmode=require"

# NextAuth / Auth.js — generate with: openssl rand -base64 32
AUTH_SECRET="replace-with-random-string"
AUTH_TRUST_HOST="true"

# Optional: public URL in production
# NEXTAUTH_URL="http://localhost:3000"
```

What each one means in production:

- **`DATABASE_URL`** — must point at your **production** Postgres, not your local Docker instance from `docker-compose.yml`. Use a database user with least privileges (no superuser unless you really need it). If your host requires TLS, include `?sslmode=require` on the end. Supabase, Neon, and most managed hosts require this.
- **`AUTH_SECRET`** — this is the key NextAuth uses to sign session tokens. It **must be different** from your dev secret. Generate a fresh one with:
  ```bash
  openssl rand -base64 32
  ```
  If you lose or change this secret, every user is logged out on their next request, because their JWTs can no longer be verified. Treat it like a password.
- **`AUTH_TRUST_HOST`** — set to `"true"` in production behind any reverse proxy (Vercel, Railway, Render, Caddy, nginx). This tells Auth.js to trust the `Host` header from the proxy. It pairs with `trustHost: true` in `auth.ts`.
- **`NEXTAUTH_URL`** (optional) — if set, it should be the canonical public URL of your deployed app, e.g. `https://finnova.example.com`. Most hosts don't require it because `trustHost: true` is set.
- **`NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`** — only needed if you use Supabase client-side features. For Finnova in its current state, the database URL is what actually matters.
- **`NODE_ENV=production`** — almost every hosting platform sets this automatically. Verify it in your platform's env var panel. `next start` needs it.

**How env vars get onto the server, per platform:**

- **Vercel:** Project Settings → Environment Variables. You can scope them per environment (Production / Preview / Development).
- **Railway:** the Variables tab inside your service. Can reference other services (e.g. `${{Postgres.DATABASE_URL}}`).
- **Render:** Environment → Environment Variables, or a `render.yaml`.
- **Fly.io:** `fly secrets set KEY=value` from the CLI.
- **Docker / VPS:** passed via the shell (`docker run -e`), a `.env` file that lives on the server (never committed), or a systemd unit file.

**Never commit `.env` to git. Not once. Not as a joke. Not "just for a minute."** If you do, rotate every secret in it immediately and force-push is not enough — GitHub caches pushes, assume the secret is public.

---

## 5. Running migrations in production

Prisma migrations are the thing most beginners get wrong on their first deploy. Get this right and you will save yourself hours.

There are two migration commands. Know when to use each.

- **Development:**
  ```bash
  npx prisma migrate dev
  ```
  This creates a new migration from your schema changes and applies it to your local DB. It is interactive and can reset your database. **Never run this in production.**

- **Production:**
  ```bash
  npx prisma migrate deploy
  ```
  This only applies migrations that already exist in `prisma/migrations/`. It never generates new ones. It never prompts. It is safe to run on every deploy.

This separation exists for one reason: **your production database should never be surprised by a schema change you haven't committed and tested locally.** You write the migration at home, commit it, push it, and the server simply replays it.

Where to actually run `prisma migrate deploy`:

- **Vercel:** set the build command to `prisma migrate deploy && next build` in Project Settings → Build & Development Settings. The `postinstall` hook already handles `prisma generate`, so you don't need it here.
- **Railway / Render:** set the build command to something like `npm run build && npx prisma migrate deploy`, or the start command to `npx prisma migrate deploy && npm start`. Pick one, not both.
- **Dockerfile:** run it as part of the container's entrypoint / start command (see the skeleton in Section 8).

About `prisma generate`: you do not need to call it manually. This project's `package.json` has:

```json
"postinstall": "prisma generate"
```

That means the Prisma client is regenerated automatically every time the host runs `npm install`. One less thing to worry about.

**If you forget `prisma migrate deploy`:** your app will boot, but the first query that touches a new table or column will explode with errors like `P2021` (table does not exist in the current database) or a column-mismatch error. Look for these in your logs first when a deploy acts weird.

Finnova's schema (see `prisma/schema.prisma`) has seven models — `User`, `Account`, `Category`, `Transaction`, `Budget`, `SavingsGoal`, `RecurringTransaction`. Every new deploy that touches any of them has to go through this flow. There is no shortcut.

---

## 6. Option A: Deploy to Vercel (easiest for this stack)

Vercel is built by the same company that builds Next.js. Support for the Next.js 16 app router, React Server Components, and middleware is first-class. For a beginner shipping their first Next.js app, this is the path of least resistance.

### Steps

1. Push your repo to GitHub (or GitLab / Bitbucket).
2. Sign up at [vercel.com](https://vercel.com) and connect your GitHub account.
3. Click "Import Project" and pick the Finnova repo. Vercel auto-detects Next.js.
4. Set environment variables in the project settings:
   - `DATABASE_URL`
   - `AUTH_SECRET`
   - `AUTH_TRUST_HOST=true`
   - any Supabase keys you use
5. Override the **Build Command** to:
   ```bash
   prisma migrate deploy && next build
   ```
6. Click Deploy.

### What Vercel gives you for free

- HTTPS with a valid certificate
- A global CDN in front of your static assets
- Automatic deploys on every push to `main`
- Preview deploys on every pull request (a unique URL per PR)
- Per-branch environment variables

### Gotchas

- **Serverless functions have timeouts.** Vercel runs your API routes and server actions as serverless functions. On the free (Hobby) tier, they time out after 10 seconds. On Pro it is 60 seconds. If you add a feature that crunches a lot of data server-side, this will bite you.
- **Vercel does not host your Postgres for you.** You need a managed database elsewhere — Neon, Supabase, Railway Postgres, Render Postgres, etc. — and point `DATABASE_URL` at it.
- **Cold starts.** The first request after a period of idle takes longer while the function spins up. Usually harmless for a personal app.
- **NextAuth v5 behind the Vercel proxy:** `trustHost: true` must be set on the Auth.js config. It already is in `auth.ts`:
  ```ts
  export const { handlers, auth, signIn, signOut } = NextAuth({
    // ...
    trustHost: true,
  });
  ```
  Don't remove it.

---

## 7. Option B: Deploy to Railway / Render (one-click full stack)

Railway and Render are opinionated PaaS providers. They let you run Node.js services and Postgres inside the same project, with the database URL automatically wired up.

### Steps (Railway as the example)

1. Push your repo to GitHub.
2. In Railway, New Project → Deploy from GitHub → pick Finnova.
3. Add a PostgreSQL service to the same project. Railway gives you an internal `DATABASE_URL` (faster and free of egress fees).
4. On the Finnova service, add env vars:
   - `DATABASE_URL` — reference the Postgres service
   - `AUTH_SECRET`
   - `AUTH_TRUST_HOST=true`
5. Set the start command:
   ```bash
   npm run build && npx prisma migrate deploy && npm start
   ```
   (Or split build and start between the build step and the start step. The key is that `migrate deploy` runs before `next start`.)
6. Deploy.

Render is almost identical — create a Web Service and a Postgres database, link them, set the build/start commands, deploy.

### Pros

- Database and app live in the same project. No separate billing, no separate dashboard.
- No cold starts — your app runs as a real long-lived Node process, not a serverless function.
- Simpler mental model for people coming from a single-VPS background.

### Cons

- Preview deploys aren't as polished as Vercel's.
- For very low traffic, the always-on cost can be a bit higher than Vercel + Neon free tier.

---

## 8. Option C: Deploy to a VPS with Docker (most control)

A VPS is a Linux box you rent by the month from DigitalOcean, Linode, Hetzner, AWS EC2, and similar providers. You install what you want, run what you want, and take responsibility for everything: Linux updates, SSL certificates, process supervision, firewall rules, backups.

This is the most flexible option and the most work. **Do not pick this for your first deploy.** Come back to it after you have shipped to Vercel or Railway once and understand the basics.

If you do go this route, the typical shape is:

- Write a `Dockerfile`.
- Build the image locally or on CI, push it to a registry.
- On the VPS, run the image with `docker run` or `docker compose`.
- Put a reverse proxy (Caddy is easiest; nginx is common) in front of it to handle HTTPS and route `finnova.example.com` to the container.
- Point DNS at the VPS's public IP.

### Skeleton Dockerfile (illustrative only)

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/prisma ./prisma
CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]
```

Note: the `docker-compose.yml` at the root of this repo is for local development only — it spins up Postgres for you on `localhost:5432`. It is not a production compose file.

---

## 9. Database hosting options

Pick one of these and point `DATABASE_URL` at it.

- **Neon** — serverless Postgres with a generous free tier. Plays very nicely with Vercel. Good default choice.
- **Supabase** — Postgres with extras bolted on (auth, storage, realtime). Finnova only needs the database half. The `.env.example` in this repo already references a Supabase DB URL as a starting point.
- **Railway Postgres / Render Postgres** — simple and lives inside the same platform as your app. Great if you deployed via Option B.
- **AWS RDS / Google Cloud SQL** — production-grade, more configuration, more cost. Overkill for a first app.
- **Self-hosted on your VPS** — cheapest per GB, most control, you handle backups and upgrades.

Whichever you pick:

- Confirm whether `?sslmode=require` is needed. Most managed hosts require it.
- Use a dedicated database user for the app, not the admin/root user.
- Write the connection string down somewhere safe (a password manager, not a Notes app).

---

## 10. Verifying the deploy

The first deploy is the one you should watch. Don't walk away from the dashboard.

Once the build finishes:

- Open the public URL. An unauthenticated request should redirect to `/login`. This is enforced by `middleware.ts`:
  ```ts
  const protectedPrefixes = ["/dashboard", "/transactions", "/budgets", "/accounts", "/settings"];
  ```
- Register a new user. It should succeed and land you in the dashboard.
- Log out. Log back in. Land on `/dashboard`.
- Create an account, a category, and a transaction. All three should save.
- Open the hosting platform's Logs panel and read the output. Look for Prisma errors, NextAuth errors, or unhandled promise rejections.
- Open DevTools → Network tab. Confirm the session cookie is set with the `Secure` and `HttpOnly` flags when running over HTTPS.

If any of those steps fail, fix them before you tell anyone the app is live.

A tiny post-deploy smoke-test checklist you can copy into a note:

```
[ ] / redirects to /login when logged out
[ ] /register creates a user
[ ] /login signs that user in
[ ] /dashboard renders without errors
[ ] Create an account -> appears in the list
[ ] Create a category -> appears in the list
[ ] Create a transaction -> balance updates
[ ] Log out -> redirected back to /login
[ ] Logs panel shows no red errors
```

Run this every time you deploy. It takes about two minutes and catches 90 percent of broken deploys.

---

## 11. Continuous deployment (CD)

Vercel, Railway, and Render all default to "deploy on every push to `main`." It is convenient. It is also dangerous in exactly the way you would expect: a broken push breaks prod.

A few safer patterns:

- **Deploy from a `release` branch.** Do day-to-day work on `main` (or feature branches). When you're ready to ship, merge `main` into `release`. Only `release` triggers a prod deploy.
- **Require PR approval + passing CI before merging to `main`.** Add GitHub branch protection rules. Even a single review catches a lot.
- **Use preview deploys.** Vercel gives every PR a unique URL. Click around on that URL before you merge.

Whatever you pick, pick *something*. "I push and pray" works until the day it doesn't.

---

## 12. Monitoring and error tracking

At the minimum: check your hosting platform's logs panel after every deploy, and when users say "something is broken."

Better:

- **Sentry** has a free tier that's enough for a personal app. It captures client-side and server-side errors, gives you stack traces, and groups duplicates. Wiring it into a Next.js app takes about 10 minutes.
- Log unhandled rejections explicitly so they show up in your logs instead of dying silently:
  ```ts
  process.on("unhandledRejection", (reason) => {
    console.error("[unhandledRejection]", reason);
  });
  ```
- Track, at minimum: error rate, slow response times, and build failures.

You cannot fix what you can't see. Spend the 10 minutes.

---

## 13. Backups

If you only do one thing from this section, do this: **turn on automatic database backups before going live.**

- Most managed Postgres providers offer daily backups on the free or low-cost tiers. Flip the switch.
- **Test a restore at least once.** An untested backup is not a backup — it is a hope. Spin up a fresh scratch DB, restore into it, confirm your data is there.
- Keep at least 7 days of backups. 30 is better if your provider allows it.
- Store your `DATABASE_URL` and any restore credentials in a password manager, not in a Google Doc, not in a chat message, not in a sticky note on your monitor.

---

## 14. Secrets rotation

Secrets leak. Repos get accidentally set to public. Laptops get stolen. Have a plan.

- **If `AUTH_SECRET` leaks:** generate a new one with `openssl rand -base64 32`, update the env var, redeploy. Every user will be logged out on their next request — that is expected and correct.
- **If `DATABASE_URL` password leaks:** rotate the password in the DB provider's dashboard, update the env var, redeploy. Do it fast.
- **If a Supabase key leaks:** rotate it from the Supabase dashboard.

Write a tiny runbook — even just a text file in your password manager — titled "What to do if X leaks." You will thank yourself.

---

## 15. Updating the app in production

The normal flow:

1. Edit locally.
2. Test locally (`npm run dev`, then `npm run build && npm start` for anything risky).
3. Commit.
4. Push.
5. CI/CD deploys.

For a schema change, the flow is:

1. Edit `prisma/schema.prisma`.
2. Run `npx prisma migrate dev --name describe_your_change` locally. This generates a new folder under `prisma/migrations/`.
3. Verify the migration SQL looks sane.
4. Commit **the schema file and the new migration folder together.**
5. Push.
6. On the server, `npx prisma migrate deploy` runs during build/start and applies the new migration.

**Never edit a committed migration file after it's been applied in production.** If you need to fix something, write a new migration on top. Past migrations are history; you don't rewrite history in a live database.

---

## 16. Rollback

Things will break. Knowing how to roll back is part of the job.

- **Code-only rollback (no schema change):** redeploy the previous commit.
  - Vercel has a one-click "Rollback to this deployment" button in the Deployments tab.
  - Railway and Render have similar buttons.
  - Git-based: `git revert <bad-commit> && git push`. Prefer `revert` over `reset` — it preserves history and doesn't require force-push.
- **Schema rollback:** this is hard. Prisma migrations only go forward. The right move is almost always "fix forward" — write a new migration that corrects the broken one and deploy it. Don't try to edit the old migration. Don't try to manually undo SQL in the prod DB unless you really know what you are doing.

The lesson: test schema changes carefully, because rolling them back is expensive.

---

## 17. Cost expectations for a small hobby app

Realistic numbers for a personal finance tracker with a handful of users:

- **Vercel Hobby tier:** free. Plenty of bandwidth and builds for low traffic.
- **Neon / Supabase free tier:** free. Enough storage and compute for dozens of users.
- **Domain name:** roughly USD 10–15/year.
- **Total:** USD 0–15/year.

When the app grows and you need Pro plans, expect something like USD 20–40/month for paid Vercel plus a paid Postgres instance. Worry about that later.

---

## 18. What NOT to do

A short list of things that will ruin your week:

- Don't commit `.env`.
- Don't run `npm run dev` in production.
- Don't skip `prisma migrate deploy` — your schema will silently drift out of sync with your code.
- Don't share a `DATABASE_URL` between your local dev and production. You will one day run `prisma migrate reset` and wipe real user data.
- Don't force-push to the branch that your hosting platform is deploying from.
- Don't deploy untested schema changes on a Friday at 5pm. This is a cliché because it is true.
- Don't ignore the error logs panel. Check it after every deploy, not just when something is on fire.
- Don't expose the Postgres port of a self-hosted DB to the public internet. Bind it to localhost and reach it over the private network.

---

## 19. Links and further reading

External docs:

- Next.js deployment: https://nextjs.org/docs/app/building-your-application/deploying
- Prisma deployment guide: https://www.prisma.io/docs/guides/deployment
- Auth.js (NextAuth v5) deployment notes: https://authjs.dev/getting-started/deployment

Related docs in this repo:

- [ENV_AND_SETUP.md](./ENV_AND_SETUP.md) — local setup and env variable reference
- [PRISMA_AND_DB.md](./PRISMA_AND_DB.md) — Prisma schema, migrations, and database workflow
- [SECURITY_AND_THREAT_MODEL.md](./SECURITY_AND_THREAT_MODEL.md) — what this app defends against and what it doesn't
- [DEBUGGING_PLAYBOOK.md](./DEBUGGING_PLAYBOOK.md) — common errors and how to fix them

---

Deploy once, watch the logs, break something small, fix it, deploy again. That loop is how you actually learn to run software in production. Good luck.
