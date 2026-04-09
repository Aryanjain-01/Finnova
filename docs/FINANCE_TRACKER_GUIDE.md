## Finance Tracker

A full-stack personal finance app built with Next.js, Prisma, and PostgreSQL.

If you are a beginner, start here:

1. [Beginner Guide](docs/BEGINNER_GUIDE.md)
2. [How The App Works](docs/HOW_IT_WORKS.md)
3. [Request Flow (Step-by-Step)](docs/REQUEST_FLOW.md)

## Getting Started

Install dependencies and run the dev server:

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Main Tech Stack

- Next.js + React + TypeScript
- Tailwind CSS
- NextAuth (Credentials login)
- Prisma ORM
- PostgreSQL
- Zod validation
- Recharts

## Useful Scripts

- `npm run dev` -> start local development server
- `npm run lint` -> run lint checks
- `npm run build` -> production build
# Beginner Guide

This guide explains your app in very simple terms.

## What this app does

You can:
- Create accounts (Cash, Bank, Card, etc.)
- Create categories (Food, Transport, Salary, etc.)
- Add transactions (Income, Expense, Transfer)
- Set budgets
- View dashboard charts and summaries

## Big picture (easy version)

1. Frontend (what you see): pages and forms in Next.js/React
2. Backend (what runs on server): API routes in `app/api/*`
3. Database: PostgreSQL
4. Prisma: talks to database using TypeScript
5. Auth: login/session using NextAuth

## Important folders

- `app/(app)/*` -> protected pages (dashboard, transactions, accounts, budgets, settings)
- `app/api/*` -> backend API endpoints
- `components/*` -> reusable UI pieces
- `lib/*` -> helper logic and validation
- `prisma/schema.prisma` -> database schema (tables/models)

## How data flows

When you submit a form:
1. React form sends request to an API route
2. API validates data with Zod
3. API checks logged-in user
4. API saves/reads with Prisma
5. API returns JSON
6. UI updates list/table/chart

## How authentication works

- Login uses email + password (credentials provider)
- Passwords are hashed with `bcryptjs`
- Session is managed by NextAuth (JWT strategy)
- Protected routes require a valid session

## What to learn next (in order)

1. Read `docs/HOW_IT_WORKS.md`
2. Open one API route and follow it end-to-end
3. Open `prisma/schema.prisma` and understand each model
4. Add one small feature (example: new field in Transaction)
# How The App Works

This file explains each layer of the project.

## 1. Frontend layer

- Built with Next.js App Router + React
- UI components live in `components/*`
- Protected pages live in `app/(app)/*`
- Auth pages live in `app/(auth)/*`

Examples:
- `components/transactions-panel.tsx` -> transaction table + modal form
- `components/accounts-panel.tsx` -> account management UI

## 2. API/backend layer

API endpoints are in `app/api/*`.

Examples:
- `app/api/transactions/route.ts` -> create/list transactions
- `app/api/accounts/route.ts` -> create/list accounts
- `app/api/categories/route.ts` -> create/list categories

Each route usually does:
1. Check user session (`requireUserId`)
2. Parse request body
3. Validate with Zod (`lib/validations.ts`)
4. Run Prisma query
5. Return JSON response

## 3. Database layer

- Prisma schema is in `prisma/schema.prisma`
- Database is PostgreSQL
- Main models: `User`, `Account`, `Category`, `Transaction`, `Budget`

Relationships:
- One user has many accounts/categories/transactions/budgets
- Transaction belongs to one source account
- Transfer transaction can also point to `toAccount`
- Budget links to category + month/year

## 4. Authentication layer

- Config in `auth.ts`
- Uses NextAuth Credentials provider
- Password compare with `bcryptjs`
- Session strategy: JWT

## 5. Validation layer

- Zod schemas in `lib/validations.ts`
- Prevents invalid data from entering DB

Example checks:
- Transfer must have `toAccountId`
- Transfer cannot move to same account
- Amount must be positive

## 6. Styling layer

- Tailwind CSS v4 + global styles in `app/globals.css`
- Shared structure from `components/app-shell.tsx`

## 7. Charts and analytics

- Recharts used for dashboard charts
- Finance calculations/helpers in `lib/finance.ts`
# Request Flow (Step-by-Step)

Use this to understand one full cycle from UI to database.

## Example: Add an expense transaction

1. You open Transactions page.
2. You click "Add transaction".
3. Form in `components/transactions-panel.tsx` collects values.
4. Form sends `POST /api/transactions`.
5. `app/api/transactions/route.ts` receives request.
6. It checks login with `requireUserId()`.
7. It validates body using `transactionCreateSchema`.
8. It writes record with Prisma.
9. API returns success JSON.
10. Frontend reloads transaction list and shows new row.

## Example: Dashboard load

1. Page `app/(app)/dashboard/page.tsx` loads.
2. Server fetches user + calculates totals.
3. Helpers in `lib/finance.ts` compute trends and category breakdown.
4. Page sends data to chart components.
5. Recharts renders pie/line chart.

## Error flow

If something is wrong:
- Invalid body -> API returns 400 + error details
- Not logged in -> API returns 401
- DB issue -> API returns 500 or auth-specific error path

## How to debug quickly

1. Check browser console + network tab
2. Check terminal logs
3. Confirm API response JSON
4. Verify Zod schema and Prisma model match
5. Verify database data
