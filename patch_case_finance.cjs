const fs = require('fs');

// Fix LawyerCourtCaseDetails.tsx
(function() {
  const p = 'src/pages/Lawyer/LawyerCourtCaseDetails.tsx';
  let c = fs.readFileSync(p, 'utf8');
  
  // Replace billed display
  c = c.replace(
    /UGX \{(\(courtCase\.billed \|\| 0\))\.toLocaleString\(\)\}/,
    `{(() => {
                        const inv = (invoices || []).filter(i => i.relatedFileId === courtCase.id || (i.relatedFile && i.relatedFile.toLowerCase() === courtCase.fileName?.toLowerCase()));
                        const invBilled = inv.reduce((s, i) => s + (Number(i.amountBilled) || 0), 0);
                        const eff = (courtCase.billed || 0) > 0 ? (courtCase.billed || 0) : invBilled;
                        return 'UGX ' + eff.toLocaleString();
                      })()}`
  );

  // Replace outstanding balance display
  c = c.replace(
    /UGX \{\(\(courtCase\?\.billed \|\| 0\) - getFilePaidAmount\(courtCase\?\.id, expenses\)\)\.toLocaleString\(\)\}/,
    `{(() => {
                        const inv = (invoices || []).filter(i => i.relatedFileId === courtCase.id || (i.relatedFile && i.relatedFile.toLowerCase() === courtCase.fileName?.toLowerCase()));
                        const invBilled = inv.reduce((s, i) => s + (Number(i.amountBilled) || 0), 0);
                        const eff = (courtCase.billed || 0) > 0 ? (courtCase.billed || 0) : invBilled;
                        return 'UGX ' + (eff - getFilePaidAmount(courtCase?.id, expenses)).toLocaleString();
                      })()}`
  );

  fs.writeFileSync(p, c);
  console.log('LawyerCourtCaseDetails patched');
})();

// Fix LawyerLetterDetails.tsx
(function() {
  const p = 'src/pages/Lawyer/LawyerLetterDetails.tsx';
  let c = fs.readFileSync(p, 'utf8');
  
  c = c.replace(
    /UGX \{getFilePaidAmount\(letter\?\.id, expenses\)\.toLocaleString\(\)\}/,
    `UGX {getFilePaidAmount(letter?.id, expenses).toLocaleString()}`
  );
  
  // Fix letter billed - add invoice fallback
  c = c.replace(
    /\(letter\?\.billed \|\| 0\)/g,
    `(() => { const inv = (invoices || []).filter(i => i.relatedFileId === letter?.id || (i.relatedFile && i.relatedFile.toLowerCase() === letter?.subject?.toLowerCase())); const invB = inv.reduce((s,i)=>s+(Number(i.amountBilled)||0),0); return (letter?.billed||0)>0?(letter?.billed||0):invB; })()`
  );

  fs.writeFileSync(p, c);
  console.log('LawyerLetterDetails patched');
})();

// Fix TransactionDetails.tsx
(function() {
  const p = 'src/pages/Lawyer/TransactionDetails.tsx';
  let c = fs.readFileSync(p, 'utf8');

  // Fix billed display - add invoice fallback
  c = c.replace(
    /\(transaction\?\.billed \|\| transaction\?\.billedAmount \|\| 0\) - getFilePaidAmount\(transaction\?\.id, expenses\)/g,
    `(() => { const inv = (invoices || []).filter(i => i.relatedFileId === transaction?.id || (i.relatedFile && i.relatedFile.toLowerCase() === transaction?.fileName?.toLowerCase())); const invB = inv.reduce((s,i)=>s+(Number(i.amountBilled)||0),0); const eff = (transaction?.billedAmount||transaction?.billed||0)>0?(transaction?.billedAmount||transaction?.billed||0):invB; return eff - getFilePaidAmount(transaction?.id, expenses); })()`
  );

  fs.writeFileSync(p, c);
  console.log('TransactionDetails patched');
})();
