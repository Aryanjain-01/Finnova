# Start Here — Beginner Roadmap

Welcome. This is probably the biggest codebase you've touched so far, and that is completely fine. You do **not** need to understand everything to start contributing. You just need a map.

This file is your map.

---

## What you are building

**Finnova** is a full-stack personal finance tracker. A logged-in user can:

- Create **accounts** (Cash, Bank, Card, Other)
- Create **categories** (Food, Salary, Transport, ...)
- Record **transactions** (Income, Expense, Transfer between accounts)
- Set monthly **budgets** per category
- Track **savings goals**
- Schedule **recurring transactions** (rent, salary, subscriptions)
- See a **dashboard** with charts, insights, and summaries

It is built with:

| Layer | Tech |
|---|---|
| UI | Next.js 16 (App Router) + React 19 + TypeScript |
| Styling | Tailwind CSS v4 |
| Backend | Next.js Route Handlers (`app/api/*`) |
| DB | PostgreSQL via Prisma ORM |
| Auth | NextAuth v5 (Credentials + JWT sessions) |
| Validation | Zod |
| Charts | Recharts |

---

## Read the docs in this order

Each doc builds on the one before it. Don't skip ahead — you'll just be confused faster.

### Stage 1 — Get set up and understand the vocabulary

1. **[ENV_AND_SETUP.md](ENV_AND_SETUP.md)** — zero to running app. Every env var, every command, every first-time gotcha. Do this first or nothing else matters.
2. **[ABSOLUTE_BASICS.md](ABSOLUTE_BASICS.md)** — the vocabulary before the vocabulary. What `.ts` means, what "routing" / "API" / "auth" / "validation" / "data layer" actually are, what HTTP verbs are, what a JWT is. **Come back here anytime another doc uses a word you don't know.**
3. **[GLOSSARY.md](GLOSSARY.md)** — A-Z quick lookup of every term in the project. Use this with Ctrl+F.

### Stage 2 — Language and framework basics

4. **[TYPESCRIPT_ESSENTIALS.md](TYPESCRIPT_ESSENTIALS.md)** — enough TypeScript to read and write code in this project. Types, unions, generics, discriminated unions, narrowing.
5. **[REACT_BASICS_FOR_THIS_PROJECT.md](REACT_BASICS_FOR_THIS_PROJECT.md)** — components, props, state, hooks, JSX. Every concept is tied to a real file in this repo so it doesn't stay abstract.
6. **[TAILWIND_AND_STYLING.md](TAILWIND_AND_STYLING.md)** — how styling works here: Tailwind v4, CSS variables, dark mode, custom animations.

### Stage 3 — How this app is built

7. **[HOW_IT_WORKS.md](HOW_IT_WORKS.md)** — the six layers of the app (UI → API → DB → Auth → Validation → Styling) at a high level.
8. **[CODEBASE_EXPLAINED.md](CODEBASE_EXPLAINED.md)** — deeper tour: what lives in each folder, what each major file does, and how they connect.
9. **[PRISMA_AND_DB.md](PRISMA_AND_DB.md)** — the database layer in depth: schema DSL, queries, migrations, Prisma Studio, the ownership invariant.
10. **[REQUEST_FLOW.md](REQUEST_FLOW.md)** — step-by-step trace of real requests (e.g. "Add a transaction") from button click all the way to the database and back.
11. **[EDGE_CASES_AND_RULES.md](EDGE_CASES_AND_RULES.md)** — every business rule the app enforces, with the exact file and line where it happens. This is what stops the app from being buggy.
12. **[SECURITY_AND_THREAT_MODEL.md](SECURITY_AND_THREAT_MODEL.md)** — what attacks this design prevents and how. Internalizes WHY the validation and `userId`-scoping discipline exists.

### Stage 4 — Doing the work

13. **[GIT_FOR_FIRST_PROJECT.md](GIT_FOR_FIRST_PROJECT.md)** — Git from scratch, written for someone who has never used it on a real project before.
14. **[ADDING_A_FEATURE_WALKTHROUGH.md](ADDING_A_FEATURE_WALKTHROUGH.md)** — a full worked example of adding a feature across every layer: schema → migration → Zod → API → React.
15. **[DEBUGGING_PLAYBOOK.md](DEBUGGING_PLAYBOOK.md)** — symptom-to-fix tables for every bug you're likely to hit. Come back here every time something breaks.
16. **[DEPLOYMENT.md](DEPLOYMENT.md)** — when you're ready to put it on the internet. Vercel, Railway, VPS, migrations in prod, secrets, rollback.

### Stage 5 — Reference

17. **[BEGINNER_GUIDE.md](BEGINNER_GUIDE.md)** — a shorter "everything in one place" cheat sheet. Good to come back to.
18. **[FINANCE_TRACKER_GUIDE.md](FINANCE_TRACKER_GUIDE.md)** — project overview / README-style intro.

You don't have to finish a doc in one sitting. Read until your head feels full, then open the code and poke around.

---

## Project map (memorize this)

```
Finnova/
├── app/
│   ├── (app)/           ← logged-in pages (dashboard, transactions, budgets, ...)
│   ├── (auth)/          ← login + register pages
│   ├── api/             ← backend API endpoints (one folder per resource)
│   ├── layout.tsx       ← root HTML shell
│   └── globals.css      ← Tailwind base + CSS variables (theme colors)
│
├── components/
│   ├── ui/              ← small reusable UI atoms (Button, Card, Modal, ...)
│   └── *.tsx            ← feature panels (TransactionsPanel, AccountsPanel, ...)
│
├── lib/
│   ├── prisma.ts        ← the one Prisma client instance
│   ├── api.ts           ← requireUserId() helper
│   ├── validations.ts   ← Zod schemas — the gatekeeper for all input
│   ├── finance.ts       ← money math (totals, trends, balances)
│   ├── insights.ts      ← auto-generated dashboard tips
│   └── recurrence.ts    ← recurring-transaction date math
│
├── prisma/
│   ├── schema.prisma    ← database tables + relations
│   ├── migrations/      ← history of schema changes
│   └── seed.ts          ← sample data for dev
│
├── auth.ts              ← NextAuth configuration
├── middleware.ts        ← global route guard (redirects logged-out users)
└── docs/                ← you are here
```

The two parentheses folders, `(app)` and `(auth)`, are a Next.js feature called **route groups**. The parentheses make the folder name invisible in the URL — so `app/(app)/dashboard/page.tsx` serves `/dashboard`, not `/(app)/dashboard`. Route groups exist only to share a layout (`(app)/layout.tsx` wraps everything in `AppShell`; `(auth)/layout.tsx` is a simpler shell).

---

## Your first 30 minutes

1. `npm install`
2. Copy `.env.example` to `.env` and fill in `DATABASE_URL` and `AUTH_SECRET`.
3. `npx prisma migrate dev` (creates the DB tables)
4. `npx prisma db seed` (optional: loads sample data)
5. `npm run dev`
6. Open `http://localhost:3000` → register an account → click around.
7. Open `app/(app)/dashboard/page.tsx` in your editor. Change the word "Hello" to "Hi" on line 136. Save. Watch it hot-reload in the browser.

That last step is the most important one. You just edited code in a real Next.js app. Everything else is variations on that.

---

## Golden beginner rules

1. **Make small changes.** One thing at a time.
2. **Check after every change.** Don't stack three changes and then debug all three at once.
3. **Read errors slowly.** The error almost always tells you the file, the line, and what it expected. Believe it.
4. **One feature = one branch.** See [GIT_FOR_FIRST_PROJECT.md](GIT_FOR_FIRST_PROJECT.md).
5. **When stuck, trace the data.** Start at the button the user clicks, follow the fetch, follow the API route, follow the Prisma call. [REQUEST_FLOW.md](REQUEST_FLOW.md) shows you how.
6. **Don't memorize — bookmark.** You'll forget the syntax. That's fine. Know where to look it up.

---

## Starter tasks (pick one)

These are small, safe, and teach you the shape of the codebase:

- **UI only** — change a label or a color in `components/transactions-panel.tsx`.
- **Validation** — add a `max(500)` to the `notes` field in `lib/validations.ts` (it's already 2000, try tightening it to see the error surface in the UI).
- **Read-only field** — add a new column to the transactions table showing the tag count. No backend work needed, just parsing `tags` in the panel.
- **API tweak** — change the default page size from 20 to 25 in `app/api/transactions/route.ts`.
- **Schema change** — add a `description` field to `SavingsGoal` in `prisma/schema.prisma`, run `npx prisma migrate dev --name goal_description`, then surface it in `components/goals-panel.tsx`. This touches every layer — do this one when you're ready.

Good luck. You're closer than you think.
