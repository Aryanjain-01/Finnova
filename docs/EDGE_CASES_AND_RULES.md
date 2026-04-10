# Edge Cases & Rules

Every rule below is **already enforced in the code**. This doc tells you what they are and exactly where they live. When something behaves unexpectedly, find the rule here and you'll know which file to open.

---

## The two lines of defense

Every mutation in this app is protected twice:

1. **Zod schema** in `lib/validations.ts` — shape, types, basic ranges.
2. **Ownership + business logic** in the route handler (`app/api/*/route.ts`) — cross-record checks that Zod can't do because they require a database lookup.

If a rule *could* be enforced at both levels, it usually is. That's intentional — defense in depth.

---

## 1) Authentication & ownership rules

### Rule: every protected endpoint checks the session first
**Where:** every `app/api/*/route.ts` handler starts with:
```ts
const r = await requireUserId();
if ("response" in r) return r.response;
```
**Why:** no session → no `userId` → no data access. Period.
**Helper:** `lib/api.ts:4`

### Rule: all queries are scoped to `userId`
**Where:** every Prisma query in protected routes includes `userId: r.userId` in the `where` clause. Example from `app/api/transactions/route.ts:23`:
```ts
const where: Prisma.TransactionWhereInput = { userId: r.userId };
```
**Why:** prevents User A from reading or writing User B's records by guessing IDs. This is the single most important security rule in this app. **Never break it.**

### Rule: protected pages are gated by middleware AND the page itself
**Where:** `middleware.ts:4` lists protected prefixes (`/dashboard`, `/transactions`, `/budgets`, `/accounts`, `/settings`). Each server page also double-checks with `await auth()` (see `dashboard/page.tsx:71`).
**Why:** middleware is fast but can be bypassed if misconfigured; the page check is the real fence.

---

## 2) Transaction rules

Defined in `lib/validations.ts:28` (field schema) and `lib/validations.ts:39` (`transactionCreateSchema.superRefine`), enforced in `app/api/transactions/route.ts`.

### Rule: amount must be positive
**Where:** `lib/validations.ts:33` — `z.coerce.number().positive().max(1e12)`
**Why:** negative amounts would silently break totals and category breakdowns.

### Rule: type must be INCOME, EXPENSE, or TRANSFER
**Where:** `lib/validations.ts:34` — `z.enum(["INCOME", "EXPENSE", "TRANSFER"])`
**Why:** `type` is used in `if/else` chains throughout `lib/finance.ts`; unknown types would produce silent bugs.

### Rule: transfers require `toAccountId`
**Where:** `lib/validations.ts:40-47` (via `superRefine`)
```ts
if (data.type === "TRANSFER" && !data.toAccountId) {
  ctx.addIssue({ message: "toAccountId is required for transfers", path: ["toAccountId"] });
}
```
**Why:** money has to end up somewhere.

### Rule: a transfer cannot go to the same account
**Where:** `lib/validations.ts:48-53`
```ts
if (data.toAccountId && data.toAccountId === data.accountId) {
  ctx.addIssue({ message: "Cannot transfer to the same account", path: ["toAccountId"] });
}
```
**Why:** pointless operation; would net to zero and clutter the ledger.

### Rule: source account must belong to the logged-in user
**Where:** `app/api/transactions/route.ts:94-99`
```ts
const account = await prisma.account.findFirst({ where: { id: data.accountId, userId: r.userId } });
if (!account) return NextResponse.json({ error: "Account not found" }, { status: 400 });
```
**Why:** stops ID guessing attacks. Zod can't check this — it needs a DB lookup.

### Rule: destination account (for transfers) must also belong to the user
**Where:** `app/api/transactions/route.ts:101-108`

### Rule: category (if provided) must belong to the user
**Where:** `app/api/transactions/route.ts:110-116`

### Rule: expense transactions require an EXPENSE category; income transactions require an INCOME category
**Where:** `app/api/transactions/route.ts:117-122`
```ts
if (data.type === "INCOME" && cat.type !== "INCOME") return ... 400;
if (data.type === "EXPENSE" && cat.type !== "EXPENSE") return ... 400;
```
**Why:** prevents nonsense like tagging a grocery bill with the "Salary" category, which would ruin category-based reports.

### Rule: transfers ignore `categoryId` even if the client sends one
**Where:** `app/api/transactions/route.ts:130-133` — the server forces `categoryId: null` for transfers before writing:
```ts
categoryId: data.type === "TRANSFER" ? null : data.categoryId ?? null,
```
**Why:** a transfer isn't income or expense — it's a move. Assigning a category would skew totals.

### Rule: notes ≤ 2000 chars, tags ≤ 500 chars
**Where:** `lib/validations.ts:35-36`
**Why:** DB hygiene; prevents someone pasting a novel into a note.

---

## 3) Pagination & query filter guards

From `app/api/transactions/route.ts:12-13`:

### Rule: `page` is clamped to at least 1
```ts
const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
```

### Rule: `pageSize` is clamped between 1 and 100
```ts
const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize") ?? "20") || 20));
```
**Why:** prevents a malicious or broken client from requesting `pageSize=1000000` and nuking the DB.

### Rule: date filters are only applied if provided
**Where:** `app/api/transactions/route.ts:30-34`
```ts
if (from || to) {
  where.date = {};
  if (from) where.date.gte = new Date(from);
  if (to) where.date.lte = new Date(to);
}
```
**Why:** a missing filter should mean "no filter", not "match nothing".

### Rule: text search is case-insensitive and matches notes OR tags
**Where:** `app/api/transactions/route.ts:40-45`

---

## 4) Budget rules

Defined in `lib/validations.ts:69` (`budgetUpsertSchema`).

### Rule: year must be between 2000 and 2100
```ts
year: z.coerce.number().int().min(2000).max(2100)
```

### Rule: month must be 1-12
```ts
month: z.coerce.number().int().min(1).max(12)
```

### Rule: limit amount must be positive
```ts
limitAmount: z.coerce.number().positive().max(1e12)
```

### Rule: at most one budget per (user, category, year, month)
**Where:** `prisma/schema.prisma:108` — `@@unique([userId, categoryId, year, month])`
**Why:** two budgets for the same thing is ambiguous — which one is the "real" limit?

---

## 5) Account / category rules

### Rule: name must be 1–120 characters
**Where:** `lib/validations.ts:10` and `lib/validations.ts:20`

### Rule: account type is an enum: CASH, BANK, CARD, OTHER
**Where:** `lib/validations.ts:11` and enforced at the DB level by `AccountTypeEnum` in `prisma/schema.prisma:10`

### Rule: category type is an enum: INCOME, EXPENSE
**Where:** `lib/validations.ts:21` and `CategoryTypeEnum` in `prisma/schema.prisma:17`

### Rule: currency is a 3-letter code (optional)
**Where:** `lib/validations.ts:12` — `z.string().length(3).optional()`
**Why:** ISO 4217 codes are exactly 3 letters.

### Rule: account can be soft-deleted via `archived` flag (not hard-deleted)
**Where:** `lib/validations.ts:16` — `accountUpdateSchema` includes `archived: z.boolean().optional()`
**Why:** hard-deleting an account would cascade-destroy its transactions history.

---

## 6) Savings goal rules

From `lib/validations.ts:86-103`.

### Rule: target amount must be positive
### Rule: current amount must be ≥ 0 (can be zero, can't be negative)
```ts
currentAmount: z.coerce.number().min(0).max(1e12).optional()
```
### Rule: name is 1-120 chars
### Rule: deadline is optional (no date = no deadline)

---

## 7) Recurring transaction rules

From `lib/validations.ts:105-127`.

### Rule: type is INCOME or EXPENSE (no TRANSFER)
**Where:** `lib/validations.ts:109` — `z.enum(["INCOME", "EXPENSE"])`
**Why:** recurring transfers would be ambiguous (which account moves?). Not supported.

### Rule: frequency is one of DAILY, WEEKLY, MONTHLY, YEARLY
**Where:** `lib/validations.ts:110` and `RecurrenceFrequency` enum in `prisma/schema.prisma:111`

### Rule: start date is required; end date is optional
**Where:** `lib/validations.ts:111-112`

### Rule: `active: false` pauses a recurring entry without deleting it

---

## 8) Auth rules

### Rule: email must be a valid email format, password must be non-empty (login)
**Where:** `auth.ts:8` — `credentialsSchema`

### Rule: password must be at least 8 characters (registration)
**Where:** `lib/validations.ts:5` — `z.string().min(8, "Password must be at least 8 characters")`

### Rule: passwords are bcrypt-hashed, never stored plain
**Where:** `auth.ts:42` — `bcrypt.compare(parsed.data.password, user.passwordHash)`
**And:** the register endpoint uses `bcrypt.hash` before writing. **Never log, never expose, never compare plain-text passwords.**

### Rule: sessions use JWT and expire in 30 days
**Where:** `auth.ts:61` — `session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 }`

### Rule: DB connection errors are surfaced as `DatabaseUnavailableError`, not generic auth errors
**Where:** `auth.ts:14-24` and `auth.ts:49-57`
**Why:** when Postgres is down, users see a clear "database down" message instead of "invalid credentials". Great UX + easier debugging.

---

## 9) Database-level guards

From `prisma/schema.prisma`.

### Rule: `amount` is `Decimal(14, 2)`, not `Float`
**Where:** `Transaction.amount`, `Budget.limitAmount`, `SavingsGoal.targetAmount`, `SavingsGoal.currentAmount`, `RecurringTransaction.amount`
**Why:** floats lose precision (0.1 + 0.2 ≠ 0.3). **Never use Float for money.** Ever.

### Rule: deleting a user cascades to all their data
**Where:** every user-owned model has `onDelete: Cascade` on the `user` relation.
**Why:** no orphaned records. GDPR-friendly: deleting the user deletes everything.

### Rule: deleting a category or destination account does NOT delete transactions
**Where:** `Transaction.category` uses `onDelete: SetNull`; `Transaction.toAccount` uses `onDelete: SetNull`.
**Why:** preserve transaction history even if you reorganize your categories/accounts later.

### Rule: `User.email` is unique
**Where:** `prisma/schema.prisma:30` — `email String @unique`
**Why:** email is the login identifier.

### Rule: currency defaults to INR
**Where:** `User.currency @default("INR")` and `Account.currency @default("INR")`
**Why:** this app was built with INR as the primary currency. You can change it per-user in settings.

---

## 10) Dashboard / finance calculation rules

From `lib/finance.ts`.

### Rule: `monthBounds` uses UTC
```ts
const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
const end = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
```
**Why:** prevents timezone bugs where a transaction on the last day of the month gets counted in the next month for users in different zones.

### Rule: `computeAccountBalances` treats transfers as: `-amount` on source, `+amount` on destination
**Where:** `lib/finance.ts:23-25`
**Why:** a transfer doesn't change total net worth, but it does change individual account balances.

### Rule: `categoryBreakdown` only includes EXPENSE transactions
**Where:** `lib/finance.ts:64` — `type: "EXPENSE"`
**Why:** the dashboard breakdown is "where did my money go?", not "where did my money come from?".

### Rule: `categoryBreakdown` groups transactions with no category as "Uncategorized"
**Where:** `lib/finance.ts:71`

### Rule: `periodTotals` ignores transfers
**Where:** `lib/finance.ts:41` — `type: { in: ["INCOME", "EXPENSE"] }`
**Why:** transfers don't change income or expense totals.

---

## 11) Operational edge case you already hit: missing tables

**Symptom:** `PrismaClientKnownRequestError` with code `P2021` — "table does not exist in the current database".

**Cause:** you added a model to `schema.prisma` but forgot to create/run the migration, OR you're pointing at a different database than where you ran migrations.

**Pattern used in the code:** `dashboard/page.tsx:56` has a `safeGoalsQuery` helper that catches P2021 and returns `[]` so the dashboard still renders. This is a good pattern — **don't blow up the whole page because one table isn't there yet.**

**Fix:**
1. Confirm `DATABASE_URL` in `.env` points to the right DB.
2. Run `npx prisma migrate dev` to apply pending migrations.
3. If the migration is missing, run `npx prisma migrate dev --name add_xxx` to create it.
4. Restart `npm run dev`.
5. Re-test.

---

## 12) UI state edge cases to watch for

These are not "rules the code enforces" so much as "mistakes that are easy to make in client components". Watch for them when you add new panels:

- **Loading state not reset on early return.** Always `setLoading(false)` before every `return` in an async handler, or use `finally`.
- **Modal state not cleared when switching edit → new.** Always set both `setEditing(null)` and `setModalOpen(true)` (or `false`) together.
- **Filters not applied until an explicit "Apply" click.** The transactions panel uses a `q` state (what the user is typing) and a separate `applied.q` (what's currently filtering). Match that pattern or your API will fire on every keystroke.
- **Stale data after create/update.** Always re-call `load()` after a successful mutation.
- **Missing `credentials: "include"` on fetch.** Without it, the session cookie doesn't get sent → 401.

---

## 13) Security basics to keep

- **Never trust the frontend.** The client is just a convenience. Every rule above is enforced **on the server** precisely because a malicious user can build their own client.
- **Always validate in the API** — Zod before anything else.
- **Always scope by user** — `userId: r.userId` in every `where` clause.
- **Never expose secrets in client files.** `AUTH_SECRET`, `DATABASE_URL`, etc. only exist in server-side code. Next.js rules: any file marked `"use client"` or imported by one must not touch them.
- **Never log passwords.** Not even the hash.
- **Never concatenate user input into SQL.** Prisma parameterizes for you, so as long as you use `where: { ... }` objects and not raw queries, you're safe.

---

## Quick reference: "what file do I open?"

| Problem | Start here |
|---|---|
| Input was rejected | `lib/validations.ts` |
| Got 401 | `lib/api.ts`, `auth.ts`, check fetch has `credentials: "include"` |
| Got 400 "Account/Category not found" | `app/api/<resource>/route.ts` — ownership check |
| Got wrong amount on dashboard | `lib/finance.ts` |
| DB error `P2021` | `prisma/schema.prisma` + run migrate |
| DB error `P2002` | Unique constraint violated — check `@@unique` in schema |
| Middleware redirect loop | `middleware.ts` matcher |
| Session missing user ID | `auth.ts` jwt/session callbacks |

Bookmark this page. You will come back to it.
