ALTER TABLE "User" ALTER COLUMN "currency" SET DEFAULT 'INR';
ALTER TABLE "Account" ALTER COLUMN "currency" SET DEFAULT 'INR';

UPDATE "User"
SET "currency" = 'INR'
WHERE "currency" = 'USD';

UPDATE "Account"
SET "currency" = 'INR'
WHERE "currency" = 'USD';
