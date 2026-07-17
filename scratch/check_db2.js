const urlBase = 'https://wxqpryxgsayeikahlabl.supabase.co/rest/v1';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4cXByeXhnc2F5ZWlrYWhsYWJsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5MzQzMzQsImV4cCI6MjA5OTUxMDMzNH0.HXVvEUl7ZtBlKwDAeHXt8sTJqUU3q_BUXEjsAQRHWt0';

async function check() {
  const getKeys = async (table) => {
    const res = await fetch(`${urlBase}/${table}?limit=1`, {
      headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
    });
    const data = await res.json();
    console.log(`--- ${table} ---`);
    console.log(Object.keys(data[0] || {}));
  };
  await getKeys('transactions');
  await getKeys('letters');
  await getKeys('tasks');
}
check();
