# Codebase Explained — The File-by-File Tour

This doc is a guided walk through the repo. Every section points at a real file and tells you what it does, why it exists, and what to look for when you open it.

If you haven't read [HOW_IT_WORKS.md](HOW_IT_WORKS.md) yet, read that first for the big picture.

---

## Repo overview

```
Finnova/
├── app/                    ← Next.js App Router — pages, layouts, API routes
├── components/             ← React components (UI + feature panels)
├── lib/                    ← Shared logic: validations, auth helpers, business math
├── prisma/                 ← Database schema, migrations, seed script
├── public/                 ← Static files (images, favicon)
├── types/                  ← Ambient TypeScript declarations
├── auth.ts                 ← NextAuth v5 configuration
├── middleware.ts           ← Edge middleware that guards protected routes
├── next.config.ts          ← Next.js config
├── tsconfig.json           ← TypeScript config
├── eslint.config.mjs       ← Lint rules
├── package.json            ← Dependencies + scripts
├── docker-compose.yml      ← Local Postgres for dev
├── .env.example            ← Template for your local .env
└── docs/                   ← This folder
```

---

## `app/` — the Next.js app router

### `app/layout.tsx` — the root HTML shell

Every single page is wrapped in this file. It defines `<html>`, `<body>`, the global font, the theme provider, and the toast container. When you want something to be *truly* global (a provider, a portal root), this is where it goes.

### `app/page.tsx` — the landing page at `/`

In practice this is never seen — `middleware.ts` redirects `/` to `/dashboard` or `/login` depending on auth state.

### `app/globals.css`

Tailwind base import + CSS custom properties (CSS variables) that define the theme colors, shadows, and animations used by Tailwind classes like `bg-surface`, `text-foreground`, `border-border`, `gradient-text`, `shadow-[var(--shadow-glow)]`.

### `app/(auth)/` — login and register

- `layout.tsx` — a slim wrapper for auth pages (centered card, no sidebar).
- `login/page.tsx` — login form, submits to NextAuth.
- `register/page.tsx` — register form, posts to `/api/user/register` (or similar).

### `app/(app)/` — the protected app

- `layout.tsx` — one line:
  ```tsx
  export default function AppLayout({ children }: { children: React.ReactNode }) {
    return <AppShell>{children}</AppShell>;
  }
  ```
  Everything under `(app)` gets wrapped in `<AppShell>` which provides the sidebar, topbar, and command palette.

- `dashboard/page.tsx` — the dashboard. **Server component.** Loads totals, breakdown, trends, goals, and balances in parallel with `Promise.all`, then renders cards and charts. Month/year filters via URL query params. This file is the best example in the repo of a server page that does real work.

- `transactions/page.tsx` — thin wrapper that renders `<TransactionsPanel currency={...} />`. The real work is in the client component.

- Same pattern for `accounts`, `budgets`, `goals`, `recurring`, `settings` — each is a thin page that hands off to its panel component.

### `app/api/` — the backend

One folder per resource. Each folder has a `route.ts` for the collection endpoints (`GET /api/<resource>`, `POST /api/<resource>`) and optionally a `[id]/route.ts` for single-item endpoints (`GET|PUT|DELETE /api/<resource>/:id`).

| Folder | What it handles |
|---|---|
| `accounts/` | List/create/update/archive accounts |
| `categories/` | List/create/update categories |
| `transactions/` | List with filters+pagination, create, update, delete, CSV export (`export/route.ts`) |
| `budgets/` | Upsert budgets; `summary/route.ts` returns spend-vs-limit per budget |
| `goals/` | List/create/update savings goals, including contributing to them |
| `recurring/` | CRUD recurring templates |
| `dashboard/` | Alternative JSON endpoint for dashboard data (used if the panel fetches client-side) |
| `insights/` | Returns generated insights |
| `user/` | Register, change password, update profile |
| `auth/[...nextauth]/` | NextAuth's own handlers (login POST, session GET, etc.) |

**The canonical example to study** is `app/api/transactions/route.ts`. It has both a list endpoint (with filters, pagination, date range) and a create endpoint with full validation, ownership checks, and cross-field business rules. If you understand that file, you understand every other route in this repo.

---

## `components/` — UI

### `components/ui/` — atoms

Small, reusable, **unopinionated** building blocks. Most of them accept `className`, `children`, and a few variant props, and forward everything else to the underlying element.

| File | What it is |
|---|---|
| `button.tsx` | Button with variants (primary, ghost, danger, etc.) |
| `card.tsx` | The framed panel used all over the dashboard |
| `modal.tsx` | Dialog / modal for add-edit forms |
| `badge.tsx` | Small pill for status/type labels |
| `skeleton.tsx` | Shimmering placeholder while data loads |
| `toast.tsx` | Non-blocking notification toasts |
| `page-header.tsx` | The title + description + action row at the top of each page |
| `stat-tile.tsx` | The big number + delta tiles on the dashboard |
| `progress.tsx` | Progress bar (used for budgets and goals) |
| `animated-number.tsx` | Count-up animation for numeric values |
| `icons.tsx` | SVG icon components used throughout |

**None of these touch the database or the session.** They are pure presentation.

### `components/*.tsx` — feature panels

Each of these is a client component (`"use client"`) that owns one feature page's interactive behavior.

| File | Notes |
|---|---|
| `app-shell.tsx` | The sidebar + topbar + main content frame. Listens for the global `finnova:quick-add` custom event and dispatches it when you click the quick-add button. Hosts the command palette. |
| `providers.tsx` | Wraps the app in the theme provider and any other context providers. |
| `theme-provider.tsx` | Dark/light mode context (reads/writes to `localStorage`, sets a `data-theme` attribute on `<html>`). |
| `transactions-panel.tsx` | **The big one.** Filters, table, pagination, add/edit modal with inline account/category creation, CSV export button, delete flow. Good read to understand client-side patterns in this app. |
| `accounts-panel.tsx` | Account CRUD, archiving. |
| `budgets-panel.tsx` | Budget CRUD + the spend-vs-limit progress bars. |
| `goals-panel.tsx` | Savings goal CRUD + contribute flow. |
| `recurring-panel.tsx` | Recurring transaction CRUD + next-run preview. |
| `settings-panel.tsx` | Profile update, password change, currency preference. |
| `dashboard-charts.tsx` | Recharts wrappers: `TrendsArea`, `NetWorthBar`, `CategoryDonut`. Receives pre-shaped data from the server page. |
| `command-palette.tsx` | `Ctrl/⌘ + K` overlay for fast navigation and quick actions. |

### Pattern you'll see in every panel

```tsx
"use client";

export function SomePanel({ currency }: { currency: string }) {
  // 1) State for data, loading, filters, modal
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // 2) useCallback'd loader that hits the API
  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/something", { credentials: "include" });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) return;
    setItems(data.items ?? data);
  }, [/* filter deps */]);

  // 3) useEffect to call loader
  useEffect(() => { void load(); }, [load]);

  // 4) Handlers for create/update/delete that call the API, then re-load
  // 5) Render: loading skeleton OR empty state OR list + modal
}
```

Learn that shape once; it applies to every feature panel.

---

## `lib/` — shared logic

### `lib/prisma.ts`

The one Prisma client in the app. Uses a `globalThis` trick to survive Next.js hot reloads without spinning up extra DB connections.

### `lib/api.ts`

`requireUserId()`. Call this at the top of every protected API handler:

```ts
const r = await requireUserId();
if ("response" in r) return r.response;   // 401 Unauthorized
// now use r.userId in your Prisma where clauses
```

The return shape is a discriminated union so TypeScript forces you to check before using `userId`. Clean.

### `lib/validations.ts`

Every Zod schema lives here. See [EDGE_CASES_AND_RULES.md](EDGE_CASES_AND_RULES.md) for the exhaustive list. Highlights:

- `transactionCreateSchema` uses `.superRefine()` to enforce transfer-specific rules across fields.
- Amounts are `z.coerce.number().positive().max(1e12)` — the `coerce` bit is useful because HTML form fields hand you strings.
- `budgetUpsertSchema` clamps `year` to 2000–2100 and `month` to 1–12, preventing calendar nonsense.

### `lib/finance.ts`

All pure money math. No HTTP, no sessions. Just Prisma queries and arithmetic.

| Function | What it computes |
|---|---|
| `monthBounds(year, month)` | UTC start/end `Date` objects for a given calendar month |
| `computeAccountBalances(userId)` | Iterates the user's transactions and produces a per-account balance map |
| `periodTotals(userId, start, end)` | Sum of income and expense in a date range |
| `categoryBreakdown(userId, start, end)` | Per-category expense totals for a period |
| `monthlyTrends(userId, monthsBack, refDate)` | Income/expense per month for the last N months |
| `formatMoney(amount, currency)` | `Intl.NumberFormat` wrapper |

Notice how **none of these take a request or a session**. They take a `userId` and return data. That's what makes them reusable across pages, API routes, and `lib/insights.ts`.

### `lib/insights.ts`

Generates the auto-insights shown on the dashboard ("You spent 30% more on Food this month", etc.). Uses `lib/finance.ts` under the hood.

### `lib/recurrence.ts`

Given a `frequency` and a `startDate`, computes the next run date. Used by `RecurringTransaction` so the UI can show "next: April 15".

### `lib/register-defaults.ts`

Seeds a brand-new user with sensible default categories (Food, Transport, Salary, ...) and maybe a default account. Called from the register flow.

---

## `prisma/`

### `prisma/schema.prisma`

The source of truth for the database. Seven models and three enums. See [HOW_IT_WORKS.md § 6](HOW_IT_WORKS.md) for the model overview.

Key things to notice when you open this file:

- `onDelete: Cascade` on user-owned relations — delete a user, delete their data.
- `onDelete: SetNull` on `Transaction.categoryId` and `Transaction.toAccountId` — deleting a category or account preserves history.
- `@@unique([userId, categoryId, year, month])` on `Budget` — you can't have two budgets for the same category in the same month.
- `Decimal @db.Decimal(14, 2)` for money — **never use `Float` for money**. Decimal preserves precision; float gives you rounding errors.

### `prisma/migrations/`

Each subfolder is one migration: a SQL file + a `migration.lock`. Commit these. Never edit them after they've been applied.

### `prisma/seed.ts`

Populates the DB with sample users, accounts, categories, and transactions for local dev. Run with `npx prisma db seed`.

---

## Top-level files

### `auth.ts`

NextAuth v5 configuration. Credentials provider, bcrypt password compare, JWT session strategy, 30-day session lifetime, `signIn` page override to `/login`. Also has a custom `DatabaseUnavailableError` class that detects Prisma connection errors and surfaces a friendly "database down" message instead of letting Auth.js wrap them as a generic `CallbackRouteError`.

### `middleware.ts`

The route guard. Runs on every page request (not API). Redirects:

- Unauthenticated user hitting a protected path → `/login?callbackUrl=<original>`
- Authenticated user hitting `/login` or `/register` → `/dashboard`
- `/` (logged in) → `/dashboard`
- `/` (logged out) → `/login`

The `matcher` at the bottom excludes API routes and static assets — so the middleware stays fast.

### `next.config.ts`

Mostly stock Next.js config.

### `docker-compose.yml`

Runs a local Postgres instance for development. Start it with `docker compose up -d`.

### `.env.example`

Template for your own `.env`. You need at least `DATABASE_URL` and `AUTH_SECRET`.

---

## How a feature fits together (worked example)

Say you want to trace the **Budgets** feature end-to-end. Open these files in order:

1. `prisma/schema.prisma` → find `model Budget`. See the fields and the `@@unique` constraint.
2. `lib/validations.ts` → find `budgetUpsertSchema`. See what's allowed.
3. `app/api/budgets/route.ts` → see the GET (list) and POST (upsert) handlers.
4. `app/api/budgets/[id]/route.ts` → see the DELETE handler.
5. `app/api/budgets/summary/route.ts` → see how spend-vs-limit is computed for each budget.
6. `app/(app)/budgets/page.tsx` → the thin page that renders the panel.
7. `components/budgets-panel.tsx` → the client component with state, fetches, and the form.
8. Back to `components/ui/progress.tsx` → the bar used to visualize usage.

Do this walk once for one feature and the rest of the codebase becomes 3× easier.

---

## A "where do I put this?" cheat sheet

| You want to... | Put it in... |
|---|---|
| Add a new database field | `prisma/schema.prisma` + run `prisma migrate dev` |
| Add a new API rule | `lib/validations.ts` (Zod) + the relevant `app/api/...` route |
| Add a new page | `app/(app)/<name>/page.tsx` |
| Add a new reusable button/card | `components/ui/<name>.tsx` |
| Add a new feature panel | `components/<name>-panel.tsx` |
| Add shared math/helpers | `lib/<name>.ts` |
| Change the sidebar | `components/app-shell.tsx` |
| Change theme colors | `app/globals.css` (CSS variables) |

---

## Next up

- [REQUEST_FLOW.md](REQUEST_FLOW.md) — watch one click travel through all these files.
- [EDGE_CASES_AND_RULES.md](EDGE_CASES_AND_RULES.md) — the exact rules enforced in the code.
