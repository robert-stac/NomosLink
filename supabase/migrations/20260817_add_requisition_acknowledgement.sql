-- Add acknowledgement columns to requisitions table using camelCase to match the existing schema pattern
ALTER TABLE "requisitions"
ADD COLUMN IF NOT EXISTS "acknowledgedById" TEXT,
ADD COLUMN IF NOT EXISTS "acknowledgedByName" TEXT,
ADD COLUMN IF NOT EXISTS "acknowledgedAt" TEXT,
ADD COLUMN IF NOT EXISTS "acknowledgeNote" TEXT,
ADD COLUMN IF NOT EXISTS "amountReceived" NUMERIC;
