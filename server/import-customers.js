/**
 * Import customers from a CSV exported from AppSheet / Google Sheets.
 *
 * Expected CSV columns (in any order):
 *   Customer  →  name
 *   Contact   →  phone
 *   Email     →  email
 *
 * Usage:
 *   node import-customers.js path/to/customers.csv
 *
 * Skips rows where the customer name already exists in the database.
 */

const fs   = require('fs');
const path = require('path');
const pool = require('./db/db');
require('dotenv').config();

function parseCSV(content) {
  const lines = content.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  // Normalise headers: strip quotes and whitespace, lower-case
  const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim().toLowerCase());

  return lines.slice(1).map(line => {
    // Handle commas inside quoted fields
    const values = [];
    let current = '';
    let inQuotes = false;
    for (const ch of line) {
      if (ch === '"') { inQuotes = !inQuotes; continue; }
      if (ch === ',' && !inQuotes) { values.push(current.trim()); current = ''; continue; }
      current += ch;
    }
    values.push(current.trim());

    const row = {};
    headers.forEach((h, i) => { row[h] = values[i] || ''; });
    return row;
  }).filter(row => row.customer || row.name); // skip blank rows
}

async function run() {
  const file = process.argv[2];
  if (!file) {
    console.error('Usage: node import-customers.js <path-to-csv>');
    process.exit(1);
  }

  const content = fs.readFileSync(path.resolve(file), 'utf8');
  const rows = parseCSV(content);
  console.log(`Found ${rows.length} rows to import\n`);

  // Fetch existing customer names so we can skip duplicates
  const existing = await pool.query('SELECT LOWER(name) AS name FROM customers');
  const existingNames = new Set(existing.rows.map(r => r.name));

  let inserted = 0;
  let skipped  = 0;

  for (const row of rows) {
    const name  = (row.customer || row.name || '').trim();
    const phone = (row.contact  || row.phone || '').trim() || null;
    const email = (row.email    || '').trim() || null;

    if (!name) { skipped++; continue; }

    if (existingNames.has(name.toLowerCase())) {
      console.log(`  SKIP  (already exists) — ${name}`);
      skipped++;
      continue;
    }

    await pool.query(
      'INSERT INTO customers (name, phone, email) VALUES ($1, $2, $3)',
      [name, phone, email]
    );
    existingNames.add(name.toLowerCase()); // prevent duplicates within the file too
    console.log(`  ✓  ${name}${phone ? `  |  ${phone}` : ''}${email ? `  |  ${email}` : ''}`);
    inserted++;
  }

  console.log(`\nDone — ${inserted} imported, ${skipped} skipped`);
  await pool.end();
}

run().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
