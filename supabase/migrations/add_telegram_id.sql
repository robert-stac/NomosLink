-- Add telegramId column to users table to store individual Telegram chat IDs
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS telegramId text;
