const urlBase = 'https://wxqpryxgsayeikahlabl.supabase.co/rest/v1';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4cXByeXhnc2F5ZWlrYWhsYWJsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5MzQzMzQsImV4cCI6MjA5OTUxMDMzNH0.HXVvEUl7ZtBlKwDAeHXt8sTJqUU3q_BUXEjsAQRHWt0';

async function testUpdate() {
  const res1 = await fetch(`${urlBase}/court_cases?limit=1`, {
    headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
  });
  const data1 = await res1.json();
  const courtCase = data1[0];
  console.log("Original nextCourtDate:", courtCase.nextCourtDate);

  const newDate = new Date().toISOString();
  
  const res2 = await fetch(`${urlBase}/court_cases?id=eq.${courtCase.id}`, {
    method: 'PATCH',
    headers: { 'apikey': key, 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ nextCourtDate: newDate })
  });
  
  if (!res2.ok) {
    console.log("Update failed:", await res2.text());
    return;
  }
  
  const res3 = await fetch(`${urlBase}/court_cases?id=eq.${courtCase.id}`, {
    headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
  });
  const data3 = await res3.json();
  console.log("Updated nextCourtDate:", data3[0].nextCourtDate);
}
testUpdate();
