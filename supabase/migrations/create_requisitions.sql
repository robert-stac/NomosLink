CREATE TABLE IF NOT EXISTS public.requisitions (
  id text PRIMARY KEY,
  title text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'Pending',
  "submittedById" text,
  "submittedByName" text,
  "dateSubmitted" text,
  "approvedById" text,
  "approvedByName" text,
  "dateApproved" text,
  "paidById" text,
  "paidByName" text,
  "datePaid" text,
  "rejectionReason" text,
  "relatedFileId" text,
  "relatedFileType" text,
  "relatedFileName" text,
  notes text
);

ALTER TABLE public.requisitions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'requisitions' AND policyname = 'requisitions_all'
  ) THEN
    CREATE POLICY requisitions_all ON public.requisitions FOR ALL USING (true) WITH CHECK (true);
  END IF;
END
$$;
