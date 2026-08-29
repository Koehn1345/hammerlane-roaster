/**
 * One-time setup: creates the green_bean_shipments log table and seeds one
 * "opening balance" entry per existing green_beans row so the shipment history
 * page isn't empty. That seed entry represents today's consolidated total, not
 * the original individual purchase dates — those were merged away by
 * consolidate-green-beans.js before this table existed. Every shipment entered
 * from here on is logged individually.
 *
 * Usage:
 *   node create-green-bean-shipments-table.js
 */

const pool = require('./db/db');

async function run() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS green_bean_shipments (
        id SERIAL PRIMARY KEY,
        green_bean_id INTEGER REFERENCES green_beans(id) ON DELETE CASCADE,
        supplier VARCHAR(255),
        lbs_purchased DECIMAL(10,2),
        total_cost DECIMAL(10,2),
        cost_per_lb DECIMAL(10,2),
        date_received DATE,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    const { rows: unseeded } = await client.query(`
      SELECT gb.id FROM green_beans gb
      WHERE NOT EXISTS (SELECT 1 FROM green_bean_shipments s WHERE s.green_bean_id = gb.id)
    `);

    for (const { id } of unseeded) {
      await client.query(
        `INSERT INTO green_bean_shipments (green_bean_id, supplier, lbs_purchased, total_cost, cost_per_lb, date_received)
         SELECT id, supplier, lbs_purchased, total_cost, cost_per_lb, date_received FROM green_beans WHERE id = $1`,
        [id]
      );
    }

    await client.query('COMMIT');
    console.log(`Created green_bean_shipments table, seeded ${unseeded.length} opening-balance entr${unseeded.length === 1 ? 'y' : 'ies'}.`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error:', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

run();
