-- Add category column to requisitions table
ALTER TABLE IF EXISTS requisitions
ADD COLUMN IF NOT EXISTS category TEXT;
