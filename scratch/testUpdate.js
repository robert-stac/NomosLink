const urlBase = 'https://wxqpryxgsayeikahlabl.supabase.co/rest/v1';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4cXByeXhnc2F5ZWlrYWhsYWJsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5MzQzMzQsImV4cCI6MjA5OTUxMDMzNH0.HXVvEUl7ZtBlKwDAeHXt8sTJqUU3q_BUXEjsAQRHWt0';

async function testUpdate() {
  // get a case
  const res1 = await fetch(`${urlBase}/court_cases?limit=1`, {
    headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
  });
  const data1 = await res1.json();
  if (!data1.length) return console.log("No court cases found");
  const courtCase = data1[0];
  console.log("Original progressNotes:", JSON.stringify(courtCase.progressNotes));

  const newNotes = [...(courtCase.progressNotes || []), { id: "test-id", message: "test note", date: new Date().toISOString() }];
  
  const res2 = await fetch(`${urlBase}/court_cases?id=eq.${courtCase.id}`, {
    method: 'PATCH',
    headers: { 'apikey': key, 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ progressNotes: newNotes })
  });
  
  if (!res2.ok) {
    console.log("Update failed:", await res2.text());
    return;
  }
  console.log("Update succeeded");

  const res3 = await fetch(`${urlBase}/court_cases?id=eq.${courtCase.id}`, {
    headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
  });
  const data3 = await res3.json();
  console.log("Updated progressNotes:", JSON.stringify(data3[0].progressNotes));
}
testUpdate();
