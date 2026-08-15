const fetch = require('node-fetch');

const l = {
  "id": Date.now().toString(),
  "type": "Incoming",
  "lawyerId": "some-lawyer-id",
  "clientId": "some-client-id",
  "recipient": "N/A",
  "subject": "Test subject",
  "fileName": "Test file name",
  "date": "",
  "status": "Pending",
  "billed": 1000,
  "paid": 0
};

fetch('https://wxqpryxgsayeikahlabl.supabase.co/rest/v1/letters', {
    method: 'POST',
    headers: {
        apikey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4cXByeXhnc2F5ZWlrYWhsYWJsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzkzNDMzNCwiZXhwIjoyMDk5NTEwMzM0fQ.MyZ91BTmOiI33JESl3Kwsvg0BtBX-Q_VJmv6k747qf8',
        Authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4cXByeXhnc2F5ZWlrYWhsYWJsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzkzNDMzNCwiZXhwIjoyMDk5NTEwMzM0fQ.MyZ91BTmOiI33JESl3Kwsvg0BtBX-Q_VJmv6k747qf8',
        'Prefer': 'return=representation,resolution=merge-duplicates',
        'Content-Type': 'application/json'
    },
    body: JSON.stringify(l)
}).then(r => r.text()).then(console.log).catch(console.error);
