# Adding a Feature: A Full Walkthrough

This doc walks you through adding a real feature to Finnova from start to finish. Every full-stack feature in this app follows the same shape: database, validation, API route, Prisma query, React component, UI. Once you do it once, the rest of the codebase stops feeling intimidating.

**The feature:** Let users mark accounts as favorites. Add a `favorite` boolean to `Account`, thread it through the API, and show a star next to favorited accounts in the accounts panel.

This is a small feature on purpose. It touches every layer without drowning you in edge cases. Read the whole thing top-to-bottom the first time — don't skip phases.

---

## Phase 0: Think it through first

Before you touch a single file, slow down for five minutes.

**What you're building.** A new boolean column on `Account` called `favorite`. Users can toggle it from the accounts panel. Favorited accounts get a star icon next to their name.

**Why.** Users with many accounts want a way to pin the ones they use most. It's also a clean excuse to practice the full stack loop.

**Layers you will touch** (tick them off mentally):

- [ ] `prisma/schema.prisma` — add the column
- [ ] Run a migration
- [ ] `lib/validations.ts` — let the Zod schema accept `favorite`
- [ ] `app/api/accounts/route.ts` — POST handler passes `favorite` to Prisma
- [ ] `app/api/accounts/[id]/route.ts` — PATCH handler passes `favorite` to Prisma
- [ ] `components/accounts-panel.tsx` — read `favorite`, render star, add toggle button
- [ ] Manual smoke test

**Blast radius.** Small. You are adding a column with a default value, so existing rows are fine. No existing code reads `favorite` today, so nothing downstream breaks. The main risk is forgetting to regenerate the Prisma client, which will show up as TypeScript errors.

**Create a branch first.** Never work on `main` for feature work.

```bash
git switch -c feat/account-favorites
```

If you get `fatal: a branch named 'feat/account-favorites' already exists`, either delete the old one (`git branch -D feat/account-favorites`) or pick a new name.

---

## Phase 1: Database schema

Open `prisma/schema.prisma`. Find the `Account` model. Right now it looks like this:

```prisma
model Account {
  id        String          @id @default(cuid())
  userId    String
  user      User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  name      String
  type      AccountTypeEnum
  currency  String          @default("INR")
  archived  Boolean         @default(false)
  createdAt DateTime        @default(now())
  updatedAt DateTime        @updatedAt

  transactions Transaction[] @relation("AccountTx")
  transfersIn  Transaction[] @relation("TransferIn")
  recurring    RecurringTransaction[] @relation("RecurringAccount")
}
```

Add one line. The diff looks like this:

```diff
 model Account {
   id        String          @id @default(cuid())
   userId    String
   user      User            @relation(fields: [userId], references: [id], onDelete: Cascade)
   name      String
   type      AccountTypeEnum
   currency  String          @default("INR")
   archived  Boolean         @default(false)
+  favorite  Boolean         @default(false)
   createdAt DateTime        @default(now())
   updatedAt DateTime        @updatedAt
```

The `@default(false)` matters. Without it, the migration would fail on a database with existing rows because the new column would be non-nullable with no value for old rows.

Now generate and run the migration:

```bash
npx prisma migrate dev --name add_account_favorite
```

What that command does, step by step:

1. Diffs your edited `schema.prisma` against the current DB state.
2. Writes a new SQL migration file under `prisma/migrations/<timestamp>_add_account_favorite/migration.sql`.
3. Runs that SQL against your dev database.
4. Regenerates the Prisma client so TypeScript knows about the new field.

Peek at the generated SQL. It should look roughly like this:

```sql
-- AlterTable
ALTER TABLE "Account" ADD COLUMN "favorite" BOOLEAN NOT NULL DEFAULT false;
```

If you open VS Code and see red squiggles on `prisma.account.*` calls, run `npx prisma generate` to force a client regen. This sometimes happens if the TypeScript server is caching the old types.

Commit the schema and migration together:

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(db): add favorite flag to Account"
```

---

## Phase 2: Validation

Validation lives in `lib/validations.ts`. This is the source of truth for "what the API will accept." The rule: update Zod before you touch the route. If the schema doesn't allow it, the route can't use it, and the front end will get a 400.

Find `accountCreateSchema`:

```ts
export const accountCreateSchema = z.object({
  name: z.string().min(1).max(120),
  type: z.enum(["CASH", "BANK", "CARD", "OTHER"]),
  currency: z.string().length(3).optional(),
});
```

Add the field:

```diff
 export const accountCreateSchema = z.object({
   name: z.string().min(1).max(120),
   type: z.enum(["CASH", "BANK", "CARD", "OTHER"]),
   currency: z.string().length(3).optional(),
+  favorite: z.boolean().optional(),
 });
```

`accountUpdateSchema` is defined like this:

```ts
export const accountUpdateSchema = accountCreateSchema.partial().extend({
  archived: z.boolean().optional(),
});
```

Because it calls `.partial()` on `accountCreateSchema`, it automatically picks up the new `favorite` field as optional. You don't need to touch it. That is the upside of building update schemas on top of create schemas.

Commit:

```bash
git add lib/validations.ts
git commit -m "feat(validation): accept favorite on account schemas"
```

---

## Phase 3: API route

Two files to edit: the collection route and the single-resource route.

### 3a. POST handler

Open `app/api/accounts/route.ts`. The POST handler currently looks like this:

```ts
export async function POST(req: Request) {
  const r = await requireUserId();
  if ("response" in r) return r.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = accountCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const account = await prisma.account.create({
    data: {
      userId: r.userId,
      name: parsed.data.name,
      type: parsed.data.type,
      currency: parsed.data.currency ?? "INR",
    },
  });

  return NextResponse.json({ ...account, balance: 0 });
}
```

Thread `favorite` through the Prisma create:

```diff
   const account = await prisma.account.create({
     data: {
       userId: r.userId,
       name: parsed.data.name,
       type: parsed.data.type,
       currency: parsed.data.currency ?? "INR",
+      favorite: parsed.data.favorite ?? false,
     },
   });
```

The `?? false` is defensive — the column has a DB default, but being explicit is safer and cheaper than debugging later.

Notice what you did **not** have to change:

- `requireUserId()` still runs. Auth is untouched.
- The Zod check is unchanged because the schema already allows the field.
- The GET handler needs no change. `computeAccountBalances` already returns the full `Account` row (look at the mapped object — Prisma `findMany` selects all columns by default, and the mapped response currently lists specific fields). **You do need to add `favorite` to the mapped shape so it reaches the client.** Update the GET like this:

```diff
   return NextResponse.json(
     accounts.map((a) => ({
       id: a.id,
       userId: a.userId,
       name: a.name,
       type: a.type,
       currency: a.currency,
       archived: a.archived,
+      favorite: a.favorite,
       createdAt: a.createdAt,
       updatedAt: a.updatedAt,
       balance: balances.get(a.id) ?? 0,
     })),
   );
```

This is a good lesson: Prisma gives you the full row, but the route explicitly shapes the response. If you add a column and don't add it here, the front end never sees it. Check how each route shapes its response before assuming new columns flow through.

### 3b. PATCH handler

Open `app/api/accounts/[id]/route.ts`. The PATCH already passes `parsed.data` straight through to `prisma.account.update`:

```ts
const account = await prisma.account.update({
  where: { id },
  data: parsed.data,
});
```

Because `accountUpdateSchema` already allows `favorite`, this just works. No code change needed in the handler body. You only need to make sure the response shape includes it if you ever strip fields in the future — right now the handler spreads the full Prisma row, so you're fine:

```ts
return NextResponse.json({ ...account, balance: balances.get(account.id) ?? 0 });
```

### 3c. Quick smoke test from the terminal

Start the dev server in another terminal (`npm run dev`). Then:

```bash
curl -X POST http://localhost:3000/api/accounts \
  -H "Content-Type: application/json" \
  -b "authjs.session-token=YOUR_SESSION_COOKIE" \
  -d '{"name":"Test Fav","type":"BANK","favorite":true}'
```

You should see the new account in the response with `"favorite": true`. If you get 401, your cookie is wrong — easier to use Thunder Client or the browser devtools console:

```js
await fetch("/api/accounts", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  credentials: "include",
  body: JSON.stringify({ name: "Test Fav", type: "BANK", favorite: true }),
}).then((r) => r.json());
```

Commit:

```bash
git add app/api/accounts
git commit -m "feat(api): persist and return account favorite flag"
```

---

## Phase 4: Frontend — reading

Open `components/accounts-panel.tsx`. This is the component that lists accounts on the Accounts page.

At the top there is a local type used to render each row:

```ts
type AccountRow = {
  id: string;
  name: string;
  type: "CASH" | "BANK" | "CARD" | "OTHER" | string;
  currency: string;
  archived: boolean;
  balance: number;
};
```

Add `favorite`:

```diff
 type AccountRow = {
   id: string;
   name: string;
   type: "CASH" | "BANK" | "CARD" | "OTHER" | string;
   currency: string;
   archived: boolean;
+  favorite: boolean;
   balance: number;
 };
```

Now render a star next to favorited accounts. There is no `StarIcon` in `components/ui/icons.tsx` today. You have two options:

1. **Quick fallback.** Use the text character `★` (U+2605). This is fine for a first pass.
2. **Add a proper SVG icon.** Open `components/ui/icons.tsx` and add a `StarIcon` using the same `makeIcon` helper the other icons use. Use it like the other icons.

For this walkthrough, go with option 1 first. Find the active account card render, around the section where `a.name` and `a.type` are shown:

```tsx
<div>
  <div className="text-sm font-semibold text-foreground">{a.name}</div>
  <div className="text-xs uppercase tracking-wider text-muted-foreground">
    {a.type}
  </div>
</div>
```

Add a star before or after the name when `favorite` is true:

```diff
 <div>
-  <div className="text-sm font-semibold text-foreground">{a.name}</div>
+  <div className="flex items-center gap-1 text-sm font-semibold text-foreground">
+    {a.favorite ? (
+      <span aria-label="Favorite" title="Favorite" className="text-warning">
+        ★
+      </span>
+    ) : null}
+    <span>{a.name}</span>
+  </div>
   <div className="text-xs uppercase tracking-wider text-muted-foreground">
     {a.type}
   </div>
 </div>
```

`aria-label` matters. Screen readers will announce "Favorite" instead of a meaningless star character. If you skip this, your UI is inaccessible.

Commit:

```bash
git add components/accounts-panel.tsx
git commit -m "feat(ui): show star on favorited accounts"
```

---

## Phase 5: Frontend — writing

Now let the user toggle the flag.

### 5a. Add a checkbox in the create form

Inside the `<form onSubmit={addAccount}>` block in `accounts-panel.tsx`, add state and a checkbox.

```diff
   const [name, setName] = useState("");
   const [type, setType] = useState<"CASH" | "BANK" | "CARD" | "OTHER">("BANK");
+  const [favorite, setFavorite] = useState(false);
   const [error, setError] = useState<string | null>(null);
```

Update the POST body so it sends the flag:

```diff
     const res = await fetch("/api/accounts", {
       method: "POST",
       headers: { "Content-Type": "application/json" },
       credentials: "include",
-      body: JSON.stringify({ name, type }),
+      body: JSON.stringify({ name, type, favorite }),
     });
```

Reset `favorite` after success:

```diff
     setName("");
+    setFavorite(false);
     void load();
```

Add the checkbox to the form JSX, right above the Add button:

```tsx
<label className="flex items-center gap-2 text-sm text-foreground">
  <input
    type="checkbox"
    checked={favorite}
    onChange={(e) => setFavorite(e.target.checked)}
  />
  Mark as favorite
</label>
```

The important bit: `e.target.checked` is a real JavaScript boolean. That's what your Zod schema expects (`z.boolean().optional()`). If you accidentally pass `"true"` as a string, Zod will reject it with a 400.

### 5b. Add a toggle button on each card

Near the existing `Archive` button, add a second button that PATCHes the favorite flag. First, add the handler near `toggleArchive`:

```tsx
async function toggleFavorite(a: AccountRow) {
  const res = await fetch(`/api/accounts/${a.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ favorite: !a.favorite }),
  });
  if (res.ok) {
    await load();
    toast({
      title: a.favorite ? "Removed from favorites" : "Marked as favorite",
      variant: "success",
    });
  }
}
```

Three things to notice:

1. `credentials: "include"` — without it, the session cookie is not sent and the route returns 401.
2. `method: "PATCH"` — matches the handler in `app/api/accounts/[id]/route.ts`.
3. `await load()` — forces a re-fetch so the UI shows the updated state. If you forget this, the star won't appear until the user refreshes the page.

Wire the button into the card JSX, next to the Archive button:

```diff
 <div className="mt-4 flex justify-end">
+  <Button variant="ghost" size="sm" onClick={() => void toggleFavorite(a)}>
+    {a.favorite ? "Unfavorite" : "Favorite"}
+  </Button>
   <Button variant="ghost" size="sm" onClick={() => void toggleArchive(a)}>
     Archive
   </Button>
 </div>
```

Commit:

```bash
git add components/accounts-panel.tsx
git commit -m "feat(ui): toggle account favorite from panel"
```

---

## Phase 6: Manual test checklist

Run through every one of these before opening a PR. Do not skip any.

- [ ] `npm run dev` starts cleanly with no TypeScript errors in the terminal
- [ ] Visit `/accounts` — existing accounts still render correctly
- [ ] Create a new account with "Mark as favorite" checked — it appears in the list with a star
- [ ] Create another account without the checkbox — no star
- [ ] Click "Favorite" on a non-favorited account — star appears, toast shows "Marked as favorite"
- [ ] Click "Unfavorite" on a favorited account — star disappears, toast shows "Removed from favorites"
- [ ] Refresh the page — favorites persist (they came from the DB, not local state)
- [ ] Open DevTools Network tab, click the toggle, confirm the PATCH request returns 200 and the response body contains `"favorite": true` (or `false`)
- [ ] Log out, register a second user, log in — that user's accounts list does not show favorites from the first user. This proves `requireUserId()` is still scoping correctly
- [ ] Try sending a bad payload from DevTools console: `fetch("/api/accounts", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ name: "X", type: "BANK", favorite: "yes" }) })` — the API should return 400 with validation details

If any of these fail, stop and fix before continuing. A broken checklist item now is ten times cheaper to fix than after review.

---

## Phase 7: Lint and ship

Run lint:

```bash
npm run lint
```

Fix any warnings. Unused imports (from that star icon you imagined adding earlier) are the most common thing here.

Push the branch:

```bash
git push -u origin feat/account-favorites
```

The `-u` sets the upstream so future `git push` calls from this branch don't need arguments.

Open a PR. Description template:

```
## What
Adds a `favorite` boolean to `Account`. Users can mark accounts as
favorites from the accounts panel and see a star next to favorited rows.

## Why
Makes frequently used accounts easier to spot in the list.

## How to test
1. Pull the branch, run `npx prisma migrate dev`, then `npm run dev`
2. Create an account with "Mark as favorite" checked — confirm star shows
3. Toggle favorite on an existing account — confirm star updates
4. Refresh the page — confirm state persists
5. Log in as a second user — confirm favorites do not leak between users

## Migration
`prisma/migrations/<timestamp>_add_account_favorite` adds one column
with a default of `false`. Safe for existing rows.
```

---

## Phase 8: Common things that go wrong

These are the exact things a beginner hits on their first feature. Read them once now, re-read when you get stuck.

**TypeScript says `Property 'favorite' does not exist on type 'Account'`.**
You edited the schema but the Prisma client didn't regenerate. Run `npx prisma generate` and then restart the TypeScript server in VS Code (`Ctrl+Shift+P` → "TypeScript: Restart TS Server").

**API returns 401 from the toggle button.**
You forgot `credentials: "include"` in the `fetch` call. The session cookie has to be sent explicitly for same-origin fetches in some setups.

**Star doesn't appear after clicking the toggle until you refresh.**
You forgot `await load()` after the PATCH. Local state is stale. Either re-fetch, or optimistically update local state (`setAccounts(...)`) — for a beginner, re-fetch is safer.

**API returns 400 "Validation failed" when you try to toggle.**
You probably sent `favorite` as a string (`"true"`) instead of a boolean. Check the `body: JSON.stringify({ favorite: "true" })` vs `{ favorite: true }`. The checkbox handler should use `e.target.checked`, which is already a boolean.

**Migration fails with "column contains null values".**
You forgot `@default(false)` in the schema. Drop the failed migration, fix the schema, and re-run `npx prisma migrate dev`.

**PATCH works in curl but not from the browser.**
CORS is rarely the issue in same-origin Next.js apps. Look at the Network tab: is the request going to the right URL? Is the body a valid JSON string? Is the session cookie attached?

**Everything works in dev but the prod build fails.**
Run `npm run build` locally before pushing. You likely have an unused import, a stray `any`, or a type mismatch ESLint is stricter about in build mode than in dev.

---

## Phase 9: What you just did

Pause and look back. You:

1. Added a column to the database.
2. Ran a migration that wrote SQL and regenerated the Prisma client.
3. Extended the Zod schema so the API would accept the new field.
4. Updated the POST and PATCH handlers to persist it.
5. Added the field to the GET response shape so the client could see it.
6. Updated the React component's type.
7. Rendered a star based on the new field.
8. Wired a checkbox into the create form and a button into the list.
9. Manually tested every path, including the "other user" leak check.
10. Committed in small pieces and pushed a clean PR.

That is the whole stack. Every feature in this app — categories, budgets, savings goals, recurring transactions — follows this exact same shape. The field types change, the UI shapes change, but the phases do not. Once this loop is in your fingers you can add a feature to Finnova in an afternoon instead of a week.

Next time: pick a slightly bigger feature. Maybe "notes" on accounts, or "color" so users can tint each card. Follow the same nine phases. You will be faster on the second one, and fluent by the fourth.

---

## Related reading

- `docs/PRISMA_AND_DB.md` — the database layer in detail: Prisma client, relations, migrations
- `docs/EDGE_CASES_AND_RULES.md` — what the API already guards against and what you should never skip
- `docs/REQUEST_FLOW.md` — how a request travels from the browser through auth, validation, and the DB
- `docs/GIT_FOR_FIRST_PROJECT.md` — branch, commit, push, and PR workflow for someone new to git
