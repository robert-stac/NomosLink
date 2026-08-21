const fs = require('fs');
let content = fs.readFileSync('src/context/AppContext.tsx', 'utf8');

content = content.replace(/filter: 'recipient_id=eq\.' \+ currentUser\.id,/g, "filter: 'recipientid=eq.' + currentUser.id,");
content = content.replace(/recipientId: raw\.recipient_id \?\? raw\.recipientId,/g, "recipientId: raw.recipientid ?? raw.recipient_id ?? raw.recipientId,");
content = content.replace(/\.eq\('recipientId', currentUser\.id\)/g, ".eq('recipientid', currentUser.id)");
content = content.replace(/recipient_id: n\.recipientId,/g, "recipientid: n.recipientId,");
content = content.replace(/\.eq\('recipient_id', userId\);/g, ".eq('recipientid', userId);");

fs.writeFileSync('src/context/AppContext.tsx', content);
console.log('AppContext notifications patched for recipientid');
