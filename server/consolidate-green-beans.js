/**
 * One-time migration: collapses duplicate green_beans rows (same origin, different
 * shipments/suppliers) down to a single row per origin, then locks that in with a
 * unique index so it can't drift apart again.
 *
 * For each origin with more than one row:
 *   - lbs_purchased / lbs_remaining are summed across the group
 *   - total_cost is summed (a row missing total_cost but with a cost_per_lb already
 *     set falls back to lbs_purchased * cost_per_lb, so legacy rows aren't treated
 *     as free beans)
 *   - cost_per_lb is recomputed as total_cost / lbs_purchased (pound-weighted)
 *   - supplier becomes every distinct supplier in the group, oldest first
 *   - the row with the latest date_received survives; the rest are deleted after
 *     any blend_components pointing at them are repointed to the survivor
 *
 * Usage:
 *   node consolidate-green-beans.js
 */

const pool = require('./db/db');

function effectiveCost(row) {
  if (row.total_cost != null) return Number(row.total_cost);
  if (row.cost_per_lb != null) return Number(row.lbs_purchased || 0) * Number(row.cost_per_lb);
  return 0;
}

function mergeSuppliers(rows) {
  const seen = [];
  for (const r of rows) {
    const s = (r.supplier || '').trim();
    if (s && !seen.some((x) => x.toLowerCase() === s.toLowerCase())) seen.push(s);
  }
  return seen.join(', ');
}

async function run() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query('SELECT * FROM green_beans ORDER BY origin');

    const groups = new Map();
    for (const row of rows) {
      const key = row.origin.trim().toLowerCase();
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(row);
    }

    let merged = 0;
    for (const [key, group] of groups) {
      if (group.length < 2) continue;

      const byDate = [...group].sort((a, b) => {
        const da = a.date_received ? new Date(a.date_received) : new Date(a.created_at);
        const db_ = b.date_received ? new Date(b.date_received) : new Date(b.created_at);
        return da - db_;
      });
      const survivor = byDate[byDate.length - 1];
      const others = group.filter((r) => r.id !== survivor.id);

      const lbsPurchased = group.reduce((sum, r) => sum + Number(r.lbs_purchased || 0), 0);
      const lbsRemaining = group.reduce((sum, r) => sum + Number(r.lbs_remaining || 0), 0);
      const totalCost = group.reduce((sum, r) => sum + effectiveCost(r), 0);
      const costPerLb = lbsPurchased > 0 ? totalCost / lbsPurchased : 0;
      const supplier = mergeSuppliers(byDate);

      await client.query(
        `UPDATE green_beans
         SET supplier = $1, lbs_purchased = $2, lbs_remaining = $3, total_cost = $4, cost_per_lb = $5
         WHERE id = $6`,
        [supplier, lbsPurchased, lbsRemaining, totalCost.toFixed(2), costPerLb.toFixed(2), survivor.id]
      );

      for (const other of others) {
        await client.query(
          `UPDATE blend_components SET green_bean_id = $1 WHERE green_bean_id = $2`,
          [survivor.id, other.id]
        );
        await client.query('DELETE FROM green_beans WHERE id = $1', [other.id]);
      }

      console.log(
        `Merged "${survivor.origin}" — ${group.length} rows -> 1 ` +
        `(${lbsPurchased.toFixed(2)} lbs purchased, ${lbsRemaining.toFixed(2)} lbs remaining, ` +
        `$${totalCost.toFixed(2)} total, $${costPerLb.toFixed(2)}/lb, supplier: ${supplier || '—'})`
      );
      merged++;
    }

    await client.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS green_beans_origin_unique ON green_beans (LOWER(TRIM(origin)))`
    );

    await client.query('COMMIT');
    console.log(`\nDone — ${merged} origin(s) merged, ${groups.size} distinct origin(s) total.`);
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
