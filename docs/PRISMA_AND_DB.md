# Prisma and the Database Layer

This guide walks through how Finnova talks to PostgreSQL. If you have never used an ORM before, read it top to bottom. If you just need a query pattern, jump to section 7.

Everything here is grounded in real files in this repo. File paths are absolute so you can open them side by side.

---

## 1. What Prisma is

Prisma is an **ORM** (Object-Relational Mapper). In plain English:

- You describe your tables in a file called `schema.prisma`.
- Prisma generates a fully typed TypeScript client from that file.
- You call methods like `prisma.transaction.findMany(...)` instead of writing raw SQL.
- Prisma translates your calls into SQL and runs them against PostgreSQL.

Why bother with an ORM instead of raw SQL?

- **Type safety.** The generated client knows every table, column, and relation. If you misspell a field, TypeScript catches it before you run the app.
- **Safety from SQL injection.** Prisma parameterizes everything. You cannot accidentally glue user input into a query string.
- **Developer experience.** Autocomplete everywhere. Refactors are safe.
- **Portability.** The same client code works on Postgres, MySQL, SQLite, SQL Server. Switching engines is (mostly) a config change.
- **Migrations.** Prisma generates SQL migration files from diffs in your schema, so schema changes are versioned in git.

The trade-off: Prisma is an abstraction. For 95% of queries it is a huge win. For the last 5% (exotic joins, window functions, CTEs) you can drop to `prisma.$queryRaw` when you need to.

---

## 2. The three parts of Prisma in this project

Prisma shows up in three places:

1. **`C:\Users\mudit\Videos\Finnova\prisma\schema.prisma`** — the blueprint. Every table, column, index, relation, and enum lives here.
2. **`C:\Users\mudit\Videos\Finnova\prisma\migrations\`** — the history of schema changes as SQL files. Current migrations in this repo:
   - `20260401000000_init` — the initial schema (User, Account, Category, Transaction, Budget)
   - `20260407211616_set_default_currency_inr` — changed default currency to INR
   - `20260408000000_goals_and_recurring` — added SavingsGoal and RecurringTransaction
3. **`@prisma/client`** — the auto-generated TypeScript package. You import a single shared instance from `lib/prisma.ts`:
   ```ts
   import { prisma } from "@/lib/prisma";
   ```

You never write code inside `@prisma/client`. Prisma regenerates it every time you run `prisma migrate dev` or `prisma generate`.

---

## 3. The singleton pattern (`lib/prisma.ts`)

Here is the entire file at `C:\Users\mudit\Videos\Finnova\lib\prisma.ts`:

```ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

Why the weird `globalThis` dance?

- In dev, Next.js uses **hot reload**. Every time you save a file, the server re-evaluates your modules.
- If `lib/prisma.ts` naively did `export const prisma = new PrismaClient()`, you would spawn a **new** client on every reload.
- Each client opens a pool of Postgres connections. After a few minutes of editing, you would exhaust your database's max connections and get `too many clients already` errors.
- Stashing the client on `globalThis` in non-production means reloads pick up the **same** instance. One client, one connection pool, no leaks.
- In production, hot reload does not exist, so we skip the stash.

**Rule:** never create `new PrismaClient()` anywhere else in the codebase. Always `import { prisma } from "@/lib/prisma"`.

---

## 4. Reading `schema.prisma` — the DSL

`schema.prisma` is written in Prisma's own small language. Let's walk through the syntax using real lines from `C:\Users\mudit\Videos\Finnova\prisma\schema.prisma`.

### The datasource and generator blocks

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

- `generator client` says "generate a TypeScript client".
- `datasource db` says "we're using Postgres, and the connection string lives in the `DATABASE_URL` env var".

### A model is a table

```prisma
model User {
  id           String   @id @default(cuid())
  email        String   @unique
  passwordHash String
  name         String?
  currency     String   @default("INR")
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  ...
}
```

Line by line:

| Line | Meaning |
| --- | --- |
| `model User` | Creates a `User` table. |
| `id String @id @default(cuid())` | Primary key, string type, auto-filled with a collision-safe CUID. |
| `email String @unique` | Required string, DB-level uniqueness constraint. |
| `passwordHash String` | Required string, no default. |
| `name String?` | The `?` makes it **optional** (nullable in Postgres). |
| `currency String @default("INR")` | String with a default value. New rows get `"INR"` unless you pass something else. |
| `createdAt DateTime @default(now())` | Auto-filled with the current time on insert. |
| `updatedAt DateTime @updatedAt` | Auto-updated with the current time on every `update`. |

### Relations

Relations have two sides. The "owning" side has the foreign key.

```prisma
model User {
  accounts Account[]   // one user -> many accounts
}

model Account {
  userId String
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

- On `User`, `accounts Account[]` is the "list" side. Purely virtual; it has no column in the DB.
- On `Account`, `userId` is the real foreign key column, and `user` is the relation field that lets you navigate to the user object.
- `onDelete: Cascade` means: if the user is deleted, delete all their accounts too.

### Named relations

When one model has **two** relations to the same other model, Prisma needs names to tell them apart. This happens in `Transaction`:

```prisma
model Transaction {
  accountId   String
  account     Account  @relation("AccountTx",   fields: [accountId],   references: [id], onDelete: Cascade)
  toAccountId String?
  toAccount   Account? @relation("TransferIn",  fields: [toAccountId], references: [id], onDelete: SetNull)
}

model Account {
  transactions Transaction[] @relation("AccountTx")
  transfersIn  Transaction[] @relation("TransferIn")
}
```

- `AccountTx` — the account that **owns** the transaction (money leaves or enters here).
- `TransferIn` — the destination account when the transaction is a transfer.
- Without the names, Prisma would not know which `Transaction[]` list belongs to which relation.

### Composite unique constraints

```prisma
model Budget {
  ...
  @@unique([userId, categoryId, year, month])
}
```

This says "no user can have two budgets for the same category in the same month". Tries to insert a duplicate will fail with a Prisma error (`P2002`).

### Enums

```prisma
enum AccountTypeEnum {
  CASH
  BANK
  CARD
  OTHER
}

enum CategoryTypeEnum {
  INCOME
  EXPENSE
}

enum TransactionTypeEnum {
  INCOME
  EXPENSE
  TRANSFER
}

enum RecurrenceFrequency {
  DAILY
  WEEKLY
  MONTHLY
  YEARLY
}
```

Enums become Postgres enums and TypeScript string unions. You get autocomplete on every call site.

### Decimal for money

```prisma
amount Decimal @db.Decimal(14, 2)
```

- `Decimal` is Prisma's exact-precision number type.
- `@db.Decimal(14, 2)` tells Postgres: up to 14 digits total, 2 after the decimal point.
- **Never use `Float` for money.** Floats can't exactly represent `0.10`, and small rounding errors compound over thousands of transactions. With `Decimal`, `1.00 - 0.10` is exactly `0.90`, always.

---

## 5. The 7 models at a glance

From `C:\Users\mudit\Videos\Finnova\prisma\schema.prisma`:

| Model | Purpose | Key fields |
| --- | --- | --- |
| `User` | The account owner. Everything else hangs off a user. | `id`, `email @unique`, `passwordHash`, `name?`, `currency` |
| `Account` | A place where money lives (cash, bank, card). | `id`, `userId`, `name`, `type: AccountTypeEnum`, `archived` |
| `Category` | Income or expense bucket (Food, Salary, Rent). | `id`, `userId`, `name`, `type: CategoryTypeEnum`, `color?`, `icon?` |
| `Transaction` | An income, expense, or transfer event. | `id`, `userId`, `accountId`, `toAccountId?`, `categoryId?`, `amount: Decimal`, `type`, `date`, `notes?`, `tags?` |
| `Budget` | A monthly spending cap per category. Unique per `(user, category, year, month)`. | `id`, `userId`, `categoryId`, `year`, `month`, `limitAmount` |
| `SavingsGoal` | A target amount to save toward, with progress. | `id`, `userId`, `name`, `targetAmount`, `currentAmount`, `deadline?` |
| `RecurringTransaction` | A template that generates transactions on a schedule. | `id`, `userId`, `accountId`, `categoryId?`, `amount`, `type`, `frequency`, `startDate`, `nextRunDate`, `endDate?`, `active` |

---

## 6. Relations explained in plain English

- **One user owns everything.** Every other model has `userId` as a foreign key. `User` deletion cascades across all their data.
- **A transaction has one source account** (`accountId`, required) **and optionally a destination account** (`toAccountId`, nullable) when the transaction is a `TRANSFER`.
- **A transaction optionally has a category.** Income and expense transactions usually do. Transfers never do (money is not being spent, just moved).
- **A budget is uniquely keyed by `(userId, categoryId, year, month)`.** You cannot double-book a category's budget.
- **`onDelete` behaviors matter.**
  - `Cascade` on `user` and `account` relations: deleting a user or their account deletes their transactions. This is fine because the data is theirs.
  - `SetNull` on `category` and `toAccount` on `Transaction`: deleting a category or a destination account nulls out the reference on old transactions instead of deleting them. **This preserves your history.** If you delete your "Coffee" category next year, you don't want all your old coffee purchases to vanish — you just want them to show as "Uncategorized".

---

## 7. Common query patterns with real examples

All examples in this section come from `C:\Users\mudit\Videos\Finnova\app\api\transactions\route.ts` and `C:\Users\mudit\Videos\Finnova\lib\finance.ts`. Open those files to see the full context.

### 7.1 `findMany` with filters, pagination, and includes

From `app/api/transactions/route.ts` around lines 23-56 — the where clause is built up gradually before being passed in:

```ts
const where: Prisma.TransactionWhereInput = { userId: r.userId };

if (type && ["INCOME", "EXPENSE", "TRANSFER"].includes(type)) {
  where.type = type;
}
if (accountId) where.accountId = accountId;
if (categoryId) where.categoryId = categoryId;
if (from || to) {
  where.date = {};
  if (from) where.date.gte = new Date(from);
  if (to) where.date.lte = new Date(to);
}
if (minAmount || maxAmount) {
  where.amount = {};
  if (minAmount) where.amount.gte = new Prisma.Decimal(minAmount);
  if (maxAmount) where.amount.lte = new Prisma.Decimal(maxAmount);
}
if (q) {
  where.OR = [
    { notes: { contains: q, mode: "insensitive" } },
    { tags:  { contains: q, mode: "insensitive" } },
  ];
}
```

Key points:

- Use `Prisma.TransactionWhereInput` so TypeScript checks the shape of the object.
- Date ranges use `gte` / `lte`. You build a nested object: `where.date = { gte, lte }`.
- Decimal bounds must be wrapped in `new Prisma.Decimal(...)`, not passed as plain numbers.
- Full-text-ish search uses `OR` with `contains` and `mode: "insensitive"` on the string columns you care about.

Then the actual query (line 47-56):

```ts
const [total, rows] = await prisma.$transaction([
  prisma.transaction.count({ where }),
  prisma.transaction.findMany({
    where,
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    skip: (page - 1) * pageSize,
    take: pageSize,
    include: { account: true, toAccount: true, category: true },
  }),
]);
```

- `orderBy` can be an array. Earlier entries win ties.
- `skip` / `take` is Prisma's pagination (`OFFSET` / `LIMIT`).
- `include` pulls in related records in one round-trip. After this runs, every row has a full `account` object on it.

### 7.2 `findFirst` with ownership check — the security pattern

Lines 94-96 of the same file:

```ts
const account = await prisma.account.findFirst({
  where: { id: data.accountId, userId: r.userId },
});
```

Why not `findUnique({ where: { id } })`? Because that would let a logged-in user fetch **anyone's** account just by knowing the ID. By requiring `userId: r.userId` in the where clause, the query only matches if that account actually belongs to the current user. If it doesn't, `account` is `null` and the route returns an error.

**Every single protected query must include `userId` in the where clause.** More on this in section 11.

### 7.3 `findUnique` with `select`

From `app/(app)/dashboard/page.tsx` lines 75-78:

```ts
const user = await prisma.user.findUnique({
  where: { id: userId },
  select: { name: true },
});
```

- `findUnique` is used when the where is a unique key (here, the primary key `id`).
- `select` asks for **only** the listed fields. The returned object is `{ name: string | null }`, not the whole user. Use this when you don't need everything — it is faster and doesn't leak sensitive columns like `passwordHash`.

### 7.4 `create` with relations and Decimal

Lines 125-141:

```ts
const created = await prisma.transaction.create({
  data: {
    userId:      r.userId,
    accountId:   data.accountId,
    toAccountId: data.type === "TRANSFER" ? data.toAccountId : null,
    categoryId:
      data.type === "TRANSFER"
        ? null
        : data.categoryId ?? null,
    amount: new Prisma.Decimal(data.amount),
    type:   data.type,
    date:   data.date,
    notes:  data.notes ?? null,
    tags:   data.tags  ?? null,
  },
  include: { account: true, toAccount: true, category: true },
});
```

- `data` holds the fields to insert. You pass foreign keys (`accountId`) directly.
- `amount` is wrapped in `new Prisma.Decimal(...)` so Prisma stores it with full precision.
- `include` here hydrates the related records on the returned object so we can send them back to the client in one response.

### 7.5 `groupBy` for aggregates

From `lib/finance.ts` lines 36-44:

```ts
const agg = await prisma.transaction.groupBy({
  by: ["type"],
  where: {
    userId,
    date: { gte: start, lte: end },
    type: { in: ["INCOME", "EXPENSE"] },
  },
  _sum: { amount: true },
});
```

- `by: ["type"]` is the SQL `GROUP BY` column.
- `_sum: { amount: true }` asks for `SUM(amount)` per group.
- Other aggregates exist: `_count`, `_avg`, `_min`, `_max`.
- The result is an array where each row has the grouped column(s) plus a `_sum` sub-object.

The consuming code then loops and assigns:

```ts
for (const row of agg) {
  const v = Number(row._sum.amount ?? 0);
  if (row.type === "INCOME")  income  += v;
  if (row.type === "EXPENSE") expense += v;
}
```

### 7.6 `$transaction` — batching queries

From `app/api/transactions/route.ts` line 47:

```ts
const [total, rows] = await prisma.$transaction([
  prisma.transaction.count({ where }),
  prisma.transaction.findMany({ ... }),
]);
```

`$transaction` with an **array** runs multiple operations atomically in a single DB transaction. Either all succeed or all roll back. It also saves a network round-trip compared to two separate `await`s. This is the canonical pattern for "give me the total and the page at the same time".

There is also a **callback** form — `prisma.$transaction(async (tx) => { ... })` — which you use when the later queries depend on earlier results inside the same atomic block. This repo uses the array form.

### 7.7 `update`, `upsert`, `delete` — shapes to memorize

```ts
// Update: locate with where, change with data
await prisma.transaction.update({
  where: { id },
  data:  { notes: "updated" },
});

// Upsert: try to find by unique where; create if missing, update if present
await prisma.budget.upsert({
  where:  { userId_categoryId_year_month: { userId, categoryId, year, month } },
  create: { userId, categoryId, year, month, limitAmount: new Prisma.Decimal("500") },
  update: { limitAmount: new Prisma.Decimal("500") },
});

// Delete: just a where
await prisma.transaction.delete({ where: { id } });
```

Note the upsert `where` for a composite unique: the key name is the field names joined with underscores (`userId_categoryId_year_month`). Prisma generates that name from the `@@unique([...])` declaration.

For ownership-safe updates/deletes, use `updateMany` / `deleteMany` with the `userId` filter:

```ts
await prisma.transaction.deleteMany({ where: { id, userId: r.userId } });
```

If the row doesn't belong to the user, nothing is deleted and no error is thrown. Check the returned `count` to know whether it happened.

### 7.8 `include` vs `select`

- `include` — give me **all** fields of this model, **plus** fill in these relations.
- `select` — give me **only** these specific fields (and nothing else).

You **cannot** use both on the same level. Pick one. Use `select` when you want to restrict columns; use `include` when you want to pull in relations and are happy with all columns of the base model.

---

## 8. Decimal handling — the pitfall that bites everyone

`Decimal` is precise but **not JSON-safe**. `JSON.stringify(new Prisma.Decimal("1.23"))` produces something useless. So every API route must convert Decimals to strings before sending them to the browser.

### Outbound: `toString()` before response

From `app/api/transactions/route.ts` line 62-71:

```ts
items: rows.map((t) => ({
  ...t,
  amount: t.amount.toString(),
  account: { id: t.account.id, name: t.account.name },
  toAccount: t.toAccount ? { id: t.toAccount.id, name: t.toAccount.name } : null,
  category: t.category
    ? { id: t.category.id, name: t.category.name, type: t.category.type }
    : null,
})),
```

The `amount` is re-assigned to `t.amount.toString()`. The client gets a string like `"123.45"` which it can parse with `Number(...)` when needed.

### Inbound: wrap in `new Prisma.Decimal(...)`

From line 134 of the same file:

```ts
amount: new Prisma.Decimal(data.amount),
```

`data.amount` came from the request as a number (validated by Zod). Wrapping it in `Prisma.Decimal` before handing it to `create` guarantees no floating-point mangling happens on the way in.

**Rule of thumb:** Decimals are strings over the wire, `Prisma.Decimal` inside your server code, and you should never do math on them directly. When you need arithmetic (like the balance math in `lib/finance.ts`), convert to `Number(t.amount)` at the last possible moment. It's a small precision risk, but acceptable for display-layer calculations.

---

## 9. Migrations

A migration is a timestamped folder containing:

- `migration.sql` — the exact SQL Prisma generated to move from the previous schema state to the current one.
- An auto-updated `migration_lock.toml` at the root of `prisma/migrations/` so Prisma knows the DB provider.

### Creating a migration

```bash
npx prisma migrate dev --name add_savings_goal_color
```

Here's what happens step by step:

1. Prisma reads your current `schema.prisma`.
2. Prisma reads the state of your dev database.
3. Prisma computes the diff and emits SQL to bridge it.
4. A new folder appears under `prisma/migrations/<timestamp>_add_savings_goal_color/`.
5. Prisma applies the SQL to your dev database.
6. Prisma regenerates `@prisma/client` so your TypeScript code picks up the new fields.

### Applying in production

```bash
npx prisma migrate deploy
```

This applies any pending migrations to the target database without trying to generate new ones. Use it in your deploy pipeline.

### Never edit an applied migration

Once a migration has been applied to any database (especially production), **do not hand-edit it**. Prisma keeps a `_prisma_migrations` table with checksums; if you change a file that was already applied, your next deploy will fail with a drift error.

If you need to fix something, make a **new** migration that reverses or corrects the old one.

### Resetting the dev database

```bash
npx prisma migrate reset
```

This **drops** your dev database, re-applies every migration from scratch, and re-runs your seed script if you have one. Use it when your dev DB got into a weird state. Never run it in production.

### Regenerating just the client

```bash
npx prisma generate
```

This only regenerates `@prisma/client` from `schema.prisma`. No SQL runs. Use it when:

- You pulled new code from git that changed `schema.prisma`.
- Your editor is showing stale types.
- You edited `schema.prisma` but the migration already ran elsewhere.

### Commit migrations to git. Every time.

Migrations are source code. They must be committed alongside the schema change. If a teammate pulls your branch and their `schema.prisma` has a new field but `migrations/` does not have the matching folder, their `prisma migrate dev` will try to generate a fresh migration and the histories will diverge.

---

## 10. Prisma Studio — the GUI

```bash
npx prisma studio
```

This opens a browser at http://localhost:5555 with a spreadsheet-like view of every table in your database. You can:

- Browse rows.
- Edit any cell and save.
- Add new rows by clicking "Add record".
- Delete junk data.
- Filter and sort.

It is incredibly useful for debugging questions like:

- "Did my transaction actually get inserted?"
- "Why is this balance wrong — let me see the raw rows."
- "Let me add a test budget without building a UI for it first."

Run it in a separate terminal next to your dev server. No restarts needed when you change data.

---

## 11. The ownership rule (the invariant you must not break)

**Every protected query must include `userId` in its where clause.** This is the single most important security rule in the codebase.

```ts
// BAD — returns any user's transaction if the attacker knows the ID
const tx = await prisma.transaction.findUnique({ where: { id } });

// GOOD — only returns it if it belongs to the current user
const tx = await prisma.transaction.findFirst({
  where: { id, userId: r.userId },
});
```

The "bad" version looks innocent and works fine in testing (because you only test with your own data). But in production, it is a data leak. Any authenticated user can enumerate IDs and read other people's transactions.

For updates and deletes, use `updateMany` / `deleteMany` with `{ id, userId }` instead of `update` / `delete` with just `{ id }`. The `*Many` variants don't throw when no row matches, so they silently no-op if someone tries to mess with another user's data.

If you need a throwing version that also enforces ownership, do it in two steps:

```ts
const existing = await prisma.transaction.findFirst({
  where: { id, userId: r.userId },
});
if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

await prisma.transaction.update({ where: { id }, data: { ... } });
```

The `findFirst` acts as the auth gate; the `update` is safe because we already proved ownership.

---

## 12. Adding a new field — the checklist

Suppose you want to add a `reminderDate` to `Budget`. Here is the full end-to-end flow:

1. **Edit `prisma/schema.prisma`.** Add the field to the `Budget` model:
   ```prisma
   reminderDate DateTime?
   ```
2. **Create the migration.**
   ```bash
   npx prisma migrate dev --name add_budget_reminder_date
   ```
   This updates the DB, writes a new migration folder, and regenerates the client.
3. **Update the Zod validator** in `lib/validations.ts` so the API accepts the new field on create/update.
4. **Update the API route handler** (`app/api/budgets/route.ts` and similar) to pass the field through to `prisma.budget.create` / `update`.
5. **Update the UI panel** where budgets are created or edited to include an input for the new field.
6. **Update any display** that should now show the new field.
7. **Commit** the schema change, the migration folder, and the code changes in the same commit so the history is consistent.

Skipping any of these steps leaves you in a half-migrated state. The DB will have the column but the app won't use it, or the app will send the field but the API will drop it.

---

## 13. Graceful degradation for missing tables

Sometimes a page queries a table that doesn't exist yet on a stale database (for example, an older deployment that hasn't run the latest migration). Instead of hard-crashing the whole dashboard, we catch the specific Prisma error and return an empty result.

From `app/(app)/dashboard/page.tsx` lines 55-68:

```ts
async function safeGoalsQuery(userId: string) {
  try {
    return await prisma.savingsGoal.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      take: 3,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2021") {
      return [];
    }
    throw error;
  }
}
```

How to read this:

- `Prisma.PrismaClientKnownRequestError` is the error class Prisma throws for database errors it recognizes.
- `error.code === "P2021"` means "The table does not exist in the current database".
- When we see exactly that, we return `[]` so the rest of the page can still render.
- Any other error re-throws. We only swallow the specific case we understand.

Use this pattern for **non-critical widgets** (e.g., a dashboard tile for an optional feature). Never use it to hide real bugs on critical paths — you'll end up with silent data loss.

Other useful Prisma error codes to know:

| Code | Meaning |
| --- | --- |
| `P2002` | Unique constraint violation (e.g., duplicate email). |
| `P2003` | Foreign key constraint failed. |
| `P2025` | Record to update/delete not found. |
| `P2021` | Table does not exist. |

---

## 14. Common mistakes

| Mistake | Symptom | Fix |
| --- | --- | --- |
| Using `Float` for money | Rounding errors, `1.00 - 0.10 === 0.8999999...` | Use `Decimal @db.Decimal(14, 2)` |
| Forgetting `userId` in where | Users can read/edit each other's data | Always include `userId` on protected queries |
| Hand-editing an applied migration | `P3006` drift errors on deploy | Create a new migration instead |
| `findUnique` with non-unique where | Runtime error, TS won't always catch it | Use `findFirst` when the where isn't a unique index |
| Forgetting `include` then accessing a relation | `Cannot read property 'name' of undefined` | Add the relation to `include` in your query |
| Forgetting to `.toString()` a Decimal in a JSON response | Garbled number on the client | Map over results and convert before `NextResponse.json` |
| Not regenerating the client after schema change | "Property does not exist on type" in TS | Run `npx prisma generate` or restart your editor's TS server |
| Creating `new PrismaClient()` in a random file | Connection leaks in dev, crashes | Always `import { prisma } from "@/lib/prisma"` |
| Using `update({ where: { id } })` for delete/update without ownership | Users can mutate each other's data | Use `{ id, userId }` with `updateMany` / `deleteMany` |

---

## 15. Further reading

Other docs in this folder that pair well with this guide:

- [`EDGE_CASES_AND_RULES.md`](./EDGE_CASES_AND_RULES.md) — the invariants that span the whole app, including ownership and Decimal rules.
- [`REQUEST_FLOW.md`](./REQUEST_FLOW.md) — how a request travels from the browser through the API route into Prisma and back.
- [`ENV_AND_SETUP.md`](./ENV_AND_SETUP.md) — setting up `DATABASE_URL`, running the first migration, and troubleshooting connection issues.
- [`DEBUGGING_PLAYBOOK.md`](./DEBUGGING_PLAYBOOK.md) — what to do when a query explodes or a migration won't apply.

When in doubt: open `schema.prisma`, open the route file, and trace the exact query by hand. The generated client is just a typed wrapper — once you know the models and the ownership rule, the rest follows.
