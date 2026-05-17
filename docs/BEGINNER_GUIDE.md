# Beginner Guide — Everything In One Place

This is a cheat-sheet summary of the whole codebase. Once you've read the other docs, come back here any time you need a quick refresher.

---

## What the app does

**Finnova** is a personal finance tracker. A logged-in user can:

- Keep track of **accounts** (Cash / Bank / Card / Other)
- Define **categories** (Food, Salary, Rent, etc.) as Income or Expense
- Log **transactions** (income, expense, transfer between accounts)
- Set monthly **budgets** per category
- Track **savings goals** with progress bars
- Set up **recurring transactions** (rent, salary, subscriptions)
- See a **dashboard** with charts, insights, totals, and trends

---

## The stack in one picture

```
Browser ──fetch──► Next.js API routes ──Prisma──► PostgreSQL
                         │
                         └─► NextAuth (session) ─► cookie
```

- **Frontend:** React 19 + Next.js 16 (App Router) + Tailwind CSS v4
- **Backend:** Next.js Route Handlers in `app/api/*`
- **DB:** PostgreSQL via Prisma ORM
- **Auth:** NextAuth v5 (Credentials + JWT in a cookie)
- **Validation:** Zod
- **Charts:** Recharts
- **Language:** TypeScript everywhere

---

## Folder structure (the only one you need to memorize)

```
app/
├── (app)/       → logged-in pages (dashboard, transactions, budgets, ...)
├── (auth)/      → login + register
├── api/         → backend endpoints
├── layout.tsx   → root HTML + providers
└── globals.css  → Tailwind + theme

components/
├── ui/          → atoms: Button, Card, Modal, Skeleton, ...
└── *.tsx        → feature panels: TransactionsPanel, AccountsPanel, ...

lib/
├── prisma.ts        → DB client singleton
├── api.ts           → requireUserId() auth helper
├── validations.ts   → Zod schemas
├── finance.ts       → money math (totals, trends, balances)
├── insights.ts      → dashboard auto-insights
└── recurrence.ts    → next-run date math

prisma/
├── schema.prisma    → DB tables + relations
├── migrations/      → schema change history
└── seed.ts          → sample data

auth.ts              → NextAuth config
middleware.ts        → route guard
```

---

## The 5-step API recipe

Every protected route in this app follows this shape. Memorize it.

```ts
export async function POST(req: Request) {
  // 1. AUTH
  const r = await requireUserId();
  if ("response" in r) return r.response;

  // 2. PARSE
  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  // 3. VALIDATE
  const parsed = someSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  // 4. OWNERSHIP (for any referenced IDs)
  const parent = await prisma.parent.findFirst({
    where: { id: parsed.data.parentId, userId: r.userId },
  });
  if (!parent) return NextResponse.json({ error: "Not found" }, { status: 400 });

  // 5. WRITE
  const created = await prisma.xxx.create({ data: { ...parsed.data, userId: r.userId } });
  return NextResponse.json(created);
}
```

Copy this when you add new endpoints.

---

## The client-panel recipe

Every feature panel follows this shape:

```tsx
"use client";

export function SomePanel({ currency }: { currency: string }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/xxx", { credentials: "include" });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) return;
    setItems(data.items ?? data);
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function handleSave(values) {
    const res = await fetch("/api/xxx", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!res.ok) {
      toast({ variant: "error", title: "Save failed" });
      return;
    }
    setModalOpen(false);
    await load();
  }

  return loading ? <Skeleton /> : items.length === 0 ? <EmptyState /> : <Table rows={items} />;
}
```

---

## How to add a new feature, step by step

1. **Schema change (if needed).** Edit `prisma/schema.prisma`, run `npx prisma migrate dev --name add_xxx`.
2. **Validation.** Add a Zod schema in `lib/validations.ts`.
3. **API route.** Create `app/api/<resource>/route.ts` following the 5-step recipe.
4. **Page.** Create `app/(app)/<name>/page.tsx` that renders your panel.
5. **Panel.** Create `components/<name>-panel.tsx` following the panel recipe.
6. **Navigation.** Add a link in `components/app-shell.tsx` if needed.
7. **Test.** `npm run dev`, try it, fix the bugs.

---

## Data flow in one sentence

> A user action in React updates state → triggers a fetch → hits an API route → auth + validate + ownership + Prisma write → JSON response → React updates state again → UI re-renders.

That's it. That's the whole app.

---

## Authentication in one picture

```
Login form
  │
  ▼
NextAuth (auth.ts)
  │  Zod check → prisma.user.findUnique → bcrypt.compare
  ▼
JWT in HTTP-only cookie
  │
  ▼
Every subsequent request: NextAuth reads the cookie, rehydrates session
  │
  ├─► middleware.ts checks on every page nav
  ├─► Server pages check with await auth()
  └─► API routes check with requireUserId()
```

---

## Frequently reached for

| Need | File |
|---|---|
| The big example of a client component | `components/transactions-panel.tsx` |
| The big example of an API route | `app/api/transactions/route.ts` |
| The big example of a server page | `app/(app)/dashboard/page.tsx` |
| All validation rules | `lib/validations.ts` |
| All money math | `lib/finance.ts` |
| Auth helper | `lib/api.ts` |
| DB models | `prisma/schema.prisma` |
| Session config | `auth.ts` |
| Route guard | `middleware.ts` |

---

## What to read next

If you haven't yet:

1. [REACT_BASICS_FOR_THIS_PROJECT.md](REACT_BASICS_FOR_THIS_PROJECT.md) — React concepts, tied to real files.
2. [HOW_IT_WORKS.md](HOW_IT_WORKS.md) — the six layers of the app.
3. [CODEBASE_EXPLAINED.md](CODEBASE_EXPLAINED.md) — file-by-file tour.
4. [REQUEST_FLOW.md](REQUEST_FLOW.md) — three flows traced line by line.
5. [EDGE_CASES_AND_RULES.md](EDGE_CASES_AND_RULES.md) — every rule the app enforces.
6. [GIT_FOR_FIRST_PROJECT.md](GIT_FOR_FIRST_PROJECT.md) — Git from scratch.

---

## When you're stuck

1. Read the error carefully — it usually says the file and line.
2. Check the browser DevTools Network tab for the failing request.
3. Check the terminal running `npm run dev` for server-side stack traces.
4. Re-read the relevant route handler and matching Zod schema.
5. If all else fails: `git status`, `git diff`, and walk through your own changes. 90% of bugs are "I forgot to save a file" or "I typed the wrong variable name".
