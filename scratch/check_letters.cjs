const fetch = require('node-fetch');
fetch('https://wxqpryxgsayeikahlabl.supabase.co/rest/v1/letters?select=*&limit=1', {
    headers: {
        apikey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4cXByeXhnc2F5ZWlrYWhsYWJsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzkzNDMzNCwiZXhwIjoyMDk5NTEwMzM0fQ.MyZ91BTmOiI33JESl3Kwsvg0BtBX-Q_VJmv6k747qf8',
        Authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4cXByeXhnc2F5ZWlrYWhsYWJsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzkzNDMzNCwiZXhwIjoyMDk5NTEwMzM0fQ.MyZ91BTmOiI33JESl3Kwsvg0BtBX-Q_VJmv6k747qf8'
    }
}).then(r=>r.json()).then(data => console.log(data));
