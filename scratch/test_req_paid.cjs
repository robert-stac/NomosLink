// Quick test: fetch one requisition and upsert it back with status="Paid" using camelCase columns
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://wxqpryxgsayeikahlabl.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4cXByeXhnc2F5ZWlrYWhsYWJsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzkzNDMzNCwiZXhwIjoyMDk5NTEwMzM0fQ.MyZ91BTmOiI33JESl3Kwsvg0BtBX-Q_VJmv6k747qf8'
);

async function main() {
  // 1. Fetch any approved requisition
  const { data: rows, error: fetchErr } = await supabase
    .from('requisitions')
    .select('*')
    .eq('status', 'Approved')
    .limit(1);

  if (fetchErr) { console.error('Fetch error:', fetchErr.message); process.exit(1); }
  if (!rows || rows.length === 0) {
    console.log('No Approved requisitions found to test with.');
    // Just show what columns exist on any row
    const { data: any } = await supabase.from('requisitions').select('*').limit(1);
    if (any && any[0]) console.log('Sample row keys:', Object.keys(any[0]));
    process.exit(0);
  }

  const req = rows[0];
  console.log('Found approved req:', req.id, '| Current status:', req.status);
  console.log('Row keys:', Object.keys(req));

  // 2. Upsert using camelCase column names (same as what requisitionToDb now sends)
  const payload = {
    id: req.id,
    title: req.title,
    amount: req.amount,
    notes: req.notes,
    category: req.category,
    status: 'Paid',                      // <-- the change we want to persist
    submittedById: req.submittedById,
    submittedByName: req.submittedByName,
    dateSubmitted: req.dateSubmitted,
    approvedById: req.approvedById,
    approvedByName: req.approvedByName,
    dateApproved: req.dateApproved,
    paidById: 'test-accountant-id',
    paidByName: 'Test Accountant',
    datePaid: new Date().toISOString(),
    rejectionReason: req.rejectionReason,
    relatedFileId: req.relatedFileId,
    relatedFileType: req.relatedFileType,
    relatedFileName: req.relatedFileName,
  };

  console.log('\nUpserting payload with status=Paid...');
  const { error: upsertErr } = await supabase
    .from('requisitions')
    .upsert(payload, { onConflict: 'id' });

  if (upsertErr) {
    console.error('UPSERT FAILED:', upsertErr.message, upsertErr.details);
    process.exit(1);
  }

  // 3. Re-fetch to confirm it was written
  const { data: after } = await supabase.from('requisitions').select('*').eq('id', req.id).single();
  console.log('\nAfter upsert:');
  console.log('  status   :', after?.status);
  console.log('  paidById :', after?.paidById);
  console.log('  paidByName:', after?.paidByName);
  console.log('  datePaid :', after?.datePaid);

  if (after?.status === 'Paid') {
    console.log('\n✅ SUCCESS — camelCase upsert works correctly.');
    // Restore original status so we don't mess up real data
    await supabase.from('requisitions').upsert({ id: req.id, status: req.status, paidById: null, paidByName: null, datePaid: null }, { onConflict: 'id' });
    console.log('(Row restored to original status)');
  } else {
    console.log('\n❌ FAIL — status was not updated in DB.');
  }
}

main().catch(console.error);
