const fs = require('fs');
const path = require('path');

const financeUtilImport = `import { getFilePaidAmount } from "../utils/financeUtils";`;
const financeUtilImportLawyer = `import { getFilePaidAmount } from "../../utils/financeUtils";`;

function addImport(content, importStatement) {
  if (content.includes("getFilePaidAmount")) return content;
  return importStatement + "\n" + content;
}

const root = process.cwd(); // Assuming it runs from transaction-app

// Helper to process a file
function processFile(filePath, importStmt, replaceLogic) {
  let fullPath = path.join(root, filePath);
  if (!fs.existsSync(fullPath)) return;
  let content = fs.readFileSync(fullPath, 'utf8');
  content = addImport(content, importStmt);
  content = replaceLogic(content);
  fs.writeFileSync(fullPath, content);
  console.log(`Patched ${filePath}`);
}

// 1. Clients.tsx
processFile('src/pages/Clients.tsx', financeUtilImport, (c) => {
  // Line 159
  c = c.replace(
    /clientCases\.reduce\(\(sum, c\) => sum \+ getFileLegacyPaid\(c\.id, c\.fileName, c\.paid\), 0\)/g,
    `clientCases.reduce((sum, c) => sum + getFilePaidAmount(c.id, expenses), 0)`
  );
  c = c.replace(
    /clientTransactions\.reduce\(\(sum, t\) => sum \+ getFileLegacyPaid\(t\.id, t\.fileName, t\.paidAmount\), 0\)/g,
    `clientTransactions.reduce((sum, t) => sum + getFilePaidAmount(t.id, expenses), 0)`
  );
  c = c.replace(
    /clientLetters\.reduce\(\(sum, l\) => sum \+ getFileLegacyPaid\(l\.id, l\.subject, l\.paid\), 0\)/g,
    `clientLetters.reduce((sum, l) => sum + getFilePaidAmount(l.id, expenses), 0)`
  );
  
  // getFileLegacyPaid function might be removed or left unused, we'll leave it
  // c.paid || 0 -> getFilePaidAmount(c.id, expenses) in exports
  c = c.replace(
    /c\.paid \|\| 0\)/g,
    `getFilePaidAmount(c.id, expenses))`
  );
  c = c.replace(
    /t\.paidAmount \|\| 0\)/g,
    `getFilePaidAmount(t.id, expenses))`
  );
  c = c.replace(
    /l\.paid \|\| 0\)/g,
    `getFilePaidAmount(l.id, expenses))`
  );
  c = c.replace(
    /file\.paid/g,
    `getFilePaidAmount(file.id, expenses)`
  );
  return c;
});

// 2. CourtCases.tsx
processFile('src/pages/CourtCases.tsx', financeUtilImport, (c) => {
  // const totalPaid = (Number(c.paid) || 0) + expensesPaid;
  c = c.replace(
    /const totalPaid = \(Number\(c\.paid\) \|\| 0\) \+ expensesPaid;/g,
    `const totalPaid = expensesPaid;` // because expensesPaid already calculated it
  );
  // c.paid || 0 -> getFilePaidAmount(c.id, expenses)
  c = c.replace(
    /const existingPaid = editingId \? \(courtCases\.find\(c => c\.id === editingId\)\?\.paid \|\| 0\) : 0;/g,
    `const existingPaid = editingId ? getFilePaidAmount(editingId, expenses) : 0;`
  );
  return c;
});

// 3. AdminLawyerPerformance.tsx
processFile('src/pages/AdminLawyerPerformance.tsx', financeUtilImport, (c) => {
  c = c.replace(
    /m\.finance\.paid/g,
    `m.finance.paid` // wait, m.finance.paid might be calculated earlier, let's leave this file alone or check later.
  );
  return c;
});

// 4. LawyerCourtCaseDetails.tsx
processFile('src/pages/Lawyer/LawyerCourtCaseDetails.tsx', financeUtilImportLawyer, (c) => {
  c = c.replace(
    /UGX \{\(courtCase\.paid \|\| 0\)\.toLocaleString\(\)\}/g,
    `UGX {getFilePaidAmount(courtCase?.id, expenses).toLocaleString()}`
  );
  c = c.replace(
    /UGX \{\(\(courtCase\.billed \|\| 0\) - \(courtCase\.paid \|\| 0\)\)\.toLocaleString\(\)\}/g,
    `UGX {((courtCase?.billed || 0) - getFilePaidAmount(courtCase?.id, expenses)).toLocaleString()}`
  );
  return c;
});

// 5. CourtCaseDetails.tsx
processFile('src/pages/Lawyer/CourtCaseDetails.tsx', financeUtilImportLawyer, (c) => {
  c = c.replace(
    /const paid = courtCase\.paid \|\| 0;/g,
    `const paid = getFilePaidAmount(courtCase?.id, expenses);`
  );
  return c;
});

// 6. LawyerLetterDetails.tsx
processFile('src/pages/Lawyer/LawyerLetterDetails.tsx', financeUtilImportLawyer, (c) => {
  c = c.replace(
    /UGX \{\(letter\.paid \|\| 0\)\.toLocaleString\(\)\}/g,
    `UGX {getFilePaidAmount(letter?.id, expenses).toLocaleString()}`
  );
  c = c.replace(
    /UGX \{\(\(letter\.billed \|\| 0\) - \(letter\.paid \|\| 0\)\)\.toLocaleString\(\)\}/g,
    `UGX {((letter?.billed || 0) - getFilePaidAmount(letter?.id, expenses)).toLocaleString()}`
  );
  return c;
});

// 7. TransactionDetails.tsx
processFile('src/pages/Lawyer/TransactionDetails.tsx', financeUtilImportLawyer, (c) => {
  c = c.replace(
    /UGX \{\(transaction\.paid \|\| transaction\.paidAmount \|\| 0\)\.toLocaleString\(\)\}/g,
    `UGX {getFilePaidAmount(transaction?.id, expenses).toLocaleString()}`
  );
  c = c.replace(
    /UGX \{\(\(transaction\.billed \|\| transaction\.billedAmount \|\| 0\) - \(transaction\.paid \|\| transaction\.paidAmount \|\| 0\)\)\.toLocaleString\(\)\}/g,
    `UGX {((transaction?.billed || transaction?.billedAmount || 0) - getFilePaidAmount(transaction?.id, expenses)).toLocaleString()}`
  );
  return c;
});

// 8. Transactions.tsx
processFile('src/pages/Transactions.tsx', financeUtilImport, (c) => {
  // It probably has similar logic to Letters and CourtCases.
  // I will just use run_command with sed if needed.
  return c;
});
