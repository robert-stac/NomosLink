-- Migration: Add acknowledgement fields to requisitions and create requisition_audit table
-- Date: 2026-08-15

-- Ensure pgcrypto is available for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Add acknowledgement columns to requisitions table
ALTER TABLE IF EXISTS requisitions
  ADD COLUMN IF NOT EXISTS acknowledged_by_id uuid,
  ADD COLUMN IF NOT EXISTS acknowledged_by_name text,
  ADD COLUMN IF NOT EXISTS acknowledged_at timestamptz,
  ADD COLUMN IF NOT EXISTS acknowledge_note text,
  ADD COLUMN IF NOT EXISTS amount_received numeric;

-- Index commonly queried acknowledgement timestamp for performance
CREATE INDEX IF NOT EXISTS idx_requisitions_acknowledged_at ON requisitions (acknowledged_at);

-- Create an audit table to record important actions on requisitions
CREATE TABLE IF NOT EXISTS requisition_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requisition_id uuid NOT NULL,
  action text NOT NULL,
  by_user uuid,
  at timestamptz NOT NULL DEFAULT now(),
  meta jsonb
);

CREATE INDEX IF NOT EXISTS idx_requisition_audit_requisition_id ON requisition_audit (requisition_id);
CREATE INDEX IF NOT EXISTS idx_requisition_audit_at ON requisition_audit (at DESC);

-- Trigger function to populate requisition_audit on changes
CREATE OR REPLACE FUNCTION public.requisition_audit_trigger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO requisition_audit(requisition_id, action, by_user, meta)
      VALUES (NEW.id, 'created', NEW.submitted_by_id, to_jsonb(NEW));
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO requisition_audit(requisition_id, action, by_user, meta)
      VALUES (OLD.id, 'deleted', NULL, to_jsonb(OLD));
    RETURN OLD;

  ELSIF TG_OP = 'UPDATE' THEN
    -- Log status changes (e.g., Approved, Paid, Rejected)
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      INSERT INTO requisition_audit(requisition_id, action, by_user, meta)
        VALUES (NEW.id, 'status_changed:' || COALESCE(NEW.status, ''),
                COALESCE(NEW.paid_by_id, NEW.approved_by_id, NEW.submitted_by_id),
                jsonb_build_object('old', OLD.status, 'new', NEW.status));
    END IF;

    -- Log when a requisition is marked paid
    IF (OLD.date_paid IS NULL AND NEW.date_paid IS NOT NULL) THEN
      INSERT INTO requisition_audit(requisition_id, action, by_user, meta)
        VALUES (NEW.id, 'marked_paid', NEW.paid_by_id,
                jsonb_build_object('date_paid', NEW.date_paid, 'paid_by_name', NEW.paid_by_name, 'amount', NEW.amount));
    END IF;

    -- Log acknowledgement events
    IF (OLD.acknowledged_at IS NULL AND NEW.acknowledged_at IS NOT NULL) THEN
      INSERT INTO requisition_audit(requisition_id, action, by_user, meta)
        VALUES (NEW.id, 'acknowledged', NEW.acknowledged_by_id,
                jsonb_build_object('acknowledged_at', NEW.acknowledged_at, 'acknowledged_by_name', NEW.acknowledged_by_name, 'note', NEW.acknowledge_note, 'amount_received', NEW.amount_received));
    END IF;

    -- If acknowledgement was removed or changed, still record an audit entry
    IF (OLD.acknowledged_at IS NOT NULL AND NEW.acknowledged_at IS NULL) THEN
      INSERT INTO requisition_audit(requisition_id, action, by_user, meta)
        VALUES (NEW.id, 'acknowledgement_removed', NULL, jsonb_build_object('old_acknowledged_at', OLD.acknowledged_at));
    END IF;

    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

-- Attach trigger to requisitions
DROP TRIGGER IF EXISTS requisition_audit_trigger ON requisitions;
CREATE TRIGGER requisition_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON requisitions
  FOR EACH ROW EXECUTE FUNCTION public.requisition_audit_trigger();

-- Optional: grant select on audit table to roles that need it (adjust role names as needed)
-- GRANT SELECT ON requisition_audit TO authenticated;

-- Done
