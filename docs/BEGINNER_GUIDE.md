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
