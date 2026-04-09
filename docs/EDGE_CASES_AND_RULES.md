# Edge Cases And Rules In This App

These are practical rules already enforced in your code.

## 1) Auth and ownership rules

- Every protected API first checks logged-in user.
- Records are always queried with `userId` filters.
- This prevents cross-user data access.

## 2) Transaction edge cases

- Transfer must include destination account (`toAccountId`).
- Transfer cannot send to same account.
- Income must use INCOME category.
- Expense must use EXPENSE category.
- Transfer ignores category.
- Amount must be positive.

## 3) Date and pagination guards

- Page is clamped to minimum 1.
- Page size has bounds (min and max).
- Date filters are optional and conditionally applied.

## 4) Budget edge cases

- Month must be 1-12.
- Year must be 2000-2100.
- Budget amount must be positive.
- Unique constraint avoids duplicate budget row for same user+category+month+year.

## 5) Account/category guards

- Account/category name has min and max length.
- Account type is enum-only (`CASH`, `BANK`, `CARD`, `OTHER`).
- Category type enum-only (`INCOME`, `EXPENSE`).

## 6) Savings/recurring guards

- Savings target amount must be positive.
- Savings current amount cannot be negative.
- Recurring frequency must be one of `DAILY/WEEKLY/MONTHLY/YEARLY`.

## 7) Real-world operational edge case you already hit

- Prisma model exists but DB table missing (migration not applied).
- Result: runtime `P2021 table does not exist`.

Fix pattern:
1. confirm database target in env
2. apply migration on same DB
3. restart dev server
4. re-test endpoint/page

## 8) UI-state edge cases to watch

- Loading state not reset on early return
- Modal state not cleared when switching edit/new modes
- Filters not applied until explicit apply click
- Stale data after create/update if list not reloaded

## 9) Security basics to keep

- Never trust frontend input
- Always validate in API
- Always use user-scoped DB queries
- Never expose secrets in client files
