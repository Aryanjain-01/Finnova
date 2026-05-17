# Finnova — Project Overview

A full-stack personal finance tracker built with Next.js 16, React 19, Prisma, and PostgreSQL.

---

## What it does

Finnova lets a single user track their personal finances:

- **Accounts** — cash, bank, card, other
- **Categories** — income or expense labels
- **Transactions** — income, expense, or transfer between accounts
- **Budgets** — monthly spending limits per category
- **Savings Goals** — target + progress tracking
- **Recurring Transactions** — rent, salary, subscriptions that run on a schedule
- **Dashboard** — totals, charts, category breakdowns, monthly trends, auto-generated insights, savings rate, and net worth

---

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 16 (App Router) | Server + client components in one project, great DX |
| UI | React 19 + TypeScript | Type safety end-to-end |
| Styling | Tailwind CSS v4 | Utility classes, dark mode via CSS variables |
| Backend | Next.js Route Handlers | No separate backend service needed |
| DB | PostgreSQL | Solid relational store for financial data |
| ORM | Prisma 6 | Type-safe queries generated from schema |
| Auth | NextAuth v5 (Credentials) | Email/password with bcrypt + JWT sessions |
| Validation | Zod | One schema for input validation + TypeScript types |
| Charts | Recharts | Composable React charts |

---

## Prerequisites

- **Node.js** 20 or newer
- **PostgreSQL** 14+ running locally (or via `docker compose up -d`)
- **npm** (bundled with Node.js)

---

## Getting started

```bash
# 1. Install dependencies
npm install

# 2. Copy the env template and fill in values
cp .env.example .env
# Edit .env and set DATABASE_URL and AUTH_SECRET

# 3. Create the database tables
npx prisma migrate dev

# 4. (Optional) Seed sample data
npx prisma db seed

# 5. Start the dev server
npm run dev
```

Open `http://localhost:3000`. You'll be redirected to `/login`. Register a user, then log in.

### Environment variables

The essentials (see `.env.example` for the full list):

```
DATABASE_URL="postgresql://user:password@localhost:5432/finnova"
AUTH_SECRET="<generate with: openssl rand -base64 32>"
```

### Using Docker for Postgres

```bash
docker compose up -d          # starts Postgres on localhost:5432
```

The `docker-compose.yml` at the repo root has the config. Stop with `docker compose down`.

---

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start Next.js in dev mode with hot reload |
| `npm run build` | Production build |
| `npm start` | Run the production build |
| `npm run lint` | Run ESLint |
| `npx prisma migrate dev` | Apply pending migrations + regenerate Prisma client |
| `npx prisma studio` | Open a GUI to browse the DB |
| `npx prisma db seed` | Run `prisma/seed.ts` to populate sample data |

---

## Where things live (short version)

```
app/(app)/         → protected pages (dashboard, transactions, ...)
app/(auth)/        → login + register
app/api/           → backend endpoints
components/        → React components
components/ui/     → small reusable atoms
lib/               → shared logic (Prisma, auth, validation, math)
prisma/            → schema + migrations
auth.ts            → NextAuth config
middleware.ts      → route guard
```

See [CODEBASE_EXPLAINED.md](CODEBASE_EXPLAINED.md) for the full tour.

---

## Documentation

If you're new to the project (or new to web dev in general), read these in order:

1. **[START_HERE.md](START_HERE.md)** — the roadmap
2. **[REACT_BASICS_FOR_THIS_PROJECT.md](REACT_BASICS_FOR_THIS_PROJECT.md)** — React concepts with real examples from this repo
3. **[HOW_IT_WORKS.md](HOW_IT_WORKS.md)** — the six layers of the app
4. **[CODEBASE_EXPLAINED.md](CODEBASE_EXPLAINED.md)** — file-by-file tour
5. **[REQUEST_FLOW.md](REQUEST_FLOW.md)** — three real request flows traced step by step
6. **[EDGE_CASES_AND_RULES.md](EDGE_CASES_AND_RULES.md)** — every business rule and where it's enforced
7. **[GIT_FOR_FIRST_PROJECT.md](GIT_FOR_FIRST_PROJECT.md)** — Git from scratch
8. **[BEGINNER_GUIDE.md](BEGINNER_GUIDE.md)** — one-page cheat sheet

---

## Architectural principles

A few ideas the code lives by. Follow them when you contribute.

### 1. The server is the source of truth

The client is a convenience. Every validation rule, ownership check, and business constraint is enforced **server-side** precisely because a malicious user can write their own client.

### 2. Every query is scoped by `userId`

Look at any Prisma call in `app/api/*`. It includes `userId: r.userId` in the `where` clause. This is the single most important security invariant in the app. Breaking it would let User A see (or modify) User B's data.

### 3. Validation lives in one place

All Zod schemas live in `lib/validations.ts`. If you need to validate something, add it there — don't sprinkle one-off checks into routes.

### 4. Business math lives in `lib/finance.ts`

Pure functions that take a `userId` and return data. No HTTP, no session, no UI. This lets the dashboard page, API routes, and insights all share the same calculations.

### 5. Server components fetch, client components interact

Pages in `app/(app)/*/page.tsx` are server components by default. They fetch data via Prisma directly. They hand off to client components (marked `"use client"`) only for the interactive bits — modals, filters, forms.

### 6. Money is `Decimal(14, 2)`, never `Float`

Floats lose precision. Decimals don't. The Prisma schema enforces this at the DB level.

### 7. Defense in depth on auth

Authentication is checked in **three** places:
- `middleware.ts` — global page guard
- Server pages — `await auth()` as a second check
- API routes — `requireUserId()` at the top of every handler

Each layer catches what the others miss.

---

## Contributing

1. Create a feature branch: `git switch -c feat/my-thing`
2. Make your changes, commit often with clear messages
3. Run `npm run lint` and `npm run dev` to make sure nothing broke
4. Push and open a PR against `main`

See [GIT_FOR_FIRST_PROJECT.md](GIT_FOR_FIRST_PROJECT.md) for the full Git workflow.

---

## License

Private project. Not yet open-sourced.
