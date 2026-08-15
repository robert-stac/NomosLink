const fetch = require('node-fetch');
fetch('https://wxqpryxgsayeikahlabl.supabase.co/rest/v1/letters', {
    method: 'POST',
    headers: {
        apikey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4cXByeXhnc2F5ZWlrYWhsYWJsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzkzNDMzNCwiZXhwIjoyMDk5NTEwMzM0fQ.MyZ91BTmOiI33JESl3Kwsvg0BtBX-Q_VJmv6k747qf8',
        Authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4cXByeXhnc2F5ZWlrYWhsYWJsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzkzNDMzNCwiZXhwIjoyMDk5NTEwMzM0fQ.MyZ91BTmOiI33JESl3Kwsvg0BtBX-Q_VJmv6k747qf8',
        'Prefer': 'return=representation',
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        id: Date.now().toString(),
        type: 'Incoming',
        lawyerId: 'test',
        clientId: 'test',
        recipient: 'test',
        subject: 'test',
        fileName: 'test',
        date: '2026-08-15',
        status: 'Pending',
        billed: 100,
        paid: 0
    })
}).then(r => r.text()).then(console.log).catch(console.error);
