const fs = require('fs');
let c = fs.readFileSync('src/context/AppContext.tsx', 'utf8');
c = c.replace(/\.update\(scalarUpdate\)\.eq\('id', id\)\.then\(\);/g, 
  ".update(scalarUpdate).eq('id', id).then(({error}) => { if(error) console.error('Update Error:', error); });");

fs.writeFileSync('src/context/AppContext.tsx', c);
console.log('Added error logging');
