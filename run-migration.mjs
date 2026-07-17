/**
 * Run Supabase migrations
 * Usage: node run-migration.mjs
 * 
 * NOTE: This requires running SQL migrations through the Supabase dashboard.
 * Go to: https://app.supabase.com/project/wxqpryxgsayeikahlabl/sql/new
 * And run the SQL from supabase/migrations/20260717_add_expense_linking.sql
 */

import fs from 'fs';
import path from 'path';

console.log(`
╔════════════════════════════════════════════════════════════════╗
║           Supabase Migration Required                          ║
╚════════════════════════════════════════════════════════════════╝

The expense table needs to be updated with new columns for linking 
expenses to files and staff.

📋 Migration File: supabase/migrations/20260717_add_expense_linking.sql

To apply this migration:

1. Go to Supabase Dashboard: 
   https://app.supabase.com/project/wxqpryxgsayeikahlabl/sql/new

2. Copy and paste the SQL below into the editor:
`);

const migrationFile = path.join(process.cwd(), 'supabase/migrations/20260717_add_expense_linking.sql');
const migrationSQL = fs.readFileSync(migrationFile, 'utf8');

console.log(migrationSQL);

console.log(`
3. Click "Run" to execute the migration

4. You should see "Success" confirming the columns were added

The new columns are:
  - type: VARCHAR(10) - 'in' or 'out'
  - staffId: TEXT - UUID of staff member
  - staffName: TEXT - Name of staff member
  - relatedFileId: TEXT - UUID of related court case, transaction, or letter
  - relatedFileType: VARCHAR(50) - Type: 'case', 'transaction', 'letter', or 'title'
  - relatedFileName: TEXT - Name of the related file

After running the migration, restart the app development server.
`);
