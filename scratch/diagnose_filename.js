// Diagnostic: Check what Supabase actually returns for expenses
import { createClient } from '@supabase/supabase-js';

// Read the supabase config
import fs from 'fs';
const clientFile = fs.readFileSync('src/lib/supabaseClient.ts', 'utf8');
const urlMatch = clientFile.match(/createClient\(\s*['"]([^'"]+)['"]/);
const keyMatch = clientFile.match(/['"]([^'"]+)['"]\s*\)/);

if (!urlMatch || !keyMatch) {
  console.error('Could not parse supabase config');
  process.exit(1);
}

const supabase = createClient(urlMatch[1], keyMatch[1]);

async function diagnose() {
  // 1. Get a sample expense from the DB
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .limit(5);

  if (error) {
    console.error('Query failed:', error.message);
    return;
  }

  console.log('=== RAW COLUMN NAMES FROM DB ===');
  if (data && data.length > 0) {
    console.log('Columns:', Object.keys(data[0]));
    console.log('\n=== SAMPLE ROWS ===');
    data.forEach((row, i) => {
      console.log(`\nRow ${i + 1}:`);
      console.log('  id:', row.id);
      console.log('  type:', row.type);
      console.log('  relatedfileid:', row.relatedfileid);
      console.log('  relatedFileId:', row.relatedFileId);
      console.log('  relatedfilename:', row.relatedfilename);
      console.log('  relatedFileName:', row.relatedFileName);
      console.log('  staffname:', row.staffname);
      console.log('  staffName:', row.staffName);
      console.log('  paymentmethod:', row.paymentmethod);
      console.log('  paymentMethod:', row.paymentMethod);
      console.log('  purpose:', row.purpose);
      console.log('  description:', row.description);
    });
  } else {
    console.log('No expenses found in DB');
  }
}

diagnose();
