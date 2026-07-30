import { createClient } from '@supabase/supabase-js';
const url = 'https://wxqpryxgsayeikahlabl.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4cXByeXhnc2F5ZWlrYWhsYWJsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5MzQzMzQsImV4cCI6MjA5OTUxMDMzNH0.HXVvEUl7ZtBlKwDAeHXt8sTJqUU3q_BUXEjsAQRHWt0';
const sb = createClient(url, key);

async function check() {
  const dummyId = '00000000-0000-0000-0000-000000000000';
  const { data, error } = await sb.from('expenses').upsert([{
    id: dummyId,
    amount: 1,
    date: '2026-07-30',
    description: 'Testing check constraint',
    type: 'transfer',
  }]);
  
  if (error) {
    console.log("Error inserting type=transfer:", error.message);
  } else {
    console.log("Success! type=transfer is allowed.");
    // Clean up
    await sb.from('expenses').delete().eq('id', dummyId);
  }
}
check();
