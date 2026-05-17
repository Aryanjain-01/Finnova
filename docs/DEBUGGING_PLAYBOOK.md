# Finnova Debugging Playbook

A symptom-to-fix guide for the bugs and weird behaviors you will hit while building Finnova. Keep this open in a tab. When something breaks, search this file first.

This is written for a beginner on their first real full-stack project. It assumes you already read `ABSOLUTE_BASICS.md` and `REQUEST_FLOW.md`.

## Quick index

If you already have a symptom, jump straight in:

- Red API request in the Network tab -> **Section 3a** (HTTP status codes)
- Error in `npm run dev` terminal mentioning `Prisma` -> **Section 3b** (Prisma errors)
- VS Code full of red squiggles or a build error -> **Section 3c** (TypeScript and build)
- API is fine but the page is wrong -> **Section 3d** (React and UI)
- Login/logout doing strange things -> **Section 3e** (Auth weirdness)
- Tooling is being weird, nothing makes sense -> **Section 3f** (Dev server)
- No idea where to even start -> **Section 4** (step-by-step trace)

---

## 1. Debugging mindset: the first 60 seconds

Before you Google the error, do these four things in order. Most bugs die here.

1. **Read the error bottom-to-top.** Stack traces look scary, but the bottom line is usually the "what" and the top lines are the "where". Find the first line that points at a file in *your* project (not `node_modules`) and open it at that line number.
2. **Reproduce it minimally.** Can you make it happen with one click? Write down the exact steps. A bug you can reproduce is a bug you can fix.
3. **Check the obvious things.**
   - Did you save the file? (Ctrl+S)
   - Did the dev server restart after an env change? (env changes need a full restart)
   - Is Postgres running? (`docker compose ps` or check Docker Desktop)
   - Are you actually logged in? (open DevTools then Application then Cookies)
4. **Binary search the problem.** If you changed 40 lines and it broke, comment out half. Did it still break? The bug is in the other half. Repeat until you find the single line.

If you still don't know what's happening after these four steps, move on to Section 2.

---

## 2. Where to look: the 4 places

Every bug in Finnova lives in one of four places. Learn to open all four instantly.

| Place | What it tells you | How to open |
|---|---|---|
| **Browser Console** | JavaScript errors in the UI, `console.log` from client components, React warnings | F12 then Console tab |
| **Browser Network tab** | HTTP status codes, request payloads, response bodies from your API routes | F12 then Network tab, then click the request |
| **Terminal running `npm run dev`** | Server-side stack traces, Prisma errors, `console.log` from server components and API routes | The window where you ran `npm run dev` |
| **Database** | The actual rows. Are they what you think they are? | `npx prisma studio` opens a GUI at `localhost:5555` |

**Rule of thumb:**
- UI looks wrong but the data is right -> Console
- UI says "Something went wrong" after a click -> Network tab (find the red request)
- `npm run dev` terminal shows a red stack trace -> read it
- Everything looks fine but the number is wrong -> Prisma Studio, inspect the rows

### Reading a stack trace (worked example)

Here is a real-looking crash in the terminal:

```
PrismaClientKnownRequestError:
Invalid `prisma.transaction.create()` invocation in
C:\Users\mudit\Videos\Finnova\app\api\transactions\route.ts:125:40

  122   }
  123 }
  124
> 125 const created = await prisma.transaction.create({
  126   data: {
  127     userId: r.userId,
  128     accountId: data.accountId,

Foreign key constraint failed on the field: `Transaction_categoryId_fkey (index)`
    at In.handleRequestError (...\node_modules\@prisma\client\...)
    at ...
```

Read it like this:

1. **Bottom of the *message* block** (the line above the `at ...` spam): "Foreign key constraint failed on the field `Transaction_categoryId_fkey`". That is the actual problem.
2. **The file:line pointer**: `app\api\transactions\route.ts:125:40`. Open that file at line 125. That is *where* it happened.
3. **Skip the `at ...` lines** that reference `node_modules`. They are Prisma's own call stack, not your bug.
4. **Translate**: a foreign key on `categoryId` failed, meaning you passed a `categoryId` that does not exist in the `Category` table (or belongs to another user, but that was already caught earlier). Usually this means a stale value in the form state after a category was deleted in another tab.

That is the whole technique: find the *message*, find the *your-file* line, ignore the noise in between.

---

## 3. Symptom to fix

### 3a. HTTP status codes

When a request fails, open DevTools then Network, find the red/yellow row, click it, and look at the **Status** and the **Response** tab.

| Status | Likely cause | Fix |
|---|---|---|
| **401 Unauthorized** | You forgot `credentials: "include"` on the fetch, the session expired, or you are actually logged out. | Add `credentials: "include"` to your `fetch` call. See `components/transactions-panel.tsx:69` for the canonical shape. If you are logged in and still 401, check DevTools then Application then Cookies for a cookie starting with `authjs.session-token`. |
| **400 Validation failed** | The JSON you sent did not match the Zod schema. | Open the response body. You will see `{ error: "Validation failed", details: { fieldErrors: { amount: ["..."] } } }`. The `details` is the output of Zod's `.flatten()` (see `lib/validations.ts` and `app/api/transactions/route.ts:88`). Each key is a field, each array is the error messages. |
| **400 "Account not found"** | Ownership check failed. You sent an `accountId` that does not belong to this user. | Check `app/api/transactions/route.ts:94-98`. Every reference (accountId, toAccountId, categoryId) is re-checked against `userId`. Log the IDs you are sending and confirm they exist for the current user in Prisma Studio. |
| **400 "Category not found"** | Same as above, but for category. | See `app/api/transactions/route.ts:110-123`. Note: the category's `type` must also match the transaction's type (INCOME category for INCOME transaction). |
| **400 "Invalid JSON"** | You sent something that is not valid JSON, or forgot to `JSON.stringify(body)`. | Always do `body: JSON.stringify(data)` and set `headers: { "Content-Type": "application/json" }`. |
| **404 Not Found** | Wrong URL, or the route handler does not exist at that path. | In Next.js App Router, an API at `/api/foo/bar` lives at `app/api/foo/bar/route.ts`. Check the file exists and it exports `GET`, `POST`, etc. |
| **500 Internal Server Error** | Something blew up on the server. | Look at the terminal running `npm run dev`. There will be a red stack trace. The top of it is where the crash happened. |
| **Redirect loop / ERR_TOO_MANY_REDIRECTS** | Middleware is bouncing you between `/login` and `/dashboard`. | See `middleware.ts`. The matcher excludes `api`, `_next/static`, etc. If you added a new top-level folder (say `/public-foo`), the middleware may be treating it as protected. Check the `protectedPrefixes` array in `middleware.ts:4`. |

#### Quick example: reading a Zod error

```json
{
  "error": "Validation failed",
  "details": {
    "formErrors": [],
    "fieldErrors": {
      "amount": ["Expected number, received string"],
      "date": ["Invalid date"]
    }
  }
}
```

That tells you exactly two fields are wrong and exactly why. No guessing.

---

### 3b. Prisma errors

These show up in the terminal running `npm run dev`, prefixed with `PrismaClient`.

| Code | Message | What it means | Fix |
|---|---|---|---|
| **P1001** | "Can't reach database server at `localhost:5432`" | Postgres is not running. | `docker compose up -d` (or start Docker Desktop). Wait ~5 seconds. Retry. `auth.ts:18` catches this specifically and throws `DatabaseUnavailableError` so the login page can show a nice message. |
| **P1000** | "Authentication failed against database server" | Wrong username/password in `DATABASE_URL`. | Open `.env` and check `DATABASE_URL`. It should match the credentials in `docker-compose.yml`. |
| **P2021** | "The table `public.SavingsGoal` does not exist" | You have a model in `schema.prisma` but never ran the migration. | `npx prisma migrate dev --name add_that_thing`. The dashboard guards against this specific code in `app/(app)/dashboard/page.tsx:62-65` via `safeGoalsQuery` so it degrades to an empty list instead of crashing. |
| **P2002** | "Unique constraint failed on the fields: (`userId`, `categoryId`, `year`, `month`)" | You tried to insert a row that already exists. Common with budgets: one user can have only one budget per category per month. | Either update the existing row (use `upsert`) or delete the old one first. |
| **P2025** | "Record to update/delete does not exist" | The ID you sent is wrong, or the row was already deleted in another tab. | Reload the page. Check the ID in the URL/request against Prisma Studio. |
| **"Prisma client is outdated"** | TS errors like "Property `savingsGoal` does not exist on type `PrismaClient`" right after editing `schema.prisma`. | `npx prisma generate` regenerates the client from your schema. Then restart TS server in VS Code (Ctrl+Shift+P then "TypeScript: Restart TS Server"). |
| **P2003** | "Foreign key constraint failed" | You tried to reference an ID that does not exist in the parent table. | Check the ID is real in Prisma Studio. Common with stale form state after deletes. See the worked example in Section 2. |
| **"Environment variable not found: DATABASE_URL"** | Prisma cannot find `DATABASE_URL`. | Create/open `.env` in the project root. Add `DATABASE_URL="postgresql://..."`. Restart `npm run dev`. `.env.local` is *not* automatically read by Prisma CLI - use `.env`. |

#### When to use `upsert` vs `create`

If you see P2002 on a "create", you probably wanted an upsert. Example from budgets, which are unique per `(userId, categoryId, year, month)`:

```ts
await prisma.budget.upsert({
  where: {
    userId_categoryId_year_month: { userId, categoryId, year, month },
  },
  update: { limitAmount: new Prisma.Decimal(amount) },
  create: { userId, categoryId, year, month, limitAmount: new Prisma.Decimal(amount) },
});
```

`upsert` means: if it exists, update it; if not, create it. No P2002.

---

### 3c. TypeScript and build errors

| Symptom | Likely cause | Fix |
|---|---|---|
| Red squiggles everywhere the moment you touch `schema.prisma` | Prisma client is stale. | `npx prisma generate`. If squiggles persist, Ctrl+Shift+P then "TypeScript: Restart TS Server". |
| `Cannot find module '@/lib/prisma' or its type declarations` | Path alias is not resolving. | Check `tsconfig.json` has `"paths": { "@/*": ["./*"] }` under `compilerOptions`. Restart TS server. |
| `You're importing a component that needs useState. It only works in a Client Component...` | You used a React hook in a server component. | Add `"use client"` as the very first line of the file. See `components/transactions-panel.tsx:1`. |
| `Cannot use server-only code in a Client Component` | You imported `@/lib/prisma` or called `prisma.xxx` from inside a `"use client"` file. | Move the DB call into an API route (`app/api/.../route.ts`) or a server component, then `fetch` from the client. Client code cannot touch the database directly. |
| `Module not found: Can't resolve 'fs'` / `'path'` in a client bundle | Same thing: a server-only module leaked into a client component. | Trace the import chain. Something you imported imports something that imports `fs`. Break the chain by moving server code out of client files. |
| `Type 'Decimal' is not assignable to type 'string'` | You forgot to serialize a Prisma `Decimal` before sending it as JSON. | In your route handler: `amount: t.amount.toString()`. See `app/api/transactions/route.ts:64`. |

---

### 3d. React and UI weirdness

The API returned 200 but the UI is still wrong. These bugs live in the component.

| Symptom | Cause | Fix |
|---|---|---|
| Table does not update after adding/editing a row | You saved successfully but forgot to re-fetch the list. | Call `load()` again in the success path of your mutation. See the pattern in `components/transactions-panel.tsx:78` - `load` is wrapped in `useCallback` so you can call it imperatively after a save. |
| Infinite refetch loop (network tab shows requests every 100ms) | Your loader function is defined inside the component body without `useCallback`, so every render makes a new function, so the `useEffect` that depends on it fires again. | Wrap the loader in `useCallback` with the right dependency array. Example in `transactions-panel.tsx:78-97`. |
| Modal opens once but will not close | You forgot `setModalOpen(false)` in the success branch after save. | Add it right before or after `toast.success(...)`. Also check that `onClose` is actually wired to `setModalOpen(false)`. |
| State updates but UI does not re-render | You mutated state directly instead of creating a new array/object. `items.push(x)` does not trigger re-render. React compares by reference. | Use `setItems([...items, x])` or `setItems((prev) => [...prev, x])`. Never mutate state. |
| `Warning: You provided a 'value' prop to a form field without an 'onChange' handler` | Controlled input missing its handler. | Either add `onChange={(e) => setX(e.target.value)}` or switch to `defaultValue` for uncontrolled. |
| `Warning: Each child in a list should have a unique "key" prop` | You `.map()` over items without `key`. | Add `key={item.id}` to the top-level JSX element inside `.map()`. If there is no stable id, use the index only as a last resort. |
| Loading spinner is stuck forever | You called `setLoading(true)` at the start of the fetch but only `setLoading(false)` in the success branch. If the fetch errors, loading stays `true`. | Put `setLoading(false)` in a `finally` block, or in both branches. See `transactions-panel.tsx:93` for the pattern. |
| Dropdown is empty when the page first loads | You are rendering based on `accounts` before `loadLookups()` finishes. | Either show a loading skeleton, or render an empty option like `<option disabled>Loading...</option>`. |
| Date input shows "Invalid date" | The server returned an ISO string but you are feeding it to `<input type="date">` which wants `YYYY-MM-DD`. | `value={dateStr.slice(0, 10)}`. |
| Number shows as `123.4500000001` | Floating point rounding on `Decimal` -> `Number` conversion. | Format with `Intl.NumberFormat` as currency (see `transactions-panel.tsx:117`) or `.toFixed(2)` for display. Keep the raw string for edits. |
| `Hydration failed because the initial UI does not match` | You rendered something that differs between server and client, typically `new Date().toLocaleString()` or `Math.random()`. | Wrap the dynamic bit in a `useEffect` + state, or render it only after the component mounts. |
| Click goes through twice, two rows get created | You did not disable the Save button while the request was in flight. The user double-clicked. | `disabled={loading}` on the submit button, and set `loading = true` before the fetch, `false` in `finally`. |
| Toast appears but then the page looks empty | You called `load()` but it threw, `setLoading(false)` never ran, and `items` got cleared. | Wrap the reload in try/catch, or keep the stale list until the new one arrives. |

---

### 3e. Auth weirdness

NextAuth v5 is powerful but the failure modes are confusing. Here are the real ones.

| Symptom | Cause | Fix |
|---|---|---|
| You log in successfully, then immediately get bounced back to `/login` | Session cookie is missing or not being sent with the request. | Open DevTools then Application then Cookies for `http://localhost:3000`. You should see `authjs.session-token`. If it is missing, `AUTH_SECRET` is probably not set in `.env`, so NextAuth refuses to issue a cookie. Set it (any random 32+ char string) and restart. |
| "Invalid credentials" even though the password is correct | The password hash in the DB does not match. | Open Prisma Studio, look at your User row. `passwordHash` should look like `$2a$10$...` (bcrypt format). If it is plain text, the user was created wrong. The register route at `app/api/auth/register/route.ts` uses `bcrypt.hash(password, 10)` - verify yours does too. |
| After registering, the user exists in the DB but you are not logged in | The register route did not call `signIn()` after creating the user, or it redirected before the sign-in finished. | After `prisma.user.create(...)`, call `signIn("credentials", { email, password, redirect: false })` and then return a success response. The client then navigates to `/dashboard`. |
| Login page shows a banner like `database_unavailable` | Postgres is down. `auth.ts` specifically catches P1001 and P1000 and throws a typed `DatabaseUnavailableError` (see `auth.ts:14-16`) so the login page can detect it. | `docker compose up -d`, wait a few seconds, try again. |
| `CallbackRouteError` in the terminal with no useful info | NextAuth wraps every error from `authorize()` as `CallbackRouteError` by default, which hides the real cause. | We avoid this by throwing `DatabaseUnavailableError extends CredentialsSignin` in `auth.ts`. If you add a new auth error, make it extend `CredentialsSignin` with a unique `code` so the login page can distinguish it. |
| `middleware.ts` keeps redirecting `/` | You are logged out. The middleware sends `/` to `/login` when not authenticated (see `middleware.ts:25-27`). Expected behavior. | Log in, or if you want a public landing page, exclude it from the redirect in `middleware.ts`. |

---

### 3f. Dev server and tooling weirdness

Sometimes the code is fine but the tooling got confused.

| Symptom | Fix |
|---|---|
| Hot reload stopped working, changes do not appear | Kill `npm run dev` (Ctrl+C) and run it again. |
| Changes still not showing in browser | Hard refresh: Ctrl+Shift+R (or Ctrl+F5). This bypasses the browser cache. |
| `Error: listen EADDRINUSE: address already in use :::3000` | Another process (maybe an old `npm run dev` that did not die) is on port 3000. Kill it with Task Manager, or run on a different port: `set PORT=3001 && npm run dev` (Windows cmd) or `$env:PORT=3001; npm run dev` (PowerShell). |
| Random build errors like `ENOENT: .next/build-manifest.json` | The `.next` folder is corrupted. Delete it: `rmdir /s /q .next` on Windows, then `npm run dev`. |
| After switching git branches, nothing works and the errors make no sense | Nuke the cache: delete `.next` and `node_modules`, then `npm install`, then `npm run dev`. This takes 2 minutes and fixes 90% of ghost bugs. |
| VS Code shows errors that do not exist | Ctrl+Shift+P then "TypeScript: Restart TS Server". |
| `prisma generate` says it succeeded but TS still complains | Restart TS server (as above). The Prisma client is regenerated but VS Code is caching the old types. |
| You changed `.env` but the app still has the old values | Env vars are only read at startup. Restart `npm run dev`. |

---

## 4. The "step-by-step trace" technique

When nothing above matches your bug, fall back to this. It is slow but it *always* works.

Pick a request that is failing. Add a `console.log` at every hop. Whichever log stops appearing is where your bug lives.

For a "create transaction" flow, the hops are:

```tsx
// 1. In the component, when the user clicks Save
async function handleSave() {
  console.log("[1] button clicked", formData);

  // 2. Right before the fetch
  console.log("[2] sending fetch", JSON.stringify(formData));
  const res = await fetch("/api/transactions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(formData),
  });

  // 3. Right after the fetch
  console.log("[3] got response", res.status);
  const data = await res.json();
  console.log("[4] response body", data);
}
```

```ts
// app/api/transactions/route.ts
export async function POST(req: Request) {
  console.log("[5] route hit");

  const r = await requireUserId();
  if ("response" in r) return r.response;
  console.log("[6] auth ok, userId=", r.userId);

  const body = await req.json();
  console.log("[7] body parsed", body);

  const parsed = transactionCreateSchema.safeParse(body);
  console.log("[8] validation result", parsed.success);
  if (!parsed.success) {
    console.log("[8a] validation errors", parsed.error.flatten());
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  console.log("[9] about to write to DB");
  const created = await prisma.transaction.create({ data: { /* ... */ } });
  console.log("[10] DB write done", created.id);

  return NextResponse.json(created);
}
```

Now reproduce the bug and watch the console (steps 1-4) and the terminal (steps 5-10).

- If `[1]` does not appear: the button is not wired. Check your `onClick`.
- If `[2]` appears but `[3]` does not: the fetch never returned. Network is down or the server crashed mid-request.
- If `[3]` shows status 401: auth problem. See Section 3a.
- If `[5]` never appears in the terminal: the request never reached the server. The URL is wrong, or middleware redirected you.
- If `[7]` shows `undefined` or `{}`: the body was not sent. You forgot `JSON.stringify` or `Content-Type`.
- If `[8]` says `false`: Zod rejected your data. Look at `[8a]` to see why.
- If `[9]` appears but `[10]` does not: Prisma is hanging or threw. The next line in the terminal will be a red stack trace.

Whichever log is the last one you see, the bug is in the code between that log and the next one that should have appeared.

**Remove the logs when you are done.** Don't commit debug noise.

---

## 5. When to ask for help

Debugging builds the muscle. But you should *not* grind on a bug for six hours in silence. Ask for help when:

- You have checked all 4 places (Section 2) and still have no theory for what is wrong.
- You have tried 3 different fixes and all of them failed.
- You are about to run a command that you think might delete data and you are not sure what it does. **Stop.** Ask. Destructive commands include:
  - `npx prisma migrate reset` (wipes the database)
  - `git reset --hard` (throws away local changes)
  - `git push --force` (rewrites remote history)
  - `rm -rf` anything
  - `DROP TABLE` anything
- You found a fix by copy-pasting from Stack Overflow but you don't understand *why* it works. Ask for an explanation. If you don't understand it, you will hit the same bug again in a slightly different shape.

When you ask, bring:
1. The exact error message (copy-paste, don't retype).
2. What you expected to happen.
3. What actually happened.
4. What you already tried.

"It doesn't work" is not a bug report. "Clicking Save on the transaction form returns 400 with `fieldErrors.date = ['Invalid date']`, but the date input shows `2026-04-10`" is a bug report.

---

## 6. Keep this doc alive

This file is a **living document**. When you hit a new bug that was not in this playbook and you figure out the fix, add it.

Template for a new entry:

```markdown
| Symptom (what you saw) | Cause (why it happened) | Fix (what you did) |
|---|---|---|
| `some error message here` | You forgot X. | Do Y. See `path/to/file.ts:42`. |
```

A few guidelines for good entries:

- **Describe the symptom literally.** Write what you saw, not what it "really" meant. Future-you searches for the exact error string.
- **Link to the real file and line** when the fix lives in code. Line numbers drift, but they get you close.
- **No emoji, no fluff.** This doc is a tool, not a blog post.
- **Add the entry the same day you fixed the bug.** If you wait a week, you will forget the details.

Over time, this doc becomes the most valuable file in the project, because it is the one that was written by *you* for *your* specific environment and brain.

---

## Appendix: a cheat sheet of "just try this first" commands

When the project is in a weird state and you do not know why, these commands fix most problems. Run them in order. Stop as soon as things work again.

```bash
# 1. Is Postgres up?
docker compose ps
docker compose up -d

# 2. Regenerate the Prisma client from schema.prisma
npx prisma generate

# 3. Apply any pending migrations
npx prisma migrate dev

# 4. Restart the dev server
# (Ctrl+C the running one, then)
npm run dev

# 5. If TypeScript is still lying to you
# VS Code -> Ctrl+Shift+P -> "TypeScript: Restart TS Server"

# 6. Nuke Next.js build cache
rmdir /s /q .next    # Windows
# or
rm -rf .next          # macOS/Linux/git bash
npm run dev

# 7. Nuclear option - reinstall everything
rmdir /s /q .next node_modules
del package-lock.json
npm install
npm run dev
```

**Warning:** Do not run `npx prisma migrate reset`. That drops and recreates your database, wiping all your data. It is sometimes the right answer, but only when you are 100% sure you do not care about the local rows. Ask first if unsure.

---

## Related docs

- `docs/ABSOLUTE_BASICS.md` - how the stack fits together
- `docs/REQUEST_FLOW.md` - what happens from button click to DB and back
- `docs/EDGE_CASES_AND_RULES.md` - the invariants you must not break

Happy debugging. The bug is never as mysterious as it feels in the first 30 seconds.
