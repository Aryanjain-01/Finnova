# React Basics For This Project

This file explains React concepts using examples from your codebase.

## 1) Component

A component is a function that returns UI.

Example idea from your app:
- `TransactionsPanel` is a component that renders filters, table, and modal.

## 2) Props

Props are inputs passed from parent to child.

Example:
- `TransactionsPanel({ currency })`
- Here `currency` is a prop coming from parent page.

Why this matters:
- Same component can behave differently with different props.

## 3) State (`useState`)

State stores changing data in a component.

In `TransactionsPanel`, state includes:
- `items` for transaction rows
- `loading` for spinner/skeleton behavior
- `page` for pagination
- `modalOpen` for modal visibility

Pattern:
- User action -> state change -> UI rerenders.

## 4) Effects (`useEffect`)

Effects run side tasks like fetching API data.

In your app:
- `useEffect(() => { void load(); }, [load])`
- It loads transactions whenever `load` changes.

Think of effect as:
- “When X changes, run Y side-effect.”

## 5) Memo and callback

`useMemo`:
- caches computed values (example: money formatter function).

`useCallback`:
- keeps function reference stable (example: `load`, `loadLookups`).

Why this matters:
- Reduces unnecessary rerenders and effect loops.

## 6) Controlled inputs

In your forms, inputs use state:
- `value={q}` + `onChange={(e) => setQ(e.target.value)}`

This is a controlled input.

Benefits:
- Full control over form values
- Easy validation and reset

## 7) Conditional rendering

Example patterns:
- If `loading`: show skeleton
- Else if empty list: show empty state
- Else: show rows

This keeps UX clear and predictable.

## 8) Event handling

Examples:
- Button click opens modal
- Form submit sends POST request
- Dropdown selection updates state

Always trace:
- Which event happened?
- Which state changed?
- Which UI/API call followed?

## 9) Client vs server components (Next.js)

If file starts with `"use client"`:
- runs in browser
- can use hooks (`useState`, `useEffect`)

Without it (server component):
- runs on server
- can fetch DB data directly

Your dashboard page is server-side; panels/forms are usually client-side.

## 10) Common mistakes beginners make

- Updating many states without understanding dependencies
- Not handling loading or error states
- Forgetting `await` in async flow
- Not checking `res.ok` after fetch
- Mixing server/client logic in wrong file
