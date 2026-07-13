/**
 * NomosLink Database Migration Script v3
 * Auto-detects column differences between old and new DB.
 * Run with: node migrate.mjs
 */

const OLD_URL = "https://kinihbqjvalmsaucchii.supabase.co";
const OLD_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpbmloYnFqdmFsbXNhdWNjaGlpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjAzOTM0OCwiZXhwIjoyMDg3NjE1MzQ4fQ.rzE5oIBFnxfO5Z_RGQx5cjuH-BeVtqXw6--K_INpPh4";

const NEW_URL = "https://wxqpryxgsayeikahlabl.supabase.co";
const NEW_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4cXByeXhnc2F5ZWlrYWhsYWJsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzkzNDMzNCwiZXhwIjoyMDk5NTEwMzM0fQ.MyZ91BTmOiI33JESl3Kwsvg0BtBX-Q_VJmv6k747qf8";

const TABLES = [
  "users",
  "clients",
  "expenses",
  "court_cases",
  "transactions",
  "letters",
  "invoices",
  "tasks",
  "draft_requests",
  "filing_requests",
  "land_titles",
  "land_title_notes",
  "requisitions",
  "push_subscriptions",
];

// Fields that must not be null - fill with a default if they are
const REQUIRED_DEFAULTS = {
  users: { password: "changeme123" },
};

const headers = (key) => ({
  apikey: key,
  Authorization: `Bearer ${key}`,
  "Content-Type": "application/json",
});

/** Fetch all rows from a table */
async function fetchAll(url, key, table) {
  const res = await fetch(`${url}/rest/v1/${table}?select=*`, { headers: headers(key) });
  if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${await res.text()}`);
  return res.json();
}

/** Get the column names of a table in the NEW database by fetching one row */
async function getNewTableColumns(table) {
  // Fetch one row to see what columns the new table accepts
  const res = await fetch(`${NEW_URL}/rest/v1/${table}?select=*&limit=1`, {
    headers: headers(NEW_KEY),
  });
  if (!res.ok) throw new Error(`Schema check failed: ${res.status} ${await res.text()}`);
  const rows = await res.json();

  if (rows.length > 0) {
    // Table has data — use existing row keys
    return Object.keys(rows[0]);
  }

  // Table is empty — we can't infer columns from data.
  // Return null to signal "accept all columns"
  return null;
}

/** Strip columns from rows that don't exist in the new table */
function fitToSchema(rows, allowedColumns, defaults = {}) {
  return rows.map((row) => {
    let cleaned = allowedColumns ? Object.fromEntries(
      Object.entries(row).filter(([k]) => allowedColumns.includes(k))
    ) : { ...row };

    // Apply defaults for null required fields
    for (const [key, val] of Object.entries(defaults)) {
      if (cleaned[key] == null) cleaned[key] = val;
    }
    return cleaned;
  });
}

/** Upsert rows in chunks */
async function upsertAll(table, rows) {
  const CHUNK = 100;
  let total = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const res = await fetch(`${NEW_URL}/rest/v1/${table}`, {
      method: "POST",
      headers: { ...headers(NEW_KEY), Prefer: "resolution=merge-duplicates" },
      body: JSON.stringify(chunk),
    });
    if (!res.ok) throw new Error(`Upsert failed: ${res.status} ${await res.text()}`);
    total += chunk.length;
  }
  return total;
}

async function migrate() {
  console.log("╔════════════════════════════════════════╗");
  console.log("║   NomosLink Migration v3 (Auto-Schema) ║");
  console.log("╚════════════════════════════════════════╝\n");

  let totalRows = 0;
  const results = [];

  for (const table of TABLES) {
    process.stdout.write(`  [${table.padEnd(22)}] `);
    try {
      // 1. Fetch data from old DB
      const rawRows = await fetchAll(OLD_URL, OLD_KEY, table);

      if (rawRows.length === 0) {
        console.log(`— 0 rows (skipped)`);
        results.push({ table, status: "empty", count: 0 });
        continue;
      }

      // 2. Discover what columns the new table actually has
      let newCols = await getNewTableColumns(table);

      // If table was empty in new DB, infer columns from old data
      // (assume all columns from old data are fine — let server reject if not)
      if (newCols === null) {
        newCols = Object.keys(rawRows[0]);
      }

      // 3. Strip old rows to only include columns the new table has
      const defaults = REQUIRED_DEFAULTS[table] || {};
      const cleanedRows = fitToSchema(rawRows, newCols, defaults);

      // Log stripped columns
      const oldCols = Object.keys(rawRows[0]);
      const stripped = oldCols.filter((c) => !newCols.includes(c));
      if (stripped.length > 0) {
        process.stdout.write(`(dropping: ${stripped.join(", ")}) `);
      }

      // 4. Upsert into new DB
      const count = await upsertAll(table, cleanedRows);
      totalRows += count;
      console.log(`✓ ${count} rows`);
      results.push({ table, status: "ok", count });
    } catch (err) {
      console.log(`✗ FAILED`);
      console.error(`    → ${err.message}\n`);
      results.push({ table, status: "error", error: err.message });
    }
  }

  console.log("\n════════════════ SUMMARY ════════════════");
  for (const r of results) {
    const icon = r.status === "ok" ? "✓" : r.status === "empty" ? "—" : "✗";
    const detail = r.status === "error"
      ? `FAILED: ${r.error.slice(0, 100)}`
      : `${r.count} rows`;
    console.log(`  ${icon} ${r.table.padEnd(22)} ${detail}`);
  }
  console.log(`\n  Total rows migrated: ${totalRows}`);

  const failed = results.filter((r) => r.status === "error");
  if (failed.length === 0) {
    console.log("\n✅ All tables migrated successfully!");
    console.log('⚠️  Any user with a null password was set to "changeme123" — please update.');
  } else {
    console.log(`\n⚠️  ${failed.length} table(s) still failed. Run the SQL fixes first then re-run.`);
  }
}

migrate().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
