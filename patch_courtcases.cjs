const fs = require('fs');
let c = fs.readFileSync('src/pages/CourtCases.tsx', 'utf8');

c = c.replace(
  /nextCourtDate: nextDate,/g,
  "nextCourtDate: nextDate || undefined,"
);

fs.writeFileSync('src/pages/CourtCases.tsx', c);
console.log('Fixed nextCourtDate in CourtCases');
