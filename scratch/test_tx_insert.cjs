const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://wxqpryxgsayeikahlabl.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4cXByeXhnc2F5ZWlrYWhsYWJsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzkzNDMzNCwiZXhwIjoyMDk5NTEwMzM0fQ.MyZ91BTmOiI33JESl3Kwsvg0BtBX-Q_VJmv6k747qf8'
);

async function testInsert() {
  console.log("Testing insert without id:");
  const txNoId = {
    fileName: 'Test Transaction',
    type: 'Sale',
    billedAmount: 1000,
    paidAmount: 500,
    balance: 500,
    clientId: '70267c46-9d3e-436f-b258-c9171e16dff9',
    lawyerId: 'd70d4e47-1422-4501-961a-c1e69a1c15d7'
  };

  const { data: dataNoId, error: errNoId } = await supabase
    .from('transactions')
    .insert([txNoId])
    .select();

  console.log("Result no ID:");
  console.log("Data:", dataNoId);
  console.log("Error:", errNoId);

  console.log("\nTesting insert WITH id:");
  const txWithId = {
    ...txNoId,
    id: require('crypto').randomUUID()
  };

  const { data: dataWithId, error: errWithId } = await supabase
    .from('transactions')
    .insert([txWithId])
    .select();

  console.log("Result with ID:");
  console.log("Data:", dataWithId);
  console.log("Error:", errWithId);

  // Clean up if it succeeded
  if (dataWithId && dataWithId[0]) {
    await supabase.from('transactions').delete().eq('id', txWithId.id);
  }
  if (dataNoId && dataNoId[0]) {
    await supabase.from('transactions').delete().eq('id', dataNoId[0].id);
  }
}

testInsert();
