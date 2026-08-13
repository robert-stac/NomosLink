-- Run this in your Supabase SQL Editor
-- Creates the subscription table with a single row for the firm

CREATE TABLE IF NOT EXISTS subscription (
  id TEXT PRIMARY KEY DEFAULT 'nomoslink_bca',
  status TEXT NOT NULL DEFAULT 'active',   -- 'active' or 'locked'
  expiry_date DATE NOT NULL,
  last_renewed_at TIMESTAMPTZ,
  notes TEXT
);

-- Insert the initial subscription row (set your own start date)
-- Change '2026-09-13' to whenever you want the first payment to be due
INSERT INTO subscription (id, status, expiry_date, last_renewed_at, notes)
VALUES (
  'nomoslink_bca',
  'active',
  '2026-09-13',
  now(),
  'Initial subscription setup'
)
ON CONFLICT (id) DO NOTHING;

-- =======================================================
-- Secure server-time function
-- The app calls this instead of using the local PC clock.
-- This prevents the client from bypassing the lock by
-- changing their Windows date/time settings.
-- =======================================================
CREATE OR REPLACE FUNCTION get_server_time()
RETURNS TIMESTAMPTZ
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT now();
$$;
