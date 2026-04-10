# TypeScript Essentials for Finnova

This is the TypeScript you need to read, understand, and contribute to Finnova. Not a full language tour — just the subset that actually shows up in this repo, grounded in real lines from real files.

If you have never written TypeScript before, you can still follow along. Every concept is tied to a snippet you can open in your editor right now.

---

## 1. What TypeScript is and why this project uses it

TypeScript is JavaScript with type labels plus a compile-time checker. You write almost the same code you would in JavaScript, but you also say things like "this variable is a string" or "this function returns a number". A tool called `tsc` (or the compiler built into Next.js) reads those labels and yells at you before you run anything if the labels do not line up.

Three concrete reasons this project uses it:

1. **Bugs are caught before you hit `npm run dev`.** Pass a `number` where a `string` is expected and your editor shows a red squiggle immediately.
2. **Autocomplete knows your data shapes.** Type `t.` on a transaction and your editor lists `amount`, `type`, `date`, `account`, etc. No guessing.
3. **Refactors stop being terrifying.** Rename a field in one place, every caller that is now broken lights up red.

One thing that confuses beginners: **the browser never sees your TypeScript.** Next.js compiles `.ts` and `.tsx` down to plain JavaScript before sending them to the browser. The types are a development-time safety net. They vanish at runtime.

---

## 2. Primitive types

The basic building blocks:

| Type | Example values |
|---|---|
| `string` | `"hello"`, `"INR"` |
| `number` | `0`, `3.14`, `1e12` |
| `boolean` | `true`, `false` |
| `null` | `null` |
| `undefined` | `undefined` |
| `bigint` | `123n` (rare here) |
| `symbol` | `Symbol("x")` (almost never here) |

### Literal types

A string value can itself be a type. `"INCOME"` is not just a value, it is also a type that contains exactly one string: `"INCOME"`. This sounds pedantic until you combine it with unions.

Real example from `lib/validations.ts:33`:

```ts
type: z.enum(["INCOME", "EXPENSE", "TRANSFER"]),
```

Zod generates a TypeScript type from this. The resulting type for `type` is:

```ts
"INCOME" | "EXPENSE" | "TRANSFER"
```

That is a union of three literal string types. Assigning `"FOO"` to a variable with that type is a compile error.

---

## 3. Arrays and objects

Arrays use either `T[]` or `Array<T>`. Both mean the same thing. This repo prefers `T[]`.

```ts
const names: string[] = ["Ada", "Linus"];
const totals: Array<number> = [1, 2, 3];
```

Object types describe the shape:

```ts
const point: { x: number; y: number } = { x: 1, y: 2 };
```

A `?` after a property name means "may not exist":

```ts
const user: { id: string; name?: string } = { id: "abc" };
```

Real example from `components/transactions-panel.tsx:22`:

```ts
type Tx = {
  id: string;
  amount: string;
  type: "INCOME" | "EXPENSE" | "TRANSFER";
  date: string;
  notes: string | null;
  tags: string | null;
  account: { id: string; name: string };
  toAccount: { id: string; name: string } | null;
  category: { id: string; name: string; type: string } | null;
};
```

Read it top to bottom: `id` is always a string. `amount` is a string (not a number, because `Prisma.Decimal` is serialized as a string over JSON). `type` is exactly one of three literal strings. `notes` is either a string or `null` — not optional, always present, but can be null. `account` is a nested object. `toAccount` is either an object or `null`, only populated for transfers.

The file also has two smaller aliases at `components/transactions-panel.tsx:34`:

```ts
type AccountOpt = { id: string; name: string; type: string };
type CategoryOpt = { id: string; name: string; type: string };
```

---

## 4. `type` vs `interface`

Both declare named object shapes. You can use either for 90% of cases in this repo.

| | `type` | `interface` |
|---|---|---|
| Object shapes | yes | yes |
| Unions (`A \| B`) | yes | no |
| Intersections (`A & B`) | yes | yes (via `extends`) |
| Primitive aliases | yes (`type ID = string`) | no |
| Declaration merging | no | yes |
| Used in this repo | almost always | almost never |

Finnova uses `type` throughout: `type Tx = { ... }` at `components/transactions-panel.tsx:22`, `type DashboardPageProps = { ... }` at `app/(app)/dashboard/page.tsx:36`, `type AccountOpt = ...` at `components/transactions-panel.tsx:34`. Stick with `type` unless you have a specific reason to use `interface`.

---

## 5. Union types (`|`)

A union type says "one of these". Read `|` as "or".

```ts
let status: "idle" | "loading" | "error" = "idle";
let maybe: string | null = null;
```

Real example from `components/transactions-panel.tsx:25`: `type: "INCOME" | "EXPENSE" | "TRANSFER";`. Typing `tx.type = "pending"` is a compile error.

### Narrowing a union

When you have `string | null`, you cannot call `.toUpperCase()` on it until you rule out `null`. TypeScript tracks this automatically using control flow. This is called **narrowing**.

```ts
function greet(name: string | null) {
  if (name === null) return "Hi stranger";
  // Inside this block, TS knows name is a string.
  return "Hi " + name.toUpperCase();
}
```

---

## 6. Intersection types (`&`)

`A & B` is "a value that is both an A and a B at once". Less common day-to-day than unions.

```ts
type WithId = { id: string };
type WithName = { name: string };
type Named = WithId & WithName; // { id: string; name: string }
```

You will see this mostly when combining component prop types, e.g. extending a library's props with your own.

---

## 7. Generics — types as parameters

A generic is a function or type that works over many types. Think of `T` as a placeholder that gets filled in when the code is used.

```ts
function first<T>(items: T[]): T | undefined {
  return items[0];
}

first([1, 2, 3]);       // T becomes number, returns number | undefined
first(["a", "b", "c"]); // T becomes string, returns string | undefined
```

You do not write generics very often in this project, but you **use** them constantly. The most common ones are `Array<T>`, `Promise<T>`, `Map<K, V>`, and `useState<T>`.

### Real example: useState

From `components/transactions-panel.tsx:41`:

```ts
const [items, setItems] = useState<Tx[]>([]);
```

Read that as: "items is a piece of React state whose type is `Tx[]`. It starts as an empty array." Why this matters: later you will write `items.map(t => t.amount)`, and your editor will autocomplete `t.amount` because TypeScript knows `t` is a `Tx`. Without the `<Tx[]>` generic, TypeScript would infer `never[]` from the empty initial value and nothing would work.

The same file uses it repeatedly: `useState<AccountOpt[]>([])`, `useState<CategoryOpt[]>([])`, `useState<Tx | null>(null)`.

### Real example: Promise return types

From `lib/finance.ts:31`:

```ts
export async function periodTotals(
  userId: string,
  start: Date,
  end: Date,
): Promise<{ income: number; expense: number }> {
```

The function is async, so it returns a `Promise`. The promise wraps an object with exactly two number fields. Anyone who calls this knows what to destructure without opening the file.

And from `lib/finance.ts:55`:

```ts
): Promise<{ categoryId: string | null; name: string; total: number }[]> {
```

Promise of an array of objects. Nested generics are normal.

---

## 8. Function types

A function type describes parameter types and return type.

```ts
function load(page: number): Promise<void> { /* ... */ }
const double = (x: number): number => x * 2;
```

### When to annotate the return type

TypeScript can usually **infer** the return type from the body, so you often do not have to annotate it. But three good reasons to do it anyway: it documents intent for readers, it prevents accidental drift in exported functions breaking callers silently, and in long functions it forces errors when the body returns the wrong thing. `lib/finance.ts` annotates every exported async function's return type. That is a good convention to follow.

---

## 9. React component types

In this project, a React component is a function that takes a props object and returns JSX. The props object is typed as a plain object type.

Real example from `app/(app)/layout.tsx:3`:

```tsx
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
```

`{ children }` destructures the props; `: { children: React.ReactNode }` is the props type. `React.ReactNode` means "anything React can render" — a string, number, JSX element, array of them, `null`, etc.

Another example from `components/transactions-panel.tsx:40`:

```tsx
export function TransactionsPanel({ currency }: { currency: string }) {
```

One prop, `currency`, a string. For larger prop sets, pull the type out into a named alias like `DashboardPageProps` in section 10.

---

## 10. Discriminated unions — the canonical pattern

This is the most important pattern in this codebase and the one you should spend the most time understanding.

Open `lib/api.ts`. The whole file is this function:

```ts
export async function requireUserId(): Promise<
  { userId: string } | { response: NextResponse }
> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { userId };
}
```

The return type is a union of two object shapes:

- `{ userId: string }` — the happy path, user is authenticated
- `{ response: NextResponse }` — the failure path, caller should return this response

Now look at how every API route uses it. From `app/api/transactions/route.ts:8`:

```ts
export async function GET(req: Request) {
  const r = await requireUserId();
  if ("response" in r) return r.response;

  // From here down, TS knows r is { userId: string }
  // ...
  const where: Prisma.TransactionWhereInput = { userId: r.userId };
```

Step by step: `r` starts as `{ userId: string } | { response: NextResponse }`, and you cannot access `r.userId` because TS is not sure it exists. `"response" in r` is a **type guard** — if true, TS narrows `r` to `{ response: NextResponse }` in that branch, and we return early. Below the `if`, TS narrows `r` to the other arm, so `r.userId` is now safe.

### Why this is better than `userId | null`

You could imagine a simpler `Promise<string | null>`. But then the caller has to remember to also build and return an error response. The discriminated union **makes it impossible to forget**. If you try to use `r.userId` without narrowing first, TypeScript stops you. If you ignore the error case entirely, the code does not compile.

The same pattern shows up in state: `type LoadState = { loading: true } | { loading: false; data: Tx[] }`. Now `data` only exists when `loading` is `false` — you cannot accidentally read it while the request is in flight. The codebase does not currently use this shape, but you will see it in React tutorials.

---

## 11. Type narrowing

Narrowing is how TypeScript tracks what you have checked. You already saw `"response" in r`. The other narrowing tools used in Finnova:

**`typeof` check:**

```ts
function format(x: string | number): string {
  if (typeof x === "string") return x.toUpperCase();
  return x.toFixed(2); // x is number here
}
```

**`instanceof` check.** Real example from `app/(app)/dashboard/page.tsx:55`:

```ts
async function safeGoalsQuery(userId: string) {
  try {
    return await prisma.savingsGoal.findMany({ /* ... */ });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2021") {
      return [];
    }
    throw error;
  }
}
```

Inside the `if`, TypeScript knows `error` is specifically a `Prisma.PrismaClientKnownRequestError`, which is why `error.code` is a valid field to read. Outside, it is still `unknown`.

**`in` check** at `app/api/transactions/route.ts:9`: `if ("response" in r) return r.response;`.

**Truthy check:** `if (user) { ... }` narrows `T | null | undefined` down to `T`. Watch out for falsy values you care about like `0` or `""`.

**`Array.isArray(data)`** narrows an unknown value to an array inside the block.

---

## 12. The `as` keyword — type assertion

`value as T` tells TypeScript "trust me, treat this as T". It is a promise, not a check — no runtime conversion happens.

Real example from `app/api/transactions/route.ts:19`:

```ts
const type = searchParams.get("type") as "INCOME" | "EXPENSE" | "TRANSFER" | null;
```

`searchParams.get(...)` returns `string | null` — TypeScript has no idea what values the query string contains. The author knows the API only accepts those three strings (or nothing), so they assert it. Notice the next line is still a runtime check: `if (type && ["INCOME", "EXPENSE", "TRANSFER"].includes(type))`. The assertion is not blind trust; it is paired with a validation step.

**`as any` is the nuclear option.** It throws away all type information. Almost never the right answer. If you are reaching for it, ask: can you narrow with `instanceof` or `typeof`? Can you define a proper type? Can you use `unknown` and parse the value?

**`as unknown as Foo` is a double-cast.** TypeScript sometimes refuses a direct assertion because the two types do not overlap enough, so people go through `unknown`. Treat this as a red flag — it means you are working around the type system, and usually the upstream types should be fixed instead.

---

## 13. `unknown` vs `any`

Both mean "I do not know the type". The difference:

- `any` lets you do anything. No checks, no errors. It is a black hole for type safety.
- `unknown` forces you to narrow before doing anything. You cannot call methods, access properties, or pass it to typed functions until TypeScript knows more.

Real example from `app/api/transactions/route.ts:78`:

```ts
let body: unknown;
try {
  body = await req.json();
} catch {
  return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
}

const parsed = transactionCreateSchema.safeParse(body);
if (!parsed.success) {
  return NextResponse.json(
    { error: "Validation failed", details: parsed.error.flatten() },
    { status: 400 },
  );
}

const data = parsed.data; // now fully typed
```

`req.json()` could return literally anything, so we type it as `unknown`. We do not touch it directly. Instead we hand it to Zod, which checks the shape at runtime and gives us back a fully-typed `data`. That is the correct pattern for any input from the outside world.

Rule of thumb: **if you are tempted to type something as `any`, use `unknown` and parse it.**

---

## 14. Non-null assertion `!`

`foo!.bar` tells TypeScript "I promise foo is not null or undefined, just let me through". Like `as`, no runtime check happens.

Real example from `app/api/transactions/route.ts:103`:

```ts
if (data.type === "TRANSFER") {
  const toAcc = await prisma.account.findFirst({
    where: { id: data.toAccountId!, userId: r.userId },
  });
```

`data.toAccountId` is typed as `string | null | undefined`. But the Zod schema (`transactionCreateSchema` in `lib/validations.ts:39`) has a `superRefine` that rejects a TRANSFER without a `toAccountId`. So by the time we are inside this `if`, we know it is present. The `!` says "Zod already checked, let me through".

**Treat the `!` as a red flag.** Every time you see one, ask: is there an earlier runtime check that guarantees this? If yes, the `!` is fine but could often be replaced with a proper narrowing. If no, the `!` is a bug waiting to happen.

---

## 15. Optional chaining `?.` and nullish coalescing `??`

`user?.name` returns `undefined` if `user` is `null` or `undefined`, otherwise `user.name`. You can chain several. From `app/(app)/dashboard/page.tsx:130`:

```ts
const firstName = user?.name?.split(" ")[0];
```

That handles three cases: `user` might be null (the `findUnique` could return null), `user.name` might be null (users can skip the name field), and only if both exist do we split.

`a ?? b` returns `a` unless it is `null` or `undefined`, in which case it returns `b`. From `app/api/transactions/route.ts:12`: `Number(searchParams.get("page") ?? "1")`. If `?page=...` was not in the URL, use `"1"`.

**Why not `||`?** `||` fires on any falsy value, including `0` and `""`. `??` only fires on `null` and `undefined`. That matters when `0` or `""` are valid values: `input ?? 10` when `input=0` gives `0` (correct), but `input || 10` gives `10` (wrong).

---

## 16. Zod + TypeScript: schemas as types

Zod is a runtime validation library. The trick this project leans on heavily is that **a Zod schema can produce a TypeScript type for free**. One source of truth, used for both the runtime validation step and the compile-time type.

Zod schemas live in `lib/validations.ts`. To get a TypeScript type out of any of them, use `z.infer`:

```ts
import { z } from "zod";
import { transactionCreateSchema } from "@/lib/validations";

type TransactionCreateInput = z.infer<typeof transactionCreateSchema>;
// { accountId: string; toAccountId?: string | null; amount: number;
//   type: "INCOME" | "EXPENSE" | "TRANSFER"; ... }
```

Why this matters: if you edit the schema (add a field, change a type), the TypeScript type updates automatically. Your frontend form and your backend route both break at compile time until they match the new shape. That is the good kind of breaking.

---

## 17. Prisma generated types

When you run `npx prisma generate`, Prisma reads `prisma/schema.prisma` and writes a fully-typed client into `node_modules/@prisma/client`. You get two things:

1. `prisma.<model>.findMany(...)` etc., all fully typed
2. A `Prisma` namespace with utility types for inputs and outputs

You will see this all over the API routes. Real example from `app/api/transactions/route.ts:23`:

```ts
const where: Prisma.TransactionWhereInput = { userId: r.userId };
```

`Prisma.TransactionWhereInput` is the exact type Prisma accepts for the `where` clause on a `Transaction` query. It includes every filter operator (`gte`, `lte`, `contains`, `in`, `OR`, ...) for every column. If you mistype a field name, TypeScript tells you.

Further down the same file, `where.date.gte` and `where.date.lte` are the known Prisma operators for `DateTime` columns — autocomplete lists them.

**Workflow note:** Prisma types are **generated**. They do not update until you run the generate step. If you edit `prisma/schema.prisma` and your editor starts complaining about fields that should exist, run `npx prisma generate`. This is the single most common "my code is correct but TypeScript is wrong" source.

---

## 18. Path aliases: `@/`

Instead of writing `../../../lib/prisma`, you can write `@/lib/prisma`. This is configured in `tsconfig.json:21`:

```json
"paths": {
  "@/*": ["./*"]
}
```

`@/` means "starting from the repo root". So `@/lib/prisma` is `<repo root>/lib/prisma.ts`, `@/components/ui/card` is `<repo root>/components/ui/card.tsx`, and so on.

Both Next.js and TypeScript read this config, so the aliases work in both the build and your editor. Always use `@/...` in this codebase. Never use deep relative imports.

---

## 19. Strict mode

Open `tsconfig.json:7` — `"strict": true`. That one flag turns on a bundle of strict-mode settings:

- `noImplicitAny` — variables and parameters must have a type, not silently become `any`
- `strictNullChecks` — `null` and `undefined` are their own types and must be handled explicitly
- `strictFunctionTypes` — stricter rules for function parameter compatibility
- `strictBindCallApply` — `.bind`, `.call`, `.apply` are type-checked
- `strictPropertyInitialization` — class fields must be initialized
- `useUnknownInCatchVariables` — caught errors are `unknown`, not `any`

Strict mode is the whole point of using TypeScript. Do not turn it off. If the compiler complains, the fix is in your code, not in `tsconfig.json`.

---

## 20. Common beginner mistakes

**Reaching for `any` when stuck.** TypeScript is yelling, you are tired, you type `as any` to make it go away. Almost always, there is a real fix: add a proper type alias, narrow with `typeof` or `instanceof`, use `unknown` and parse with Zod, or check that an upstream return type is correct.

**Forgetting to `await` an async function.**

```ts
const totals = periodTotals(userId, start, end);
// totals is Promise<{ income: number; expense: number }>, not the object!
totals.income; // error: no such field on Promise
```

Fix: `const totals = await periodTotals(userId, start, end);`. If you see `Promise<something>` in a type error where you expected the raw value, you forgot an `await`.

**useState inferring the wrong type from the initial value.**

```ts
const [items, setItems] = useState([]);
// items is inferred as never[], meaning "array of nothing"
setItems([{ id: "1", name: "Ada" }]); // error
```

Fix: pass the generic explicitly, e.g. `useState<User[]>([])`. Same idea for `useState<Tx | null>(null)`. The transactions panel does this throughout.

**Not running `npx prisma generate` after a schema change.** Your `prisma/schema.prisma` has a new field, your editor claims it does not exist, your code would run fine. Fix: `npx prisma generate`. The client types are stale.

**Importing server-only code from a client file (or vice versa).** Finnova has client components (with `"use client"` at the top, like `transactions-panel.tsx`) and server components / route handlers (without it). If you import `@/lib/prisma` or `@/auth` into a client component, Next.js will throw at build time. Rule of thumb: if the file starts with `"use client"`, it runs in the browser — fetch from the API instead.

---

## 21. Where to go next

- The official handbook is actually great for deeper questions: <https://www.typescriptlang.org/docs/handbook/intro.html>
- `docs/ABSOLUTE_BASICS.md` — if any of the JavaScript in these examples felt unfamiliar
- `docs/REACT_BASICS_FOR_THIS_PROJECT.md` — how props, state, and components fit together
- `docs/PRISMA_AND_DB.md` — more on Prisma's generated types and the schema workflow
- `docs/CODEBASE_EXPLAINED.md` — a tour of how the whole repo fits together

Read the real files in this repo with these patterns in mind. Every concept above is in there, used for real reasons. That is the fastest way to make the ideas stick.
