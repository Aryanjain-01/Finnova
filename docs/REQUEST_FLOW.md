# Request Flow — Tracing Real Requests

This doc walks through three common actions and shows you **every file that runs** when they happen. If you can follow these three, you can debug almost anything.

---

## Flow 1: Logging in

**Goal:** understand how the browser goes from a login form to a session cookie.

### Files involved
- `app/(auth)/login/page.tsx` — the login form
- `auth.ts` — NextAuth config with the Credentials provider
- `app/api/auth/[...nextauth]/route.ts` — NextAuth's built-in handler
- `middleware.ts` — redirects after login
- `lib/prisma.ts` — DB client

### Step by step

1. **User opens `/login`.** `middleware.ts` sees them hitting `/login`, they're **not** logged in, so it lets them through.

2. **Form renders.** `app/(auth)/login/page.tsx` shows the email/password form.

3. **User submits.** The form calls NextAuth's `signIn("credentials", { email, password, redirect: ... })` (or posts to NextAuth's login endpoint). That triggers `app/api/auth/[...nextauth]/route.ts`, which is a re-export of the NextAuth handlers defined in `auth.ts`.

4. **NextAuth runs `authorize`.** Look at `auth.ts:34`. It:
   ```ts
   const parsed = credentialsSchema.safeParse(credentials);
   if (!parsed.success) return null;
   const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
   if (!user) return null;
   const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
   if (!ok) return null;
   return { id: user.id, email: user.email, name: user.name ?? undefined };
   ```

5. **JWT callback runs.** `auth.ts:63` — stores the user ID in `token.sub`.

6. **Session cookie is set.** Since `session.strategy === "jwt"`, NextAuth encrypts the token and writes it to an HTTP-only cookie. No data is stored server-side.

7. **Client gets redirected.** Usually to `/dashboard` or the `callbackUrl` the form specified.

8. **Middleware sees the next request.** `middleware.ts:8` — `loggedIn = !!req.auth` is now `true`, so hitting `/dashboard` is allowed through. If the user instead tried to hit `/login` again, they'd get redirected to `/dashboard`.

### What can go wrong

| Symptom | Likely cause | Where to look |
|---|---|---|
| "Invalid credentials" with right password | `bcrypt.compare` failing — the stored hash doesn't match | Check user was created via `bcrypt.hash` (register flow), not plain text |
| Infinite redirect loop | Middleware matches something it shouldn't | `middleware.ts` matcher |
| `database_unavailable` thrown | Postgres is down or `DATABASE_URL` wrong | `docker compose up -d`, check `.env` |

---

## Flow 2: Adding a transaction (the full stack round-trip)

**Goal:** understand what happens when a user opens the add-transaction modal, fills it in, and clicks Save.

This is **the** flow to understand in this app. Every other mutation is a variation.

### Files involved
- `components/transactions-panel.tsx` — form state, fetch call
- `app/api/transactions/route.ts` — `POST` handler
- `lib/api.ts` — `requireUserId()`
- `lib/validations.ts` — `transactionCreateSchema`
- `lib/prisma.ts` → `prisma/schema.prisma` — `Transaction` model

### Step by step

#### Client side (`components/transactions-panel.tsx`)

1. **User clicks "Add transaction".** The button has `onClick={() => { setEditing(null); setModalOpen(true); }}`. Modal opens.

2. **User fills the form.** Each input is a **controlled input**:
   ```tsx
   <input value={amount} onChange={(e) => setAmount(e.target.value)} />
   ```
   Every keystroke updates state.

3. **User clicks Save.** The submit handler does something like:
   ```ts
   const res = await fetch("/api/transactions", {
     method: "POST",
     credentials: "include",
     headers: { "Content-Type": "application/json" },
     body: JSON.stringify({
       accountId, toAccountId, categoryId, amount, type, date, notes, tags,
     }),
   });
   const data = await res.json();
   if (!res.ok) {
     toast({ title: "Could not save", description: data.error, variant: "error" });
     return;
   }
   toast({ title: "Saved" });
   setModalOpen(false);
   await load();  // re-fetch the table
   ```

#### Server side (`app/api/transactions/route.ts:74`, the `POST`)

4. **Auth gate.**
   ```ts
   const r = await requireUserId();
   if ("response" in r) return r.response;  // → 401 if no session
   ```
   That helper lives in `lib/api.ts:4` and reads the NextAuth session via `await auth()`.

5. **Parse JSON.**
   ```ts
   let body: unknown;
   try { body = await req.json(); }
   catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
   ```
   Malformed JSON gets a 400 instead of a crash.

6. **Validate with Zod.**
   ```ts
   const parsed = transactionCreateSchema.safeParse(body);
   if (!parsed.success) {
     return NextResponse.json(
       { error: "Validation failed", details: parsed.error.flatten() },
       { status: 400 },
     );
   }
   ```
   `transactionCreateSchema` (in `lib/validations.ts:39`) enforces:
   - `amount > 0` and reasonably bounded
   - `type` is one of INCOME/EXPENSE/TRANSFER
   - `date` is a valid date
   - `notes` ≤ 2000 chars, `tags` ≤ 500 chars
   - If `type === "TRANSFER"`: `toAccountId` is present **and** different from `accountId`

7. **Ownership check — source account.**
   ```ts
   const account = await prisma.account.findFirst({
     where: { id: data.accountId, userId: r.userId },
   });
   if (!account) return NextResponse.json({ error: "Account not found" }, { status: 400 });
   ```
   Without this, a user could submit somebody **else's** `accountId` and write to their data. The `userId` in the `where` clause is what stops them.

8. **Ownership check — destination account (if transfer).** Same shape.

9. **Ownership + type check — category (if provided).**
   ```ts
   if (data.categoryId) {
     const cat = await prisma.category.findFirst({ where: { id: data.categoryId, userId: r.userId } });
     if (!cat) return NextResponse.json({ error: "Category not found" }, { status: 400 });
     if (data.type === "INCOME" && cat.type !== "INCOME")
       return NextResponse.json({ error: "Category must be an income category" }, { status: 400 });
     if (data.type === "EXPENSE" && cat.type !== "EXPENSE")
       return NextResponse.json({ error: "Category must be an expense category" }, { status: 400 });
   }
   ```
   Prevents tagging an expense as a "Salary" (income) category or vice versa.

10. **Write.**
    ```ts
    const created = await prisma.transaction.create({
      data: {
        userId: r.userId,
        accountId: data.accountId,
        toAccountId: data.type === "TRANSFER" ? data.toAccountId : null,
        categoryId: data.type === "TRANSFER" ? null : data.categoryId ?? null,
        amount: new Prisma.Decimal(data.amount),
        type: data.type,
        date: data.date,
        notes: data.notes ?? null,
        tags: data.tags ?? null,
      },
      include: { account: true, toAccount: true, category: true },
    });
    ```
    Notice: transfers ignore `categoryId` even if the client sent one. The server is the source of truth.

11. **Normalize the response.** The response stringifies `amount` (because `Decimal` isn't JSON-serializable as a number you can trust) and flattens the related records to `{ id, name }`:
    ```ts
    return NextResponse.json({
      ...created,
      amount: created.amount.toString(),
      account: { id: created.account.id, name: created.account.name },
      toAccount: created.toAccount ? { id: created.toAccount.id, name: created.toAccount.name } : null,
      category: created.category ? { id: created.category.id, name: created.category.name, type: created.category.type } : null,
    });
    ```

#### Back on the client

12. **`res.json()` returns the created record.** The panel closes the modal, shows a success toast, and calls `load()`.

13. **`load()` re-fetches `/api/transactions?...`**, which runs the `GET` handler (different code, same file). The table re-renders with the new row at the top.

### Where beginners trip up

- **"Why does the table not update?"** You forgot to call `load()` after saving. Creating a record on the server doesn't automatically re-fetch the list.
- **"Why am I getting 401?"** You forgot `credentials: "include"` in the fetch (or you're not logged in).
- **"Why does Zod say invalid?"** Open the browser **Network** tab → click the failing request → look at the `details` field in the response. Zod's `.flatten()` gives you per-field errors.

---

## Flow 3: Loading the dashboard

**Goal:** understand a **server component** that fetches data directly from the database — no fetch calls needed.

### Files involved
- `app/(app)/dashboard/page.tsx`
- `lib/finance.ts`
- `lib/insights.ts`
- `components/dashboard-charts.tsx`
- `components/ui/*`

### Step by step

1. **User navigates to `/dashboard`.**

2. **Middleware.** `middleware.ts` sees `/dashboard` is protected. If logged out, redirects to `/login`. Otherwise continues.

3. **Next.js matches `app/(app)/dashboard/page.tsx`.** Because it's a server component (no `"use client"`), Next.js runs it **on the server**.

4. **Session check.**
   ```ts
   const session = await auth();
   if (!session?.user?.id) redirect("/login");
   const userId = session.user.id;
   ```
   Belt-and-suspenders: middleware already blocked logged-out users, but the page checks again.

5. **Parse query params.** URL is something like `/dashboard?year=2026&month=4`:
   ```ts
   const params = (await searchParams) ?? {};
   const year = clampInt(params.year, now.getFullYear(), 2000, 2100);
   const month = clampInt(params.month, now.getMonth() + 1, 1, 12);
   const { start, end } = monthBounds(year, month);
   ```
   `clampInt` falls back to the current date if the value is missing, non-numeric, or out of range. Defensive.

6. **Parallel data fetch.** Five calls at once:
   ```ts
   const [curTotals, breakdown, trends, goals, { accounts, balances }] = await Promise.all([
     periodTotals(userId, start, end),
     categoryBreakdown(userId, start, end),
     monthlyTrends(userId, 12, new Date(year, month - 1, 1)),
     safeGoalsQuery(userId),
     computeAccountBalances(userId),
   ]);
   ```
   `Promise.all` is the trick — if you awaited these sequentially you'd wait for each one; in parallel they all run at once and the page is ~5× faster.

7. **`safeGoalsQuery` — a graceful-degradation pattern.** If the `SavingsGoal` table doesn't exist yet (`P2021`), return `[]` instead of crashing the whole page:
   ```ts
   try { return await prisma.savingsGoal.findMany({ where: { userId }, ... }); }
   catch (error) {
     if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2021") return [];
     throw error;
   }
   ```
   This pattern is worth remembering — some errors are "expected in certain environments" and shouldn't take the page down.

8. **Computations.**
   ```ts
   const income = curTotals.income;
   const expense = curTotals.expense;
   const net = income - expense;
   const savingsRate = income > 0 ? net / income : 0;
   const topCategories = [...breakdown].sort((a, b) => b.total - a.total).slice(0, 5);
   ```

9. **Previous month comparison.** A second `periodTotals` call to compute deltas.

10. **Insights.** `generateInsights(userId)` from `lib/insights.ts`.

11. **Render.** The component returns a JSX tree of `<Card>`, `<StatTile>`, `<TrendsArea>`, `<NetWorthBar>`, `<CategoryDonut>`, `<Progress>` etc. — all passing the pre-computed data down as props.

12. **Next.js ships HTML to the browser.** The user sees the page. The only JavaScript that ships is the client components (`dashboard-charts.tsx` and friends) that need to be interactive. Everything else stays on the server.

### Why this matters

Compare Flow 2 and Flow 3:

| | Flow 2 (transactions panel) | Flow 3 (dashboard) |
|---|---|---|
| Component type | Client (`"use client"`) | Server |
| Data fetch | `fetch("/api/...")` from the browser | `prisma.xxx()` directly on the server |
| Auth check | `requireUserId()` in API route | `await auth()` in the page |
| When does data load? | After the page loads, via `useEffect` | Before the page loads, during SSR |
| Good for | Highly interactive UI | Dashboards, reports, anything read-heavy |

**Rule of thumb:** start with a server component. Only switch to client + fetch when you need interactivity (filters, modals, optimistic updates).

---

## How to debug any request

When something's wrong, go in this exact order:

1. **Browser DevTools → Console.** Red errors first. JavaScript errors blow up before anything else can happen.
2. **Browser DevTools → Network.** Find the failing request. Check:
   - **Status code** — 401 means auth, 400 means validation, 500 means server crash
   - **Request payload** — is what you're sending what you think you're sending?
   - **Response body** — Zod errors live in `details` as per-field arrays
3. **Terminal running `npm run dev`.** Server-side errors print here with full stack traces.
4. **`prisma/schema.prisma`.** If the error mentions an unknown column or P2021 (table missing), you need `npx prisma migrate dev`.
5. **`lib/validations.ts`.** If validation is rejecting what looks like valid input, open the schema and check the rule.
6. **The route handler.** Read it top to bottom. Look for the specific line that returned an error.

99% of bugs are caught by steps 1–3.

---

## What you should be able to do after reading this

- Open any feature and trace a button click → fetch → route → Prisma → response → UI update.
- Know where to set a breakpoint (or a `console.log`) when something goes wrong.
- Explain to someone why this app has three layers of auth checks (middleware, page, API).
- Tell the difference between a server and a client component and know when to use which.

When you can do all four, you're no longer a beginner in this codebase.
