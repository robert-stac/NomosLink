const fs = require('fs');

const path = 'src/pages/Expenses.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Type definition
content = content.replace(
  `| "Cheque" |`,
  `| "Bank Transfer/ Cheque" |`
);

// 2. Balance calculations
content = content.replace(/method === "Cheque"/g, `(method === "Cheque" || method === "Bank Transfer/ Cheque")`);
content = content.replace(/source === "Cheque"/g, `(source === "Cheque" || source === "Bank Transfer/ Cheque")`);
content = content.replace(/dest === "Cheque"/g, `(dest === "Cheque" || dest === "Bank Transfer/ Cheque")`);

// 3. Alerts
content = content.replace(/"Please select a payment method \(Cash, Cheque, or Mobile Money\)\."/g, `"Please select a payment method (Cash, Bank Transfer/ Cheque, or Mobile Money)."`);
content = content.replace(/"Please select a source account \(Cash, Cheque, Mobile Money, or Petty Cash\)\."/g, `"Please select a source account (Cash, Bank Transfer/ Cheque, Mobile Money, or Petty Cash)."`);
content = content.replace(/"Please select a source account \(Cash, Cheque, or Mobile Money\) to transfer from\."/g, `"Please select a source account (Cash, Bank Transfer/ Cheque, or Mobile Money) to transfer from."`);

// 4. UI Text/Options
content = content.replace(/📝 Cheque \/ Bank/g, `📝 Bank Transfer/ Cheque`);
content = content.replace(/<option value="Cheque">Cheque\/Bank<\/option>/g, `<option value="Bank Transfer/ Cheque">Bank Transfer/ Cheque</option>`);

// 5. Table rendering
content = content.replace(/exp\.paymentMethod === 'Cheque'/g, `(exp.paymentMethod === 'Cheque' || exp.paymentMethod === 'Bank Transfer/ Cheque')`);

// 6. Button mapping arrays
content = content.replace(/\["Cash", "Cheque", "Mobile Money"\]/g, `["Cash", "Bank Transfer/ Cheque", "Mobile Money"]`);
content = content.replace(/\["Cash", "Cheque", "Mobile Money", "Petty Cash"\]/g, `["Cash", "Bank Transfer/ Cheque", "Mobile Money", "Petty Cash"]`);

// 7. Icon conditions in buttons
content = content.replace(/method === 'Cheque\/mobile money'/g, `method === 'Bank Transfer/ Cheque'`);
content = content.replace(/method === 'Cheque'/g, `method === 'Bank Transfer/ Cheque'`);

fs.writeFileSync(path, content, 'utf8');
console.log('Done!');
