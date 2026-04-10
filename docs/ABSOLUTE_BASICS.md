# Absolute Basics — Vocabulary Before The Vocabulary

This doc is for when you open another doc and hit a word that doesn't make sense. Start here. Come back whenever you need to.

No prior knowledge assumed.

---

## Part 1 — File extensions you'll see in this project

The last few letters of a filename (after the dot) tell you what's inside.

| Extension | What it means | Example in this repo |
|---|---|---|
| `.ts` | **TypeScript** — JavaScript + type labels | `auth.ts`, `lib/prisma.ts` |
| `.tsx` | **TypeScript + JSX** — TypeScript that can contain React markup | `components/transactions-panel.tsx` |
| `.js` | **JavaScript** — the original web language | (very few in this repo — we use TS) |
| `.jsx` | JavaScript + JSX | (none here) |
| `.json` | **JavaScript Object Notation** — structured data (key/value) | `package.json`, `tsconfig.json` |
| `.md` | **Markdown** — formatted plain text (what you're reading) | everything in `docs/` |
| `.css` | Styles (colors, spacing, fonts) | `app/globals.css` |
| `.prisma` | Prisma schema — database blueprint | `prisma/schema.prisma` |
| `.mjs` | JavaScript using "ES modules" syntax | `eslint.config.mjs` |
| `.env` | **Environment variables** — secrets and config per-machine | `.env` (you create this) |
| `.example` | A template you copy to make the real thing | `.env.example` |
| `.lock` | A pinned exact version list — never hand-edit | `package-lock.json` |
| `.log` | Runtime output, usually ignored by Git | (build logs) |
| `.yml` / `.yaml` | Another structured-data format, human-friendly | `docker-compose.yml` |
| `.sql` | Raw database queries | Inside `prisma/migrations/*/migration.sql` |

### Why do we have both `.ts` and `.tsx`?

`.tsx` is TypeScript that's allowed to contain HTML-looking markup (JSX). `.ts` is pure logic — no markup. If a file contains React components, it has to be `.tsx`. If it's just helper functions, it can be `.ts`.

### What's TypeScript? And how is it different from JavaScript?

**JavaScript** is the language browsers speak. It's loose — you can stick any value in any variable and nothing stops you until something crashes at runtime.

**TypeScript** is JavaScript + **types**. You label what kind of value each thing is (`string`, `number`, `boolean`, `User[]`), and a tool called the TypeScript compiler yells at you *before* you run the code if something doesn't match.

```ts
// JavaScript (works, crashes later)
function greet(name) {
  return "Hello " + name.toUpperCase();
}
greet(42);   // 💥 at runtime: numbers don't have toUpperCase

// TypeScript (caught immediately)
function greet(name: string) {
  return "Hello " + name.toUpperCase();
}
greet(42);   // ❌ compile error: "Argument of type 'number' is not assignable to parameter of type 'string'."
```

Browsers don't run TypeScript directly. It gets compiled to JavaScript first. Next.js does that for you automatically — you just save the `.ts` file and it works.

**Why use it?** Bugs caught by the type checker are bugs that never reach your users. On a project this size, TypeScript is a huge productivity win.

---

## Part 2 — The core web vocabulary

### HTML

The skeleton of a web page. Tags like `<h1>`, `<p>`, `<div>`, `<button>`. In this project, you rarely write HTML directly — React components produce it for you via JSX.

### CSS

How the page **looks**. Colors, fonts, spacing, layout. In this project, styling is done with **Tailwind**, which is just CSS classes with predictable names.

```tsx
<div className="rounded-xl border border-border bg-surface p-4">
```

Every class in Tailwind corresponds to a small bit of CSS. `p-4` = padding, `rounded-xl` = big rounded corners, `bg-surface` = use the "surface" color. Cheat sheet at [tailwindcss.com/docs](https://tailwindcss.com/docs).

### JavaScript

The language that makes web pages interactive. Click handlers, animations, fetching data, updating the page without reloading it. React is built on JavaScript.

### DOM

Short for **Document Object Model**. It's the browser's in-memory tree of your HTML elements. When you click a button and the page updates, what's actually happening is JavaScript is changing the DOM. React manages the DOM for you — you describe what you want, React figures out the minimal changes.

### Browser DevTools

The panel that opens when you press **F12** (or right-click → Inspect). Tabs you'll use constantly:
- **Elements** — inspect the live HTML/CSS
- **Console** — see JavaScript errors and run code
- **Network** — see every request the page is making
- **Application** — inspect cookies, localStorage

If you're stuck debugging, 90% of the time the answer is in the Console or Network tab.

---

## Part 3 — Frontend vs Backend vs Database

This is the most important distinction in web dev. Memorize it.

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│                 │       │                 │       │                 │
│    FRONTEND     │  ───► │     BACKEND     │  ───► │    DATABASE     │
│                 │ fetch │                 │ query │                 │
│  (browser)      │  ◄─── │  (server code)  │  ◄─── │  (PostgreSQL)   │
│                 │  JSON │                 │  rows │                 │
└─────────────────┘       └─────────────────┘       └─────────────────┘
  React components           API routes              SQL tables
  runs in the browser        runs on the server      runs on a DB server
```

### Frontend (a.k.a. "the client")

Everything that runs **in the user's browser**. HTML, CSS, JavaScript. Your React components. The stuff the user can see and click. Anything in `components/*.tsx` and most of `app/(app)/*`.

**Key limitation:** anything on the frontend is public. A malicious user can read any code, modify any value, and send whatever they want to your server. You cannot trust it.

### Backend (a.k.a. "the server")

Code that runs on a computer **you control**, not the user's. In this project, the backend is `app/api/*/route.ts` — Next.js Route Handlers. They receive HTTP requests from the frontend, check permissions, read/write the database, and send JSON back.

**Why you need one:** because the frontend can't be trusted, every security rule and every database operation has to happen on the server.

### Database

A specialized server whose whole job is storing structured data. This project uses **PostgreSQL**, a popular relational database. Data is organized into **tables** (users, accounts, transactions, ...), each row is one record, columns are the fields.

The frontend never talks to the database directly. Always: **frontend → backend → database**.

---

## Part 4 — The terms each doc uses

### Routing

**Deciding what to show for a given URL.** When a user types `/dashboard`, *routing* figures out which file/component handles that URL and renders it.

In Next.js (this project), routing is based on folders:
- `app/(app)/dashboard/page.tsx` → the page at `/dashboard`
- `app/(app)/transactions/page.tsx` → the page at `/transactions`
- `app/api/transactions/route.ts` → the API endpoint at `/api/transactions`

You don't configure routes by hand — the folder structure *is* the routing.

### API

**Application Programming Interface.** It's just a fancy word for "a way for two pieces of software to talk to each other."

In this project, "the API" means the backend endpoints at `app/api/*`. The React frontend sends requests to them; they send back JSON.

**Example:** when you click "Add transaction" in the browser:
1. Frontend does `fetch("/api/transactions", { method: "POST", body: ... })`
2. The code in `app/api/transactions/route.ts` runs and handles it
3. Frontend gets a JSON response back

That exchange is "calling the API."

### Endpoint

**One specific URL the API responds to.** `/api/transactions` is an endpoint. `/api/accounts/abc123` is another endpoint. Each endpoint does a specific thing.

### HTTP

**HyperText Transfer Protocol.** The language browsers and servers speak. Every request has a **method** (also called a "verb") that says what kind of action you're taking:

| Method | Meaning | Example |
|---|---|---|
| `GET` | "Give me data" | `GET /api/transactions` → list transactions |
| `POST` | "Create something" | `POST /api/transactions` → add a new one |
| `PUT` | "Replace something" | `PUT /api/transactions/123` → update it |
| `PATCH` | "Partially update" | `PATCH /api/transactions/123` → change one field |
| `DELETE` | "Remove something" | `DELETE /api/transactions/123` |

In this project, the route handler functions are literally named after these verbs:

```ts
export async function GET(req: Request) { ... }
export async function POST(req: Request) { ... }
```

Next.js sees the function name and calls the right one based on what the browser asked for.

### HTTP status codes

Every response comes back with a number that summarizes what happened:

| Range | Meaning | Common examples |
|---|---|---|
| **2xx** | Success | `200 OK`, `201 Created` |
| **3xx** | Redirect | `301`, `302` |
| **4xx** | You (the client) messed up | `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found` |
| **5xx** | The server messed up | `500 Internal Server Error` |

When debugging, the status code tells you where to look. `401` → auth problem. `400` → bad input. `500` → server crashed, check the terminal.

### JSON

**JavaScript Object Notation.** A way to represent structured data as plain text. It's what APIs send and receive. Looks like this:

```json
{
  "id": "abc123",
  "amount": "42.50",
  "type": "EXPENSE",
  "tags": ["food", "lunch"]
}
```

JSON is basically "JavaScript object literal, but as text." Every modern language can read and write it.

### Fetch

`fetch()` is JavaScript's built-in way to make HTTP requests from the browser.

```ts
const res = await fetch("/api/transactions", {
  method: "POST",
  credentials: "include",   // send cookies (needed for login)
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ amount: 42, type: "EXPENSE" }),
});
const data = await res.json();
```

- `res` is the **response object** (status, headers, etc.)
- `res.ok` → `true` if the status is 2xx
- `res.json()` → parses the response body as JSON
- `credentials: "include"` → sends the session cookie along (otherwise the server doesn't know who you are)

### Auth (Authentication vs Authorization)

Two related words that sound the same but mean different things:

- **Authentication** = "Who are you?" — proving your identity (logging in with email/password).
- **Authorization** = "What are you allowed to do?" — checking that a logged-in user is permitted to take a specific action.

When this project's docs say "auth", they usually mean both. Example:
- *Authentication:* "User logged in with the right password → here's a session cookie."
- *Authorization:* "This session belongs to User A — make sure they can only see User A's transactions."

### Session

**A record that the server is currently talking to a specific logged-in user.** In this project, the session is stored as a **JWT** (see below) inside an **HTTP-only cookie**. Every request automatically sends the cookie, and the server can decode it to find out who you are.

### Cookie

**A small piece of data the browser stores and sends back on every request to the same site.** Cookies are how "you stay logged in" between page loads.

"HTTP-only" means JavaScript on the page **cannot read the cookie**. Only the server can. This protects it from being stolen by malicious scripts.

### JWT

**JSON Web Token.** A compact, signed string that encodes data (like `userId`). The server signs it with a secret key so nobody can forge one, and anyone with the secret can verify it's genuine.

In this project, NextAuth wraps the user ID in a JWT and stores it in a cookie. When you make a request, the server reads the cookie, verifies the signature, and pulls out your `userId`. No database lookup needed on every request.

### Validation

**Checking that input is shaped the way you expect before using it.** Never trust user input. Always validate.

Examples of validation:
- "`amount` must be a positive number"
- "`email` must be a valid email format"
- "`month` must be between 1 and 12"
- "`type` must be one of INCOME / EXPENSE / TRANSFER"

In this project, validation is done with **Zod** — a library where you write a schema that describes the shape, and it checks incoming data for you. All schemas live in `lib/validations.ts`.

### Data layer (or "persistence layer")

**The code that reads from and writes to the database.** In this project it's Prisma + PostgreSQL. The data layer is the lowest level — everything else eventually calls into it.

### ORM

**Object-Relational Mapper.** A library that lets you query the database using your language's normal objects and methods instead of raw SQL.

Without an ORM (raw SQL):
```sql
SELECT * FROM transactions WHERE user_id = 'abc123' AND amount > 100;
```

With Prisma (this project):
```ts
await prisma.transaction.findMany({
  where: { userId: "abc123", amount: { gt: 100 } }
});
```

Same thing. The second one is type-safe, auto-completes, and catches typos before you run it.

### Schema (two different meanings)

Careful — this word shows up twice:

1. **Prisma schema** (`prisma/schema.prisma`) — the blueprint of your database tables.
2. **Zod schema** (`lib/validations.ts`) — the blueprint of what valid input looks like.

They're both called "schema" because they're both "shape descriptions", but they describe different things. Context usually makes it clear which one is meant.

### Migration

**A script that changes the database structure.** When you add a new column, Prisma generates a migration file (SQL) under `prisma/migrations/`. Running `npx prisma migrate dev` applies pending migrations. Committing them to Git means every teammate (and the production server) can catch up by running the same command.

### Environment (dev / prod)

**"Where the code is running right now."**

- **Development (dev)** — your laptop. `npm run dev`. Hot reload. Debug logs on. Usually points at a local database.
- **Production (prod)** — the real deployed app users hit. `npm run build && npm start`. Optimized. Real database. Real users.

Some code behaves differently depending on environment, checked via `process.env.NODE_ENV`:
```ts
if (process.env.NODE_ENV !== "production") { ... }
```

### Environment variables

**Per-machine config values that don't belong in the source code.** Things like database passwords, API keys, and the auth secret. They live in a `.env` file on disk (which is in `.gitignore`, so it's **never** committed) and are read via `process.env.DATABASE_URL`, `process.env.AUTH_SECRET`, etc.

**Never hard-code secrets.** Never commit `.env`. If you do by accident, see the recovery section of [GIT_FOR_FIRST_PROJECT.md](GIT_FOR_FIRST_PROJECT.md).

---

## Part 5 — React and Next.js terms

### React

A JavaScript library for building user interfaces out of small reusable pieces called **components**. Each component is a function that returns what should be shown on screen. React figures out the minimal DOM updates needed.

### JSX

"HTML in JavaScript." The markup syntax React uses. Looks like HTML but it's actually expressions in a `.tsx` file.

```tsx
return <h1>Hello, {userName}</h1>;
```

### Component

A reusable UI piece. A function that returns JSX. You use it like a tag: `<MyComponent prop1="..." />`.

### Props

The inputs to a component — how the parent passes data in. Read-only inside the child.

### State

Data that belongs to a component and can change over time (from user input, from a fetch, from a timer). Changing state makes React re-render the component.

### Hook

A function whose name starts with `use` (`useState`, `useEffect`, `useCallback`, ...). Hooks are how components tap into React features like state and side effects. You can only call hooks inside function components.

### Render

When React runs a component function to produce its output. Components "re-render" when their state or props change.

### Server component vs Client component

- **Server component** (default in Next.js) — runs on the server, never sent as JavaScript to the browser. Can directly call the database. Cannot use state or click handlers.
- **Client component** (marked with `"use client"` at the top) — runs in the browser. Can use state, hooks, and event handlers. Cannot call the database directly.

In this project, pages in `app/(app)/*/page.tsx` are usually server components; feature panels in `components/*.tsx` are client components.

### Next.js

The framework this project is built on. It's React plus:
- A file-based router (`app/*/page.tsx`)
- Built-in API routes (`app/api/*/route.ts`)
- Server components
- Middleware
- Production build tooling

All in one project. No separate backend needed.

### Route handler

A function in `app/api/<whatever>/route.ts` that responds to HTTP requests. Export `GET`, `POST`, etc. — Next.js runs the right one based on the method.

### Middleware

Code that runs on **every matching request** before it reaches the page or the API. In this project, `middleware.ts` at the root runs on page navigations and redirects logged-out users to `/login`.

---

## Part 6 — Tooling terms

### npm

**Node Package Manager.** Downloads libraries (called "packages") from a huge public registry. When you run `npm install`, it reads `package.json` and downloads every listed package into `node_modules/`.

### Dependencies

**Libraries your code uses.** Listed in `package.json` under `dependencies`. Examples in this project: React, Next.js, Prisma, Zod, Recharts.

### Dev dependencies

**Libraries you only need while developing** (not at runtime). Listed under `devDependencies`. Examples: TypeScript, ESLint, Tailwind, the Prisma CLI.

### `package.json`

The manifest file for your Node.js project. Has the name, version, dependencies, and scripts (`npm run dev`, `npm run build`, etc.).

### `package-lock.json`

Records the **exact version** of every package (and every sub-dependency) that was installed. Commit this file so everyone gets the exact same setup.

### `node_modules/`

Where `npm install` puts all the downloaded packages. Huge folder. Never committed — it's in `.gitignore`. Regenerable by running `npm install`.

### Lint / ESLint

A tool that scans your code for mistakes, style issues, and bad patterns. Run with `npm run lint`. Fix the warnings before opening a PR.

### Build

The process of taking your dev code and producing an optimized version ready to deploy. `npm run build` → Next.js bundles everything and writes the output to `.next/`. The result is what runs in production.

### Hot reload (HMR)

When you save a file in dev mode, the browser updates automatically without a full page refresh. Next.js handles this — you just save and watch.

### Terminal / shell / command line

The text-based interface where you type commands. On Windows, this project uses **bash** (Git Bash or WSL). Commands like `npm run dev`, `git status`, `ls`, `cd` are run here.

### CLI

**Command Line Interface.** A program you control via the terminal rather than a graphical UI. `npm`, `git`, `prisma`, and `next` all have CLIs.

---

## Part 7 — Terms you'll see in error messages

### Stack trace

A list of function calls showing exactly how the code got to the crash. Read **from the top** — the topmost line is usually where the error happened.

### `undefined` vs `null`

Both mean "no value", but:
- `undefined` usually means "this was never set" (a missing variable, a function that returned nothing).
- `null` usually means "this was intentionally set to nothing" (an empty field, a cleared reference).

A common source of bugs: `undefined.something` crashes with "Cannot read properties of undefined". Always check things exist before using them.

### `async` / `await` / `Promise`

Asynchronous code means "this doesn't finish immediately — it will finish later."

- A **Promise** is "a value that's not ready yet, but will be."
- `async` marks a function as "may do asynchronous things — returns a Promise."
- `await` says "pause here until the Promise resolves, then continue."

```ts
async function loadData() {
  const res = await fetch("/api/stuff");   // pause until the server answers
  const data = await res.json();           // pause until the body is parsed
  return data;
}
```

Forgetting `await` is a classic beginner bug. You'd get a `Promise` object instead of the actual value.

### Exception / error

When code encounters a problem it can't handle, it **throws an error**. If nothing catches it, the program crashes and prints a stack trace. You catch errors with `try / catch`:

```ts
try {
  const res = await fetch(...);
} catch (e) {
  console.error("Fetch failed:", e);
}
```

---

## Part 8 — Database terms you'll see in `schema.prisma`

### Table / Model

A collection of similar records. In Prisma, you define a `model` — it maps to a database **table**.

### Row / Record / Instance

One entry in a table. "A row in the `Transaction` table" = one specific transaction.

### Column / Field

One attribute of a record. "The `amount` column on `Transaction`" = every transaction's amount field.

### Primary key

A unique identifier for a row. In this project, every model has `id String @id @default(cuid())` — a random unique string.

### Foreign key

A column that points at another table's primary key. Example: `Transaction.userId` points at `User.id`. This creates a **relation**.

### Relation

A link between two tables. "A user **has many** transactions" / "a transaction **belongs to** one user." Prisma lets you traverse relations easily:

```ts
const txs = await prisma.user.findUnique({
  where: { id: userId },
  include: { transactions: true },
});
```

### Enum

A fixed list of allowed values. In this project: `AccountTypeEnum` is `CASH | BANK | CARD | OTHER`. Trying to save anything else fails.

### Unique constraint

A rule saying "no two rows can have the same value(s) in these columns." In this project, `@@unique([userId, categoryId, year, month])` on `Budget` means you can't have two budgets for the same category in the same month.

### Cascade (delete)

A rule that says "when the parent is deleted, delete the children too." In this project, deleting a `User` cascade-deletes all their accounts, transactions, budgets, etc.

### SQL

The language databases speak. Prisma writes SQL for you behind the scenes — you rarely need to read it. But you can peek at the generated SQL in `prisma/migrations/*/migration.sql`.

---

## Part 9 — Frequently-confusing pairs

| These sound the same but aren't | |
|---|---|
| **Authentication** vs **Authorization** | "Who are you?" vs "What can you do?" |
| **Frontend** vs **Backend** | Runs in the user's browser vs runs on your server |
| **Client component** vs **Server component** | React component with state vs React component that runs on the server |
| **Prisma schema** vs **Zod schema** | DB shape vs input shape |
| **`null`** vs **`undefined`** | Intentional emptiness vs "never set" |
| **`.ts`** vs **`.tsx`** | Pure TypeScript vs TypeScript with JSX |
| **`dependencies`** vs **`devDependencies`** | Needed at runtime vs needed only while developing |
| **`dev`** vs **`prod`** | Running on your laptop vs running live for users |
| **`GET`** vs **`POST`** | Read vs create |
| **Package** vs **Module** | Often used interchangeably; "package" = a published library, "module" = a single file that exports things |

---

## Part 10 — Where to go next

Now that the words make sense:

1. **[START_HERE.md](START_HERE.md)** — the roadmap
2. **[REACT_BASICS_FOR_THIS_PROJECT.md](REACT_BASICS_FOR_THIS_PROJECT.md)** — React concepts with examples
3. **[HOW_IT_WORKS.md](HOW_IT_WORKS.md)** — the 6 layers of the app
4. **[CODEBASE_EXPLAINED.md](CODEBASE_EXPLAINED.md)** — file-by-file tour
5. **[REQUEST_FLOW.md](REQUEST_FLOW.md)** — real requests traced step by step
6. **[EDGE_CASES_AND_RULES.md](EDGE_CASES_AND_RULES.md)** — business rules
7. **[GIT_FOR_FIRST_PROJECT.md](GIT_FOR_FIRST_PROJECT.md)** — version control
8. **[BEGINNER_GUIDE.md](BEGINNER_GUIDE.md)** — one-page cheat sheet

Bookmark this page. Unfamiliar jargon is going to keep showing up for months. That's normal — nobody is born knowing this stuff.
