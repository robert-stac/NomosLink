-- Migration: Add RPCs for requisition actions
-- Date: 2026-08-15

-- mark_requisition_paid(requisition_id uuid)
-- Marks a requisition as paid. Only callable by users with role 'accountant' or 'admin'.
CREATE OR REPLACE FUNCTION public.mark_requisition_paid(p_requisition_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  caller uuid := auth.uid();
  caller_role text := current_setting('jwt.claims.role', true);
  payer_name text;
  updated_row requisitions%ROWTYPE;
BEGIN
  IF caller_role NOT IN ('accountant', 'admin') THEN
    RAISE EXCEPTION 'permission denied';
  END IF;

  SELECT name INTO payer_name FROM users WHERE id = caller;

  UPDATE requisitions
  SET status = 'Paid',
      paid_by_id = caller,
      paid_by_name = payer_name,
      date_paid = now()
  WHERE id = p_requisition_id
  RETURNING * INTO updated_row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'requisition not found';
  END IF;

  INSERT INTO requisition_audit(requisition_id, action, by_user, meta)
    VALUES (p_requisition_id, 'marked_paid', caller,
            jsonb_build_object('date_paid', updated_row.date_paid, 'paid_by_name', updated_row.paid_by_name, 'amount', updated_row.amount));

  RETURN to_jsonb(updated_row);
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_requisition_paid(uuid) TO authenticated;


-- acknowledge_requisition(requisition_id uuid, amount_received numeric, note text)
-- Records an acknowledgement of payment by the original requester. Only the requester (submitted_by_id) or an admin may call this.
CREATE OR REPLACE FUNCTION public.acknowledge_requisition(
  p_requisition_id uuid,
  p_amount_received numeric,
  p_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  caller uuid := auth.uid();
  caller_role text := current_setting('jwt.claims.role', true);
  req_record requisitions%ROWTYPE;
  caller_name text;
BEGIN
  SELECT * INTO req_record FROM requisitions WHERE id = p_requisition_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'requisition not found';
  END IF;

  -- Allow only the original requester or an admin to acknowledge
  IF caller <> req_record.submitted_by_id AND caller_role NOT IN ('admin') THEN
    RAISE EXCEPTION 'permission denied';
  END IF;

  SELECT name INTO caller_name FROM users WHERE id = caller;

  UPDATE requisitions
  SET acknowledged_by_id = caller,
      acknowledged_by_name = caller_name,
      acknowledged_at = now(),
      acknowledge_note = p_note,
      amount_received = p_amount_received
  WHERE id = p_requisition_id
  RETURNING * INTO req_record;

  INSERT INTO requisition_audit(requisition_id, action, by_user, meta)
    VALUES (p_requisition_id, 'acknowledged', caller,
            jsonb_build_object('acknowledged_at', req_record.acknowledged_at, 'acknowledged_by_name', req_record.acknowledged_by_name, 'note', req_record.acknowledge_note, 'amount_received', req_record.amount_received));

  RETURN to_jsonb(req_record);
END;
$$;

GRANT EXECUTE ON FUNCTION public.acknowledge_requisition(uuid, numeric, text) TO authenticated;

-- End of migration
