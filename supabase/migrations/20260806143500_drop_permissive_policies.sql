-- Drop overly permissive RLS policies on tables
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON public.land_titles;
DROP POLICY IF EXISTS "Allow all operations for authenticated users notes" ON public.land_title_notes;

-- Drop overly permissive SELECT policies on storage buckets that allow listing all files
DROP POLICY IF EXISTS "Public documents bucket access" ON storage.objects;
DROP POLICY IF EXISTS "Public transactions bucket access" ON storage.objects;
