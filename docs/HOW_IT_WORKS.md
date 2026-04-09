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
