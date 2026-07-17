import { createClient } from '@supabase/supabase-js';
const url = 'https://wxqpryxgsayeikahlabl.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4cXByeXhnc2F5ZWlrYWhsYWJsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5MzQzMzQsImV4cCI6MjA5OTUxMDMzNH0.HXVvEUl7ZtBlKwDAeHXt8sTJqUU3q_BUXEjsAQRHWt0';
const sb = createClient(url, key);

async function checkType() {
  const { data, error } = await sb.from('court_cases').select('progressNotes').limit(1);
  console.log(data);
  console.log(typeof data[0].progressNotes);
  if (Array.isArray(data[0].progressNotes)) console.log('It is an array!');
}
checkType();
