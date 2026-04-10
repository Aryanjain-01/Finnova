# React Basics — Explained Through This Project

Every concept here is tied to a real file in **this** repo. When something clicks, open the file and see it in context.

---

## 0) Before React: what even is a component?

Old-school HTML is a pile of tags. React lets you wrap a pile of tags into a **reusable function** that returns those tags. That function is called a **component**.

```tsx
function Greeting() {
  return <h1>Hello</h1>;
}
```

You use it like a tag:

```tsx
<Greeting />
```

That's it. That's the entire core idea. Everything else is variations.

---

## 1) Components in this repo

Open `components/ui/button.tsx`, `components/ui/card.tsx`, `components/ui/modal.tsx`. These are **atoms** — small components you reuse everywhere.

Then open `components/transactions-panel.tsx`. This is a **feature component** — a big one that uses many atoms to build the transactions page.

And pages themselves are components too. `app/(app)/dashboard/page.tsx` is one giant component that returns the entire dashboard.

**Rule of thumb:**
- Small, reusable UI piece → lives in `components/ui/`
- Big feature-specific piece → lives in `components/` directly
- A full page → lives in `app/(app)/<page>/page.tsx`

---

## 2) JSX — "HTML in JavaScript"

JSX looks like HTML but it's actually JavaScript. A few differences:

| HTML | JSX |
|---|---|
| `class="btn"` | `className="btn"` |
| `for="email"` | `htmlFor="email"` |
| `<br>` | `<br />` (must self-close) |
| `onclick=""` | `onClick={...}` (camelCase) |

Curly braces `{}` let you drop JavaScript **expressions** in the middle of your markup:

```tsx
// from app/(app)/dashboard/page.tsx:136
title={firstName ? `Hello, ${firstName}` : "Hello there"}
```

Inside `{}`, anything is fair game: variables, ternaries, function calls, `.map()`, math.

---

## 3) Props — passing data into a component

Props are the inputs your component takes. You pass them like HTML attributes; you receive them as a function argument.

**Real example** — `components/transactions-panel.tsx:40`:

```tsx
export function TransactionsPanel({ currency }: { currency: string }) {
  // ...use `currency` inside the component
}
```

And it gets used from the page:

```tsx
<TransactionsPanel currency="INR" />
```

Props are **read-only** inside the child. You cannot do `currency = "USD"` and expect React to care. If something changes, it has to come from **state** (next section).

Another example — `components/ui/stat-tile.tsx` is called from `dashboard/page.tsx:177`:

```tsx
<StatTile
  label="Income"
  value={formatMoney(income, currency)}
  delta={incomeDelta !== 0 ? { value: incomeDelta * 100, label: "vs last month" } : undefined}
  icon={<ArrowUpIcon className="h-5 w-5" />}
  accent="success"
/>
```

Notice you can pass **anything** as a prop — strings, numbers, objects, even other JSX (the `icon` prop). That's a superpower.

---

## 4) State (`useState`) — remembering things across renders

If a user types in a box, clicks a filter, opens a modal — that information needs to live somewhere. A plain variable won't work, because every time React re-renders the component, the function runs again from scratch and local variables reset.

**`useState` is React's way of saying "remember this between renders."**

**Real example** — `components/transactions-panel.tsx:41-62`:

```tsx
const [items, setItems] = useState<Tx[]>([]);
const [total, setTotal] = useState(0);
const [page, setPage] = useState(1);
const [loading, setLoading] = useState(true);
const [q, setQ] = useState("");
const [modalOpen, setModalOpen] = useState(false);
const [editing, setEditing] = useState<Tx | null>(null);
```

The pattern is always the same:

```tsx
const [value, setValue] = useState(initialValue);
```

- `value` → read the current value
- `setValue(newValue)` → change it **and** tell React to re-render
- **Never** do `value = something`. Always use the setter.

When you call `setModalOpen(true)`, React re-runs the component function, sees the new state, and updates the DOM for you. That's the whole trick.

---

## 5) Events — responding to user actions

HTML events become props that take functions:

```tsx
<button onClick={() => setModalOpen(true)}>Add</button>

<input
  value={q}
  onChange={(e) => setQ(e.target.value)}
  placeholder="Search..."
/>

<form onSubmit={handleSubmit}>...</form>
```

See `components/transactions-panel.tsx` for dozens of real examples.

**Controlled inputs** — notice how the `<input>` above has **both** `value={q}` **and** `onChange={...}`. That's called a controlled input:

- The state (`q`) is the single source of truth.
- Every keystroke updates the state, which re-renders the input with the new value.

It feels circular, but it means **you** always know what's in the input without asking the DOM. Validation, resetting, clearing — all trivial.

---

## 6) Effects (`useEffect`) — "do something when X changes"

`useState` handles data. `useEffect` handles **side effects** — things that reach outside the component, like fetching an API, setting up a timer, or listening to a window event.

**Real example** — `components/transactions-panel.tsx:99-115`:

```tsx
useEffect(() => {
  void load();
}, [load]);

useEffect(() => {
  void loadLookups();
}, [loadLookups]);

useEffect(() => {
  const handler = () => {
    setEditing(null);
    setModalOpen(true);
  };
  window.addEventListener("finnova:quick-add", handler);
  return () => window.removeEventListener("finnova:quick-add", handler);
}, []);
```

Anatomy of a `useEffect`:

```tsx
useEffect(() => {
  // 1) the effect: code that runs after render
  return () => {
    // 2) (optional) cleanup: runs before next effect or when component unmounts
  };
}, [/* 3) dependency array: which values cause this to re-run */]);
```

**Dependency array rules of thumb:**
- `[]` → run once when the component first mounts
- `[x, y]` → run when `x` or `y` changes
- (omit it) → run after every render (almost always a mistake)

The third example above has `[]` — it attaches a global event listener once and removes it when the component goes away. That cleanup is important: if you forget it, you get duplicate listeners and weird bugs.

---

## 7) `useCallback` and `useMemo` — stability and caching

These are optimizations. You do not need them most of the time. But this repo uses them, so here's why.

### `useCallback` — stable function references

**Example** — `components/transactions-panel.tsx:78`:

```tsx
const load = useCallback(async () => {
  setLoading(true);
  const res = await fetch(`/api/transactions?${params.toString()}`, { credentials: "include" });
  // ...
}, [page, applied]);
```

Without `useCallback`, `load` would be a brand-new function on every render. The `useEffect` below it (`}, [load])`) would then re-fire on every render and loop forever. `useCallback` says "give me the same function back as long as `[page, applied]` hasn't changed" — breaking the loop.

### `useMemo` — cached computed values

**Example** — `components/transactions-panel.tsx:117`:

```tsx
const fmt = useMemo(
  () => (n: number) =>
    new Intl.NumberFormat(undefined, { style: "currency", currency }).format(n),
  [currency],
);
```

Creating a new `Intl.NumberFormat` is expensive. `useMemo` caches it and only rebuilds when `currency` changes.

**Mental model:** `useCallback(fn, deps)` is just `useMemo(() => fn, deps)` — both cache things based on a dependency array.

---

## 8) Conditional rendering

JSX lets you show different things based on state. Three patterns you'll see all over this repo:

**Ternary:**
```tsx
{loading ? <Skeleton /> : <TransactionsTable rows={items} />}
```

**Short-circuit `&&`:**
```tsx
{items.length === 0 && <p>No transactions yet.</p>}
```

**If-like early return in the component body:**
```tsx
if (!session?.user?.id) redirect("/login");
```
(from `dashboard/page.tsx:72`)

---

## 9) Lists — `.map()` with a `key`

To render a list of things, you `.map()` over an array and return JSX for each item.

**Real example** — `dashboard/page.tsx:242`:

```tsx
<ul className="grid gap-3 sm:grid-cols-2">
  {insights.map((i, idx) => (
    <li key={i.id} /* ... */>
      <div>{i.title}</div>
      <div>{i.description}</div>
    </li>
  ))}
</ul>
```

The `key` prop is **required**. React uses it to figure out which items actually changed when the list updates. Use a stable unique id from your data (`i.id`), not the loop index, whenever possible.

---

## 10) Server vs Client Components (Next.js thing)

This trips up everyone. Next.js lets you write two kinds of components:

**Server Components** (the default):
- Run on the server, never ship JavaScript to the browser.
- Can `await` database calls directly.
- **Cannot** use hooks (`useState`, `useEffect`, `useCallback`).
- **Cannot** handle click events.
- Example: `app/(app)/dashboard/page.tsx` — notice it's `async function DashboardPage(...)` and calls `prisma.savingsGoal.findMany()` directly.

**Client Components** (opt-in with `"use client"` at the top):
- Run in the browser.
- **Can** use hooks and handle events.
- Example: `components/transactions-panel.tsx` — line 1 is literally `"use client";`.

**Rule of thumb for this repo:**
- Pages in `app/(app)/*/page.tsx` → server components. They fetch data and render the page shell.
- Anything that needs `useState` or `onClick` → client component under `components/*.tsx`.
- Pages hand off to client components like this: `dashboard/page.tsx` renders `<TrendsArea />` (client) with already-fetched data passed as props.

This split is why the dashboard can load fast: all the data fetching happens on the server, and only the interactive chart code gets sent to the browser.

---

## 11) Common beginner mistakes (and how to spot them)

| Mistake | Symptom | Fix |
|---|---|---|
| Mutating state directly (`items.push(...)`) | UI doesn't update | Use the setter: `setItems([...items, newItem])` |
| Forgetting `key` on `.map()` | Warning in console, weird list behavior | Add `key={item.id}` |
| Missing dependency in `useEffect` | Stale data, doesn't re-fetch when expected | Add the variable to the dep array |
| Infinite `useEffect` loop | Browser hangs, network tab shows endless calls | Wrap the function in `useCallback` |
| `useState` in a server component | Build error: "hooks can only be called in client components" | Add `"use client"` at the top of the file |
| Forgetting `await` on a `fetch` | `res.ok` is undefined, crash | `const res = await fetch(...)` |
| Not checking `res.ok` | "why is my UI showing nothing?" | `if (!res.ok) return;` before `res.json()` |
| Putting secrets in a client component | Secrets leak to the browser | Move to a server component or API route |

---

## 12) A mental model to carry around

> **React = (state) → (UI)**
>
> Your UI is a *function* of your state. When state changes, React re-runs your component function and figures out what to update in the DOM. Your job is to describe what the UI should *look like* for any given state — not how to change the DOM step by step.

Every time something feels hard, ask: *"What state would need to change for the screen to look the way I want?"* Then make that state change happen.

---

## 13) Where to go next

- [HOW_IT_WORKS.md](HOW_IT_WORKS.md) — how React fits into the rest of the app (backend, DB, auth).
- [REQUEST_FLOW.md](REQUEST_FLOW.md) — watch one button click travel through the whole stack.
- [Official React docs](https://react.dev) — excellent, beginner-friendly, free.
