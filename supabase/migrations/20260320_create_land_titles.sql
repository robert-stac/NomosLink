-- Drop existing tables to ensure a clean start with all columns
DROP TABLE IF EXISTS public.land_title_notes;
DROP TABLE IF EXISTS public.land_titles;

-- Create land_titles table
CREATE TABLE public.land_titles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title_number TEXT NOT NULL,
    title_type TEXT DEFAULT 'Mailo',
    plot_block TEXT,
    block TEXT,
    district TEXT,
    county TEXT,
    location TEXT,
    owner_name TEXT NOT NULL,
    size TEXT,
    date_received TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    origin TEXT DEFAULT 'Direct Custody', -- 'Direct Custody' or 'Transaction'
    transaction_id TEXT, -- Link to transactions table (using TEXT because existing IDs are strings)
    client_id TEXT, -- Link to clients table
    status TEXT DEFAULT 'In Custody', -- 'In Custody', 'Released', 'Under Transaction', 'Archived'
    handling_lawyer_id TEXT, -- Link to users table
    storage_location TEXT,
    notes TEXT,
    date_released TIMESTAMPTZ,
    monthly_rate NUMERIC DEFAULT 200000,
    total_billed NUMERIC DEFAULT 0,
    total_paid NUMERIC DEFAULT 0,
    taken_by TEXT,
    taken_at TIMESTAMPTZ,
    taken_reason TEXT,
    scanned_copy_url TEXT,
    scanned_copy_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add dynamic title log table for append-only notes
CREATE TABLE IF NOT EXISTS public.land_title_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title_id UUID REFERENCES public.land_titles(id) ON DELETE CASCADE,
    author_id TEXT NOT NULL,
    author_name TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS (Internal private app - simple policy)
ALTER TABLE public.land_titles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.land_title_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations for authenticated users" 
ON public.land_titles FOR ALL 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Allow all operations for authenticated users notes" 
ON public.land_title_notes FOR ALL 
USING (true) 
WITH CHECK (true);
