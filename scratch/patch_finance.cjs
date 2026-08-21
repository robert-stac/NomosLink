const fs = require('fs');
const path = require('path');

const financeUtilImport = `import { getFilePaidAmount } from "../utils/financeUtils";`;
const financeUtilImportComponent = `import { getFilePaidAmount } from "../../utils/financeUtils";`;

function addImport(content, importStatement) {
  if (content.includes("getFilePaidAmount")) return content;
  return importStatement + "\n" + content;
}

// 1. Dashboard.tsx
let dbPath = path.join(__dirname, 'src/pages/Dashboard.tsx');
let dbContent = fs.readFileSync(dbPath, 'utf8');
dbContent = addImport(dbContent, financeUtilImport);
dbContent = dbContent.replace(
  /const allItems = \[\s*\.\.\.\(transactions \|\| \[\]\)\.map\(t => \(\{ billed: Number\(t\.billedAmount \|\| 0\), paid: Number\(t\.paidAmount \|\| 0\) \}\)\),\s*\.\.\.\(courtCases \|\| \[\]\)\.map\(c => \(\{ billed: Number\(c\.billed \|\| 0\), paid: Number\(c\.paid \|\| 0\) \}\)\),\s*\.\.\.\(letters \|\| \[\]\)\.map\(l => \(\{ billed: Number\(l\.billed \|\| 0\), paid: Number\(l\.paid \|\| 0\) \}\)\)\s*\];/g,
  `const allItems = [
      ...(transactions || []).map(t => ({ billed: Number(t.billedAmount || 0), paid: getFilePaidAmount(t.id, expenses) })),
      ...(courtCases || []).map(c => ({ billed: Number(c.billed || 0), paid: getFilePaidAmount(c.id, expenses) })),
      ...(letters || []).map(l => ({ billed: Number(l.billed || 0), paid: getFilePaidAmount(l.id, expenses) }))
    ];`
);
fs.writeFileSync(dbPath, dbContent);

// 2. ManagerDashboard.tsx
let mdPath = path.join(__dirname, 'src/pages/ManagerDashboard.tsx');
let mdContent = fs.readFileSync(mdPath, 'utf8');
mdContent = addImport(mdContent, financeUtilImport);
mdContent = mdContent.replace(
  /const totalPaidAll = allActiveFiles\.reduce\(\(s, f: any\) => s \+ Number\(f\.paid \|\| f\.paidAmount \|\| 0\), 0\);/g,
  `const totalPaidAll = allActiveFiles.reduce((s, f: any) => s + getFilePaidAmount(f.id, expenses), 0);`
);
mdContent = mdContent.replace(
  /const paid = Number\(f\.paid \|\| f\.paidAmount \|\| 0\);/g,
  `const paid = getFilePaidAmount(f.id, expenses);`
);
mdContent = mdContent.replace(
  /const paid = c\.paid \|\| c\.paidAmount \|\| 0;/g,
  `const paid = getFilePaidAmount(c.id, expenses);`
);
fs.writeFileSync(mdPath, mdContent);

// 3. Letters.tsx
let ltPath = path.join(__dirname, 'src/pages/Letters.tsx');
let ltContent = fs.readFileSync(ltPath, 'utf8');
ltContent = addImport(ltContent, financeUtilImport);
ltContent = ltContent.replace(
  /setPaid\(l\.paid\?\.toString\(\) \|\| ""\);/g,
  `setPaid(getFilePaidAmount(l.id, expenses).toString());`
);
ltContent = ltContent.replace(
  /l\.paid/g,
  `getFilePaidAmount(l.id, expenses)`
);
fs.writeFileSync(ltPath, ltContent);

console.log("Patched files");
