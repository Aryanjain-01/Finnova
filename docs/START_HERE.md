# Start Here: Beginner Roadmap

This project can feel big at first. That is normal.

Use this order:

1. Read `docs/REACT_BASICS_FOR_THIS_PROJECT.md`
2. Read `docs/CODEBASE_EXPLAINED.md`
3. Read `docs/EDGE_CASES_AND_RULES.md`
4. Read `docs/GIT_FOR_FIRST_PROJECT.md`
5. Start making tiny changes and commit often

## What you are building

You are building a full-stack finance tracker:
- Frontend UI (React + Next.js)
- Backend APIs (Next.js route handlers)
- Database models (Prisma + PostgreSQL)
- Authentication (NextAuth)

## Project map

- `app/(app)/*`: logged-in pages (dashboard, transactions, budgets, accounts, settings)
- `app/(auth)/*`: login/register pages
- `app/api/*`: backend API routes
- `components/*`: reusable UI components
- `lib/*`: shared business logic and helpers
- `prisma/schema.prisma`: database tables + relations
- `prisma/migrations/*`: DB migration history

## Your first 3 beginner tasks

1. Change one label text in a component and see hot reload.
2. Add one small form validation message.
3. Add one read-only field to one table row and commit.

## Golden beginner rules

- Keep changes small.
- Test after every change.
- If broken, read the error slowly before changing more code.
- One feature = one branch.
- Commit often with clear messages.
