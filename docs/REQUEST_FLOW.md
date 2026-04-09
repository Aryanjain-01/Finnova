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
