# Codebase Explained (Beginner Deep Dive)

This explains how one request travels through your full stack.

## A) Login flow

1. User submits login form.
2. NextAuth credentials provider in `auth.ts` validates email/password.
3. Password checked with `bcrypt.compare`.
4. On success, session token created (JWT strategy).
5. Protected pages/API read session and identify user.

## B) Transaction create flow

1. UI form in `components/transactions-panel.tsx` collects fields.
2. It sends `POST /api/transactions`.
3. API file `app/api/transactions/route.ts` receives body.
4. Zod schema (`transactionCreateSchema`) validates data.
5. API checks ownership:
- account must belong to current user
- category must belong to current user
6. Business checks:
- transfer requires `toAccountId`
- transfer cannot be to same account
- income/expense category type must match transaction type
7. Prisma writes to DB.
8. API returns normalized JSON.
9. UI reloads rows.

## C) Dashboard flow

1. Dashboard page calculates selected month.
2. Calls finance helpers from `lib/finance.ts`:
- `periodTotals`
- `categoryBreakdown`
- `monthlyTrends`
- `computeAccountBalances`
3. Uses results to render cards/charts.

## D) Database model overview

From `prisma/schema.prisma`:

- `User`: owner of all data
- `Account`: wallet/bank/card/cash container
- `Category`: income/expense labels
- `Transaction`: income/expense/transfer entries
- `Budget`: monthly limit per category
- `SavingsGoal`: target savings plans
- `RecurringTransaction`: scheduled repeating entries

## E) Why `lib/validations.ts` is important

This file protects your DB.

It prevents invalid writes like:
- negative amounts
- invalid month/year values
- transfer to same account
- too-long notes/tags
- missing required ids

## F) Why `lib/finance.ts` exists

This isolates business calculations from UI.

Benefits:
- cleaner components
- reusable logic across pages/routes
- easier testing later

## G) Typical debugging path

When something breaks:

1. Read exact error location and file.
2. Check frontend request payload in browser network tab.
3. Check API validation in `lib/validations.ts`.
4. Check route handler ownership checks.
5. Check DB model relation in Prisma schema.
