const fs = require('fs');

const path = 'src/pages/Expenses.tsx';
let content = fs.readFileSync(path, 'utf8');
let original = content;

// 1. Type definition
content = content.replace(/"Cheque"/g, '"Bank Transfer/ Cheque"');

// But wait, changing all "Cheque" to "Bank Transfer/ Cheque" might be too broad? 
// Let's do it safely.

let lines = content.split('\n');
for (let i = 0; i < lines.length; i++) {
    // Revert balance calculations to support BOTH
    if (lines[i].includes('method === "Bank Transfer/ Cheque"')) {
        lines[i] = lines[i].replace('method === "Bank Transfer/ Cheque"', '(method === "Cheque" || method === "Bank Transfer/ Cheque")');
    }
    if (lines[i].includes('source === "Bank Transfer/ Cheque"')) {
        lines[i] = lines[i].replace('source === "Bank Transfer/ Cheque"', '(source === "Cheque" || source === "Bank Transfer/ Cheque")');
    }
    if (lines[i].includes('dest === "Bank Transfer/ Cheque"')) {
        lines[i] = lines[i].replace('dest === "Bank Transfer/ Cheque"', '(dest === "Cheque" || dest === "Bank Transfer/ Cheque")');
    }
    if (lines[i].includes("exp.paymentMethod === 'Cheque'")) {
        lines[i] = lines[i].replace("exp.paymentMethod === 'Cheque'", "(exp.paymentMethod === 'Cheque' || exp.paymentMethod === 'Bank Transfer/ Cheque')");
    }
    
    // UI strings with single quotes
    if (lines[i].includes("'Cheque'")) {
        lines[i] = lines[i].replace(/'Cheque'/g, "'Bank Transfer/ Cheque'");
    }
    
    // UI labels
    if (lines[i].includes("📝 Cheque / Bank")) {
        lines[i] = lines[i].replace("📝 Cheque / Bank", "📝 Bank Transfer / Cheque");
    }
    if (lines[i].includes('value="Cheque"')) {
        lines[i] = lines[i].replace('value="Cheque"', 'value="Bank Transfer/ Cheque"');
        lines[i] = lines[i].replace('>Cheque/Bank<', '>Bank Transfer/ Cheque<');
    }
    
    if (lines[i].includes("Cheque/mobile money")) {
        lines[i] = lines[i].replace("Cheque/mobile money", "Bank Transfer/ Cheque");
    }
}

content = lines.join('\n');

if (content !== original) {
    fs.writeFileSync(path, content, 'utf8');
    console.log("Changes written to file!");
} else {
    console.log("No changes made!");
}
