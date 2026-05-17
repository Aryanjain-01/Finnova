# Finnova Glossary — A to Z Quick Lookup

This is a quick A-Z lookup of every term you are likely to meet while working on Finnova. For narrative explanations grouped by topic, see [ABSOLUTE_BASICS.md](ABSOLUTE_BASICS.md). For the project roadmap, start at [START_HERE.md](START_HERE.md).

Definitions are intentionally short (1-3 sentences). Each one points at the file in this repo where the term actually shows up, when that helps. Use Ctrl+F to jump straight to a word.

## Table of Contents

[A](#a) &middot; [B](#b) &middot; [C](#c) &middot; [D](#d) &middot; [E](#e) &middot; [F](#f) &middot; [G](#g) &middot; [H](#h) &middot; [I](#i) &middot; [J](#j) &middot; [K](#k) &middot; [L](#l) &middot; [M](#m) &middot; [N](#n) &middot; [O](#o) &middot; [P](#p) &middot; [Q](#q) &middot; [R](#r) &middot; [S](#s) &middot; [T](#t) &middot; [U](#u) &middot; [V](#v) &middot; [W](#w) &middot; [X](#x) &middot; [Y](#y) &middot; [Z](#z)

---

## A

**Account (domain)** — A place where money lives (cash, bank, card, other). Defined by the `Account` model in `prisma/schema.prisma`. See also: AccountTypeEnum.

**AccountTypeEnum** — The Prisma enum for account kinds: `CASH | BANK | CARD | OTHER`. See `prisma/schema.prisma`.

**API** — Application Programming Interface. A way for two programs to talk. In this project, "the API" means the backend endpoints under `app/api/*`. See also: Endpoint, Route handler.

**App Router** — Next.js's newer routing system, based on folders under `app/`. Finnova uses it throughout. See also: Route group, Layout.

**Archived (account)** — A boolean flag on `Account` that hides it from normal lists without deleting it. See `Account.archived` in `prisma/schema.prisma`.

**Argument** — A value you pass into a function call (e.g., `greet("Mudit")`). See also: Parameter.

**Arrow function** — Shorthand function syntax: `(x) => x + 1`. Common inside event handlers and array methods.

**async / await** — Syntax for working with Promises. `async` marks a function that may wait; `await` pauses until a Promise resolves. See also: Promise.

**Authentication (authN)** — Proving who you are (logging in). In Finnova this is email + password, handled by NextAuth in `auth.ts`. See also: Authorization, Session.

**Authorization (authZ)** — Checking what a logged-in user is allowed to do. In Finnova every route handler filters by `userId` to enforce this. See also: Authentication.

**Auth.js / NextAuth** — The auth library this project uses (v5 beta, `next-auth` in `package.json`). Configured in `auth.ts` at the repo root.

**AUTH_SECRET** — Environment variable used by NextAuth to sign session JWTs. Lives in `.env`, never committed.

---

## B

**Backend** — Code that runs on the server, not in the browser. In Finnova, this is everything under `app/api/*` and anything imported from `lib/prisma.ts`. See also: Frontend.

**bcryptjs** — Password-hashing library. Turns a plaintext password into a one-way hash stored in `User.passwordHash`. See `auth.ts` and `package.json`.

**Branch (Git)** — A parallel line of development. The current branch is `feat/ui-revamp-animations-features`; the main one is `main`. See also: Commit, Pull request.

**Budget** — A monthly spending cap on a category. Modeled as `Budget` in `prisma/schema.prisma` with a `@@unique([userId, categoryId, year, month])` constraint.

**Build** — Compiling the app for production with `npm run build`. Output goes to `.next/`. See also: Dev server.

---

## C

**Cascade delete** — Deleting a parent row also deletes its children. In Finnova, deleting a `User` cascades to all their accounts, categories, transactions, etc. See `onDelete: Cascade` in `prisma/schema.prisma`.

**Category** — A label like "Groceries" or "Salary" attached to a transaction. See the `Category` model in `prisma/schema.prisma`. See also: CategoryTypeEnum.

**CategoryTypeEnum** — Prisma enum for category kinds: `INCOME | EXPENSE`. A category is one or the other.

**Class (JS/TS)** — Blueprint for creating objects using `class Foo { ... }`. Finnova rarely uses classes — most code is functions and hooks.

**Client component** — React component marked with `"use client"` at the top that runs in the browser. Can use state, effects, and event handlers. See also: Server component.

**CLI** — Command Line Interface. Tools you run in a terminal: `npm`, `git`, `next`, `prisma`, `tsx`.

**Commit** — A snapshot in Git history. Created with `git commit -m "..."`. See also: Branch, Working directory.

**Component** — A reusable React UI piece. A function that returns JSX. Lives in `components/*.tsx` or inline in a `page.tsx`. See also: Props, State.

**Controlled input** — A form field whose `value` prop is stored in React state, so React is the source of truth. The opposite is an "uncontrolled" input managed by the DOM.

**Cookie** — Small data stored in the browser and sent back with every request to the same site. Finnova's session JWT lives in an HTTP-only cookie. See also: HTTP-only cookie, Session.

**CORS** — Cross-Origin Resource Sharing. Browser rules about which sites can call which APIs. Rarely an issue inside Finnova because the frontend and API share an origin.

**Credentials provider** — The NextAuth provider used for email + password login. Configured in `auth.ts`. See also: Provider (NextAuth).

**CSS** — Cascading Style Sheets. How the page looks. Finnova uses Tailwind utility classes on top of the base CSS in `app/globals.css`. See also: Tailwind, Design token.

**cuid** — The ID format Prisma uses by default. Short, URL-safe, collision-resistant string. See `@default(cuid())` in `prisma/schema.prisma`.

**Currency** — A 3-letter ISO code stored on `User.currency` and `Account.currency`. Defaults to `"INR"` in this project.

---

## D

**Dashboard** — The `/dashboard` page. Shows charts and summaries built with Recharts. Source: `app/(app)/dashboard/page.tsx`.

**Database** — Structured store of records. Finnova uses PostgreSQL, accessed through Prisma. See also: Prisma, SQL.

**Dark mode** — Alternate color theme. Implemented via CSS variables toggled by a theme provider. See also: Design token.

**Date (DB)** — A timestamp column in PostgreSQL. Prisma maps it to JavaScript `Date` objects. Finnova stores transaction dates as `DateTime` in `schema.prisma`.

**DB** — Common abbreviation for database.

**Decimal** — Precise numeric type for money in Prisma. Finnova uses `Decimal @db.Decimal(14, 2)` on every money field to avoid floating-point rounding errors. See `Transaction.amount`.

**Default value** — A value used when none is provided. In Prisma: `@default(cuid())`, `@default(now())`, `@default("INR")`. In TypeScript: `function f(x = 1) {}`.

**Dependency** — A library your code uses. Listed under `dependencies` in `package.json`. See also: Dev dependency, node_modules.

**Dev dependency** — A library needed only while developing, not at runtime. Listed under `devDependencies` in `package.json`. Examples: TypeScript, ESLint, Prisma CLI.

**Dev server** — The local server started by `npm run dev`. Runs on `http://localhost:3000` with hot reload. See also: Hot reload.

**DevTools** — Browser developer tools. Press F12 or right-click &rarr; Inspect. Elements, Console, and Network tabs are the ones you will use most.

**Design token** — A named CSS variable used across the theme (e.g., `--color-surface`, `--color-border`). Changes the whole look by editing one value.

**Discriminated union** — A TypeScript pattern where a literal field tags which shape an object has, letting TS narrow types. See `lib/api.ts`.

**Docker** — Containerization tool. Finnova uses `docker-compose.yml` at the repo root to run PostgreSQL locally.

**DOM** — Document Object Model. The browser's in-memory tree of HTML elements. React manages the DOM for you based on JSX.

**Dotenv** — Library (`dotenv` in `package.json`) that loads environment variables from `.env` into `process.env`.

---

## E

**Effect** — A side-effect run by React's `useEffect` hook (fetching, timers, subscriptions). See also: useEffect.

**Endpoint** — One specific URL the API responds to, like `/api/transactions` or `/api/accounts/abc123`. See also: Route handler.

**Enum** — A fixed list of allowed values. Finnova uses `AccountTypeEnum`, `CategoryTypeEnum`, `TransactionTypeEnum`, and `RecurrenceFrequency` in `prisma/schema.prisma`.

**ESLint** — Linter that checks code for style and mistakes. Run with `npm run lint`. Config at `eslint.config.mjs`.

**Environment variable** — Per-machine config stored in `.env` (e.g., `DATABASE_URL`, `AUTH_SECRET`). Read via `process.env.NAME`. Never commit `.env`.

**Error boundary** — A React pattern for catching render-time errors so one broken component does not crash the whole page.

**Expression** — Any piece of code that produces a value (`2 + 2`, `user.name`, `fn()`). Contrast with statements, which do not return values.

---

## F

**Fetch** — The browser's built-in API for making HTTP requests. Finnova uses it from client components to call `/api/*` routes. See `lib/api.ts`.

**Field** — One attribute of a Prisma model, e.g., `Transaction.amount`. Maps to a DB column. See also: Model.

**Foreign key** — A column that references another table's primary key, like `Transaction.userId` &rarr; `User.id`. See also: Relation.

**Form state** — React state that backs a form's fields. Typically managed with `useState` plus controlled inputs.

**Frontend** — Code that runs in the user's browser. In Finnova, this means React components under `app/` and `components/`. See also: Backend.

**Function component** — A React component defined as a function (the default in modern React). Contrast with the older class components.

---

## G

**Generic** — A type parameter that makes a type or function work with many shapes, like `Array<T>` or `useState<User | null>(null)`.

**GET** — HTTP verb for reading data. In Finnova, `GET /api/transactions` lists transactions. See also: POST, PUT, PATCH, DELETE.

**Git** — The version control system this repo uses. See also: Branch, Commit, Pull request.

**GitHub** — Where Git repositories are hosted. Pull requests and reviews happen there.

**Global state** — State shared across many components. Finnova keeps this minimal; most state lives inside individual components or is fetched fresh per page.

---

## H

**Handler** — A function that responds to an event or request. Button click handlers, form submit handlers, and route handlers all qualify.

**Hash (password)** — A one-way transformation of a password so the plaintext is never stored. Finnova hashes passwords with bcryptjs before saving to `User.passwordHash`.

**Header (HTTP)** — Key/value metadata attached to a request or response, like `Content-Type: application/json` or the `Cookie` header.

**Hook** — A React function whose name starts with `use` (`useState`, `useEffect`, `useMemo`, `useCallback`). Only callable inside function components or other hooks.

**Hot reload / HMR** — Dev-mode feature where saving a file updates the browser instantly without losing state. Built into `next dev`.

**HTML** — The markup language of web pages. React produces HTML from JSX at render time.

**HTTP** — The protocol browsers and servers speak. Every request has a verb (`GET`, `POST`, ...), a URL, headers, and optionally a body. See also: HTTP status code.

**HTTP status code** — The number that summarizes a response: 2xx success, 3xx redirect, 4xx client error, 5xx server error.

**HTTP-only cookie** — A cookie JavaScript running on the page cannot read, only the server can. Finnova stores its session JWT in one for safety against XSS.

---

## I

**Icon** — An optional string field on `Category` and `SavingsGoal` used to pick a visual symbol in the UI. See `schema.prisma`.

**Import** — Bringing something exported from another file into this one: `import { prisma } from "@/lib/prisma"`. See also: Module, Path alias.

**Include (Prisma)** — Option passed to a Prisma query to fetch related records along with the main row. Example: `prisma.user.findUnique({ where, include: { transactions: true } })`. See also: Select (Prisma), Relation.

**Index (DB)** — A lookup structure the database maintains to make certain queries fast. Primary keys and unique constraints create indexes automatically.

**Input validation** — See Validation.

**Interface (TS)** — A TypeScript declaration describing the shape of an object: `interface User { id: string; email: string }`.

---

## J

**JavaScript** — The language of the web. Runs in browsers and, via Node.js, on servers. TypeScript compiles down to JavaScript.

**JSON** — JavaScript Object Notation. A text format for structured data. API responses in Finnova are all JSON. See also: Stringify.

**JSX** — HTML-like syntax inside JS/TS files. React uses it. Only legal inside `.jsx` or `.tsx` files.

**JWT** — JSON Web Token. A signed blob containing session data. Finnova stores the JWT in an HTTP-only cookie so the server can identify the user on each request. See also: Session, Cookie.

---

## K

**Key (DB)** — A column or combination of columns used to identify or look up rows. Includes primary keys, foreign keys, and unique keys.

**Key (React lists)** — A unique `key` prop React needs when rendering arrays so it can track which item is which across re-renders.

---

## L

**Layout (Next.js)** — A component in `layout.tsx` that wraps every page inside its folder. Finnova has one per route group under `app/(app)/layout.tsx` and `app/(auth)/layout.tsx`.

**Library** — Reusable code published as an npm package. React, Next, Prisma, Zod, and Recharts are all libraries.

**Lint** — The process of checking code for problems (style, bugs, unused variables). See also: ESLint.

**Literal type** — A TypeScript type that contains only one specific value, like `"INCOME"` or `true`. Unions of literals make enum-like types.

**Loading state** — UI shown while async data is being fetched (a spinner, skeleton, or placeholder). Usually backed by a boolean in React state.

---

## M

**Markdown** — The plain-text format used for every doc under `docs/`. File extension `.md`.

**Middleware** — Code that runs on every matching request before it reaches the handler. Finnova's `middleware.ts` redirects logged-out users to `/login`.

**Migration (Prisma)** — A versioned schema change, stored under `prisma/migrations/`. Apply with `npx prisma migrate dev`.

**Model (Prisma)** — A database table defined in `schema.prisma`. Finnova's models: `User`, `Account`, `Category`, `Transaction`, `Budget`, `SavingsGoal`, `RecurringTransaction`.

**Module** — One TypeScript or JavaScript file that exports things for others to `import`. See also: Package.

**Mutation** — Any operation that changes data: create, update, or delete. Contrast with queries, which only read.

---

## N

**Next.js** — The React framework this project uses (version 16, `next` in `package.json`). Provides routing, server components, API routes, and middleware.

**NextAuth** — See Auth.js.

**node_modules** — Folder where npm installs dependencies. Huge, regenerable, never committed (listed in `.gitignore`).

**Node.js** — JavaScript runtime for servers. Next.js and all CLI tools in this repo run on Node.

**npm** — Node Package Manager. Downloads packages and runs scripts defined in `package.json`.

**npx** — Tool bundled with npm that runs a package without installing it globally, e.g., `npx prisma studio`.

**null** — Intentional absence of a value. Contrast with `undefined`, which usually means "never set."

---

## O

**onDelete** — A Prisma option for what happens when a related row is deleted. Finnova uses `Cascade` to clean up children and `SetNull` to keep the child but clear the reference. See `schema.prisma`.

**Optional chaining** — The `?.` operator in TypeScript that returns `undefined` instead of crashing on a missing property: `user?.account?.name`.

**ORM** — Object-Relational Mapper. A library that lets you query a database using language-native objects instead of raw SQL. Prisma is the ORM in Finnova. See also: Prisma.

---

## P

**Package** — A published npm library. Installed by `npm install <name>` and listed in `package.json`. See also: Module.

**package.json** — The project manifest at the repo root listing dependencies, dev dependencies, and scripts (`dev`, `build`, `lint`, `postinstall`).

**package-lock.json** — A lockfile that pins the exact version of every installed package. Commit it; never hand-edit.

**Parameter** — A variable in a function's signature (e.g., the `name` in `function greet(name: string)`). See also: Argument.

**Path alias** — A shortcut like `@/lib/prisma` that expands to `./lib/prisma`. Configured in `tsconfig.json` under `paths`.

**PATCH** — HTTP verb for partially updating something. See also: PUT.

**Payload** — The body of an HTTP request or response, usually JSON.

**POST** — HTTP verb for creating. In Finnova, `POST /api/transactions` creates a transaction.

**PostgreSQL** — The database Finnova uses. Connection string stored in `DATABASE_URL` in `.env`. See also: Docker.

**Prisma** — The ORM Finnova uses (`@prisma/client` in `package.json`, version 6). Schema at `prisma/schema.prisma`, client at `lib/prisma.ts`.

**Prisma client** — The auto-generated TypeScript API for your schema. Imported as `prisma` from `lib/prisma.ts`.

**Prisma Studio** — A GUI for browsing the database. Start with `npx prisma studio`.

**Primary key** — The unique identifier for a row. In Finnova, always `id String @id @default(cuid())`.

**Production** — The live deployed app real users hit. Contrast with development (your laptop). Build with `npm run build`, start with `npm start`.

**Promise** — A value that will be available later. The result of an async operation. Resolved with `await` or `.then()`. See also: async / await.

**Props** — The inputs passed into a React component (the attributes on its JSX tag). Read-only inside the child.

**Provider (NextAuth)** — A login method. Finnova uses the Credentials provider for email + password. See `auth.ts`.

**Provider (React)** — A component that wraps children and supplies values via React Context (e.g., theme provider).

**Pull / Pull request** — `git pull` fetches new commits from the remote. A "pull request" on GitHub is a proposal to merge a branch, used for review.

**PUT** — HTTP verb for replacing a resource. See also: PATCH.

---

## Q

**Query** — A database read (e.g., `prisma.transaction.findMany`) or, more loosely, any request to the server.

**Query parameter** — Values after `?` in a URL, like `?month=4&year=2026`. Read server-side with `new URL(req.url).searchParams`.

---

## R

**React** — The UI library this project is built on (version 19, `react` in `package.json`).

**Recharts** — The chart library Finnova uses on the dashboard (`recharts` in `package.json`).

**Record** — One row in a database table.

**RecurringTransaction** — A scheduled repeating transaction. Modeled in `schema.prisma` with fields `frequency`, `startDate`, `nextRunDate`, `endDate`, and `active`.

**RecurrenceFrequency** — Prisma enum for how often a recurring transaction runs: `DAILY | WEEKLY | MONTHLY | YEARLY`.

**Redirect** — Telling the browser to go somewhere else. In Next.js server code, use `redirect("/login")`. In middleware, return `NextResponse.redirect(...)`.

**Relation (DB)** — A link between two tables, declared in Prisma via the `@relation` attribute. Finnova has many: `Transaction.user`, `Transaction.account`, `Budget.category`, etc.

**Render** — React computing what a component should show. Triggered by initial mount and by state or props changing.

**REST** — An architectural style for APIs where URLs represent resources and HTTP verbs say what to do with them. Finnova's API follows REST loosely.

**Route** — A URL path mapped to a handler or page.

**Route group** — Next.js feature using `(parentheses)` to share a layout without affecting the URL. Finnova uses `app/(app)/` for authenticated pages and `app/(auth)/` for login and signup.

**Route handler** — A function exported from `route.ts` that handles one HTTP verb: `export async function GET(req) { ... }`. See also: Endpoint.

**Row** — One record in a database table. See also: Record.

---

## S

**SavingsGoal** — A target amount a user is saving toward, with an optional deadline. Modeled in `schema.prisma`.

**Schema (DB)** — The blueprint of tables and columns, defined in `prisma/schema.prisma`. See also: Migration.

**Schema (Zod)** — Validation rules that describe valid input shape, defined in `lib/validations.ts`. See also: Validation.

**Script (npm)** — A command defined under `"scripts"` in `package.json`, run via `npm run <name>`. Finnova has `dev`, `build`, `start`, `lint`, and `postinstall`.

**Seed** — Sample data for development. Finnova seeds via `prisma/seed.ts`, configured in the `prisma.seed` field of `package.json`.

**Select (Prisma)** — Option to pick which columns to return from a Prisma query. Opposite intent of Include.

**Server component** — React component that runs on the server (the default in Next.js App Router). Can call the database directly but cannot use hooks or event handlers. See also: Client component.

**Session** — The server's record that you are currently logged in. Finnova stores it as a JWT inside an HTTP-only cookie. See also: JWT, Cookie.

**SetNull** — A Prisma `onDelete` option that clears the reference instead of deleting the child row. Used on `Transaction.toAccount` and `Transaction.category`.

**Side effect** — Anything a function does besides returning a value: mutating state, writing to a file, making a network call. Side effects in React go in `useEffect`.

**Signup** — Creating an account. Handled in `app/(auth)/signup/` plus an API route.

**SQL** — Structured Query Language. The language databases speak. Prisma writes SQL for you under the hood.

**SSR** — Server-Side Rendering. The server produces HTML and sends it down so the page is visible before JavaScript runs. Next.js server components are one flavor of this.

**Stack trace** — The list of function calls in an error, showing how the code got to the crash. Read from the top.

**State (React)** — Data stored inside a component that can change over time. Updated via `useState` (or `useReducer`). Changing state re-renders the component.

**Stringify** — Convert an object to a JSON string using `JSON.stringify`. The inverse is `JSON.parse`.

**Strict mode (TS)** — TypeScript compiler option that turns on stricter checks (no implicit `any`, strict null checks, etc.). On in this project via `tsconfig.json`.

---

## T

**Table** — A collection of similar rows in a database. Defined by a Prisma `model`.

**Tag** — A comma-separated keyword string on `Transaction.tags` for freeform labeling.

**Tailwind** — The utility-first CSS framework Finnova uses (Tailwind v4, `tailwindcss` in `package.json`). Class names like `rounded-xl bg-surface p-4` directly style elements.

**Template literal** — A string with backticks and `${}` interpolation: `` `Hello, ${name}` ``. Also allows multi-line strings.

**Ternary** — The `cond ? a : b` expression. Common inside JSX for conditional rendering.

**Token** — Overloaded: an auth token (like a JWT) OR a design token (a CSS variable used in the theme).

**Transaction (DB)** — An atomic group of database operations that succeed or fail together. Created via `prisma.$transaction([...])`.

**Transaction (domain)** — A user-recorded income, expense, or transfer in the app. Modeled as `Transaction` in `schema.prisma`. Different meaning from the DB one above.

**TransactionTypeEnum** — Prisma enum: `INCOME | EXPENSE | TRANSFER`.

**Transfer** — A transaction with `type: TRANSFER` that moves money between two accounts. Uses `Transaction.accountId` (source) and `Transaction.toAccountId` (destination).

**tsx (command)** — A tool (`tsx` in devDependencies) that runs TypeScript files directly. Used by `prisma/seed.ts` via the seed script.

**TSX (file)** — TypeScript + JSX. File extension for React components written in TypeScript.

**TypeScript** — JavaScript with a type system. The language Finnova is written in. See also: Strict mode.

---

## U

**undefined** — A value that was never set. Contrast with `null`, which usually means "intentionally empty."

**Union type** — A TypeScript type allowing any of several types: `string | number`. Often used with literal types for enum-like values.

**Unique constraint** — A DB rule preventing duplicate values. Finnova uses `@@unique([userId, categoryId, year, month])` on `Budget` so one category cannot have two budgets for the same month.

**Unit test** — A test of one function in isolation. Finnova does not ship tests yet; this is listed so the term does not surprise you later.

**Upsert** — Update a row if it exists, insert it if it does not. Prisma exposes this as `prisma.model.upsert(...)`.

**URL** — Uniform Resource Locator. A web address like `http://localhost:3000/api/transactions?month=4`.

**useCallback** — React hook that returns a stable function reference across renders, useful when passing callbacks to memoized children.

**useEffect** — React hook for running side effects after render (fetching data, subscribing, timers).

**useMemo** — React hook for caching a computed value between renders.

**useState** — React hook for adding state to a component. Returns `[value, setValue]`.

**"use client"** — The directive at the top of a file that marks it as a client component. Without it, the file is a server component.

---

## V

**Validation** — Checking input shape and rules before using it. Finnova uses Zod schemas in `lib/validations.ts` on every API route. See also: Zod.

**Variable** — A named value in code. Declared with `const`, `let`, or (rarely) `var`.

**Verb (HTTP)** — Another word for HTTP method: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`.

**Version control** — Tracking code history over time. Finnova uses Git. See also: Branch, Commit.

---

## W

**Where clause** — The filter condition in a Prisma query: `where: { userId }`. Maps to SQL `WHERE`.

**Working directory (Git)** — The files currently on disk, as opposed to the staging area or commit history. `git status` shows what is different in your working directory.

**Wrapper** — A component or function whose only job is to wrap something else to add behavior (a layout, a provider, a type helper).

---

## X

**XSS** — Cross-Site Scripting. An attack where malicious scripts get injected into your page. React escapes interpolated strings by default, which prevents most XSS.

---

## Y

**YAML** — A human-friendly data format used by `docker-compose.yml` and many config files.

**Year / Month (Budget)** — Integer fields on `Budget` used together as a per-month bucket. A budget is keyed to a specific `(userId, categoryId, year, month)`.

---

## Z

**Zod** — The TypeScript-first validation library Finnova uses (`zod` in `package.json`, v4). Schemas live in `lib/validations.ts` and are used on every incoming API payload.

---

## Not here?

If a word is missing or you want a longer explanation with examples and diagrams, jump to:

- [ABSOLUTE_BASICS.md](ABSOLUTE_BASICS.md) — narrative explanations grouped by topic
- [REACT_BASICS_FOR_THIS_PROJECT.md](REACT_BASICS_FOR_THIS_PROJECT.md) — React concepts with real Finnova examples
- [PRISMA_AND_DB.md](PRISMA_AND_DB.md) — Prisma and database specifics
- [HOW_IT_WORKS.md](HOW_IT_WORKS.md) — the six layers of the app end to end
- [REQUEST_FLOW.md](REQUEST_FLOW.md) — real requests traced step by step
- [CODEBASE_EXPLAINED.md](CODEBASE_EXPLAINED.md) — file-by-file tour
- [EDGE_CASES_AND_RULES.md](EDGE_CASES_AND_RULES.md) — business rules
- [DEBUGGING_PLAYBOOK.md](DEBUGGING_PLAYBOOK.md) — when something breaks
- [GIT_FOR_FIRST_PROJECT.md](GIT_FOR_FIRST_PROJECT.md) — version control basics
- [START_HERE.md](START_HERE.md) — the full doc roadmap

Still stuck? Most unfamiliar words are either a React term, a Next.js term, a Prisma term, or plain web vocabulary. Search the Finnova docs first; after that, the official sites for React, Next.js, Prisma, and MDN Web Docs cover almost everything else.
