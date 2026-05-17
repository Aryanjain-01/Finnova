# How The App Works — Layer by Layer

This doc explains the six layers of Finnova. Read top to bottom — each layer builds on the one above it.

```
┌──────────────────────────────────────────────┐
│  1. UI LAYER            (what the user sees) │  React components
│  ────────────────────────────────────────── │
│  2. ROUTING & PAGES     (what URL shows what)│  Next.js App Router
│  ────────────────────────────────────────── │
│  3. API LAYER           (backend endpoints)  │  app/api/*/route.ts
│  ────────────────────────────────────────── │
│  4. AUTH LAYER          (who are you?)       │  NextAuth + middleware
│  ────────────────────────────────────────── │
│  5. VALIDATION LAYER    (is this input ok?)  │  Zod schemas
│  ────────────────────────────────────────── │
│  6. DATA LAYER          (the database)       │  Prisma + PostgreSQL
└──────────────────────────────────────────────┘
```

Every user action travels down this stack and back up.

---

## 1) UI Layer — React components

**Where it lives:** `components/*.tsx` and `components/ui/*.tsx`

Two flavors:

- **`components/ui/*`** — small reusable atoms: `Button`, `Card`, `Modal`, `Badge`, `Skeleton`, `Toast`, `Progress`, `StatTile`, `PageHeader`, `AnimatedNumber`.
- **`components/*.tsx`** — big feature panels: `TransactionsPanel`, `AccountsPanel`, `BudgetsPanel`, `GoalsPanel`, `RecurringPanel`, `SettingsPanel`, `DashboardCharts`, `AppShell`, `CommandPalette`.

Most feature panels are **client components** (`"use client"` at the top) because they need state and event handlers. They fetch data via `fetch("/api/...")` and manage their own state.

**Example:** `components/transactions-panel.tsx` renders the filters, the table, and the add/edit modal for the Transactions page. It holds local state for the filters, calls `/api/transactions`, and re-renders the table when new data arrives.

---

## 2) Routing & Pages — Next.js App Router

**Where it lives:** `app/*`

Next.js decides what to render from the **folder structure**. A file named `page.tsx` inside a folder becomes the page for that URL.

```
app/
├── layout.tsx              → root HTML shell (every page)
├── page.tsx                → "/"  (the home page)
├── globals.css             → Tailwind + theme vars
│
├── (auth)/                 → route group: login + register
│   ├── layout.tsx          → auth layout (centered card)
│   ├── login/page.tsx      → "/login"
│   └── register/page.tsx   → "/register"
│
├── (app)/                  → route group: all protected pages
│   ├── layout.tsx          → AppShell (sidebar, topbar)
│   ├── dashboard/page.tsx  → "/dashboard"
│   ├── transactions/page.tsx
│   ├── accounts/page.tsx
│   ├── budgets/page.tsx
│   ├── goals/page.tsx
│   ├── recurring/page.tsx
│   └── settings/page.tsx
│
└── api/                    → backend endpoints (see layer 3)
```

### Route groups

`(app)` and `(auth)` are **route groups**. The parentheses make the folder invisible in the URL. Their only job is to give you a **separate layout file** for a set of pages. All `(app)/*` pages share `(app)/layout.tsx` which wraps them in `<AppShell>` (sidebar + topbar). All `(auth)/*` pages share a simpler centered layout.

### Layouts are nested

Next.js automatically wraps your page in its layout, which is wrapped in the parent layout, and so on. So for `/dashboard`:

```
app/layout.tsx            (root HTML, <html>, <body>, providers)
 └── app/(app)/layout.tsx (AppShell with sidebar)
      └── app/(app)/dashboard/page.tsx (dashboard content)
```

You don't wire this up. Next.js does it based on folder nesting.

---

## 3) API Layer — Route Handlers

**Where it lives:** `app/api/**/route.ts`

Same folder convention, but instead of `page.tsx`, you create `route.ts`. Whatever HTTP verbs you export (`GET`, `POST`, `PUT`, `DELETE`, `PATCH`) become the handlers for that URL.

```
app/api/
├── accounts/
│   ├── route.ts          → GET / POST "/api/accounts"
│   └── [id]/route.ts     → GET / PUT / DELETE "/api/accounts/:id"
├── transactions/
│   ├── route.ts
│   ├── [id]/route.ts
│   └── export/route.ts   → CSV export
├── categories/
├── budgets/
├── goals/
├── recurring/
├── dashboard/
├── insights/
├── user/
└── auth/[...nextauth]/route.ts  → NextAuth's own endpoints
```

### The shape of a typical handler

Every mutating endpoint follows the same five steps. Example: `app/api/transactions/route.ts:74` (the `POST`):

```ts
export async function POST(req: Request) {
  // 1) AUTH — is there a logged-in user?
  const r = await requireUserId();
  if ("response" in r) return r.response;   // → 401 if not

  // 2) PARSE — get the JSON body
  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  // 3) VALIDATE — run it through Zod
  const parsed = transactionCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  // 4) OWNERSHIP — make sure referenced IDs belong to this user
  const account = await prisma.account.findFirst({
    where: { id: data.accountId, userId: r.userId },
  });
  if (!account) return NextResponse.json({ error: "Account not found" }, { status: 400 });

  // 5) WRITE — hit the database
  const created = await prisma.transaction.create({ data: { ... } });
  return NextResponse.json(created);
}
```

**Why each step matters:**

| Step | Skipping it means |
|---|---|
| Auth | Anonymous people can read/write your users' data |
| Parse | Crash on malformed JSON |
| Validate | Invalid values hit the DB (negative amounts, huge strings, wrong enums) |
| Ownership | User A can modify User B's data by guessing IDs |
| Write | Nothing happens :) |

All five steps are enforced in every protected route in this repo. If you add a new route, copy this shape.

---

## 4) Auth Layer — NextAuth + middleware

**Where it lives:** `auth.ts`, `middleware.ts`, `lib/api.ts`, `app/api/auth/[...nextauth]/route.ts`

Finnova uses **NextAuth v5** with the **Credentials provider** (email + password). There is no "sign in with Google" — you register with a password, it gets bcrypt-hashed and stored in the `User.passwordHash` column.

### How login actually works

1. User submits the login form at `/login`.
2. NextAuth calls the `authorize` function in `auth.ts:34`.
3. That function:
   - Validates the payload with a small Zod schema.
   - Looks up the user by email via Prisma.
   - Uses `bcrypt.compare` to check the password against `passwordHash`.
   - Returns a minimal user object `{ id, email, name }` on success, or `null` on failure.
4. NextAuth creates a **JWT session** (set in `session: { strategy: "jwt" }`), which lives in an HTTP-only cookie.
5. On every subsequent request, NextAuth reads that cookie and rehydrates the session.

### The three places auth is checked

1. **`middleware.ts`** — runs on every page request (not API). It:
   - Redirects unauthenticated users hitting a protected route to `/login?callbackUrl=...`.
   - Redirects already-logged-in users away from `/login` and `/register` (to `/dashboard`).
   - Redirects `/` to `/dashboard` (if logged in) or `/login` (if not).

2. **Page components** — server pages double-check the session. Example from `dashboard/page.tsx:72`:
   ```ts
   const session = await auth();
   if (!session?.user?.id) redirect("/login");
   ```

3. **API routes** — via `requireUserId()` in `lib/api.ts:4`. This is the gatekeeper: if there's no session, it returns a ready-to-use 401 `NextResponse`; otherwise it gives you the `userId` to use in Prisma `where` clauses.

> **Why three layers?** Middleware is fast but can't do per-page data checks. Server pages need the user ID anyway. API routes are hit by fetch calls that never go through the middleware's page matcher. Defense in depth.

---

## 5) Validation Layer — Zod schemas

**Where it lives:** `lib/validations.ts`

Every single piece of user input in this app passes through a Zod schema before it touches the database. This file is the single source of truth for "what is valid input?"

### Why Zod and not manual `if` checks?

- **Type safety** — Zod schemas double as TypeScript types. After `schema.safeParse(body)`, TypeScript knows the exact shape of `parsed.data`.
- **Structured error messages** — `parsed.error.flatten()` gives you per-field error arrays, perfect for showing inline form errors in the UI.
- **Composability** — `schema.partial()`, `schema.extend()`, `schema.superRefine()` let you build complex schemas without copy-paste.

### A cross-field validation example

From `lib/validations.ts:39`:

```ts
export const transactionCreateSchema = transactionFields.superRefine((data, ctx) => {
  if (data.type === "TRANSFER") {
    if (!data.toAccountId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "toAccountId is required for transfers", path: ["toAccountId"] });
    }
    if (data.toAccountId && data.toAccountId === data.accountId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Cannot transfer to the same account", path: ["toAccountId"] });
    }
  }
});
```

The regular field validations (min, max, type) happen automatically. `superRefine` is where you put logic that needs to look at multiple fields at once.

See [EDGE_CASES_AND_RULES.md](EDGE_CASES_AND_RULES.md) for the full list of rules this file enforces.

---

## 6) Data Layer — Prisma + PostgreSQL

**Where it lives:** `prisma/schema.prisma`, `prisma/migrations/*`, `lib/prisma.ts`

### The schema

`prisma/schema.prisma` defines every table and every relationship. The models:

| Model | Purpose |
|---|---|
| `User` | Account owner. All other records have a `userId`. |
| `Account` | A wallet — cash, bank, card, other. `AccountTypeEnum`. |
| `Category` | Label for transactions. `INCOME` or `EXPENSE`. |
| `Transaction` | An income, expense, or transfer. Has `amount`, `date`, `type`, `accountId`, optional `toAccountId` (for transfers) and `categoryId`. |
| `Budget` | Monthly spending cap per category. Unique per `(user, category, year, month)`. |
| `SavingsGoal` | Target and current amount for a goal. |
| `RecurringTransaction` | Scheduled repeating entry. Tracks `frequency`, `startDate`, `nextRunDate`, `endDate`. |

### Relationships in plain English

- One user owns many accounts, categories, transactions, budgets, goals, and recurring entries.
- A transaction belongs to one "from" account (`accountId`) and, for transfers, one "to" account (`toAccountId`).
- A transaction optionally belongs to one category (transfers have none).
- A budget links a user + category for a specific month + year.

All user-owned relations use `onDelete: Cascade` — deleting a user wipes their entire dataset. Transactions' `categoryId` and `toAccountId` use `SetNull` so deleting a category doesn't destroy history.

### The Prisma client singleton

`lib/prisma.ts` is tiny but important:

```ts
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
export const prisma = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

In dev, Next.js hot-reloads files constantly. Without this trick, you'd spin up a new `PrismaClient` on every reload and eventually exhaust DB connections. Stashing it on `globalThis` keeps a single instance alive across reloads.

### Migrations

When you change `schema.prisma`, you run:

```bash
npx prisma migrate dev --name what_you_changed
```

This creates a new folder under `prisma/migrations/` with the SQL Prisma generated. Commit that folder. In production, `npx prisma migrate deploy` applies any pending migrations.

**Never hand-edit a migration that's already been applied somewhere.** Create a new migration that fixes whatever needs fixing.

---

## Bonus: the business logic layer (`lib/`)

Not a formal layer, but worth knowing:

| File | Purpose |
|---|---|
| `lib/prisma.ts` | The one Prisma client. |
| `lib/api.ts` | `requireUserId()` — auth gate for API routes. |
| `lib/validations.ts` | All Zod schemas. |
| `lib/finance.ts` | Pure money math: `monthBounds`, `periodTotals`, `categoryBreakdown`, `monthlyTrends`, `computeAccountBalances`, `formatMoney`. |
| `lib/insights.ts` | Generates the auto-insights shown on the dashboard. |
| `lib/recurrence.ts` | Date math for recurring transactions ("when is the next run?"). |
| `lib/register-defaults.ts` | Seeds default categories/accounts when a user registers. |

Why isolate this from routes and components?
- **Reuse** — `periodTotals` is called by the dashboard page, by `/api/dashboard`, and by `lib/insights.ts`. Write once, call everywhere.
- **Testability** — pure functions with clear inputs and outputs are easy to unit-test (when you eventually add tests).
- **Readability** — routes stay focused on HTTP concerns; components stay focused on UI.

---

## The one-page mental model

```
User types in form
    │
    ▼
React state updates (useState)
    │
    ▼
User clicks submit → fetch("/api/...") ─────────┐
                                                 │
                            ┌────────────────────┘
                            ▼
                    app/api/.../route.ts
                            │
                            ├─ requireUserId()  ← auth gate (lib/api.ts → auth.ts)
                            ├─ schema.safeParse ← validation (lib/validations.ts)
                            ├─ ownership checks ← prisma.xxx.findFirst({ userId })
                            └─ prisma.xxx.create/update/delete
                                    │
                                    ▼
                            PostgreSQL
                                    │
                                    ▼
                            JSON response
                            │
     ┌──────────────────────┘
     ▼
React receives response → setState → UI re-renders
```

Every request in this app follows this shape. Once you see it, the whole codebase gets a lot smaller.

---

## Next up

- [REQUEST_FLOW.md](REQUEST_FLOW.md) — walk through three specific flows line by line.
- [CODEBASE_EXPLAINED.md](CODEBASE_EXPLAINED.md) — deeper file-by-file tour.
- [EDGE_CASES_AND_RULES.md](EDGE_CASES_AND_RULES.md) — the business rules the code enforces.
