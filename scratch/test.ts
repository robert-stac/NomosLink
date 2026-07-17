import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://wxqpryxgsayeikahlabl.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4cXByeXhnc2F5ZWlrYWhsYWJsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5MzQzMzQsImV4cCI6MjA5OTUxMDMzNH0.HXVvEUl7ZtBlKwDAeHXt8sTJqUU3q_BUXEjsAQRHWt0'
);

async function test() {
  const { data: ccList, error: err } = await supabase.from('court_cases').select('*').limit(1);
  if (!ccList || ccList.length === 0) return console.log("No court case");
  const cc = ccList[0];
  console.log("Current progress notes:", JSON.stringify(cc.progressNotes, null, 2));
}

test();
