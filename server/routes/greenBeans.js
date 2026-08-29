const express = require('express');
const router = express.Router();
const pool = require('../db/db');

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM green_beans ORDER BY origin');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Merges the new supplier into the existing comma-separated list, skipping
// case-insensitive duplicates so re-ordering from the same supplier doesn't pile up.
function mergeSupplierList(existing, incoming) {
  const list = (existing || '').split(',').map((s) => s.trim()).filter(Boolean);
  const next = (incoming || '').trim();
  if (next && !list.some((s) => s.toLowerCase() === next.toLowerCase())) list.push(next);
  return list.join(', ');
}

// Adds a shipment. If this origin already has a record, the shipment's lbs/cost
// fold into it (one row per origin) rather than creating a new row.
router.post('/', async (req, res) => {
  const { origin, supplier, lbs_purchased, total_cost, date_received } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const existing = await client.query(
      `SELECT * FROM green_beans WHERE LOWER(TRIM(origin)) = LOWER(TRIM($1)) LIMIT 1`,
      [origin]
    );

    let bean;
    if (existing.rows.length) {
      const row = existing.rows[0];
      const lbsPurchased = Number(row.lbs_purchased || 0) + (Number(lbs_purchased) || 0);
      const lbsRemaining = Number(row.lbs_remaining || 0) + (Number(lbs_purchased) || 0);
      const totalCost = Number(row.total_cost || 0) + (Number(total_cost) || 0);
      const costPerLb = lbsPurchased > 0 ? totalCost / lbsPurchased : 0;

      const result = await client.query(
        `UPDATE green_beans
         SET supplier = $1, lbs_purchased = $2, total_cost = $3, cost_per_lb = $4,
             lbs_remaining = $5, date_received = COALESCE($6, date_received)
         WHERE id = $7 RETURNING *`,
        [mergeSupplierList(row.supplier, supplier), lbsPurchased, totalCost, costPerLb.toFixed(2), lbsRemaining, date_received, row.id]
      );
      bean = result.rows[0];
    } else {
      const lbs = Number(lbs_purchased) || 0;
      const costPerLb = lbs > 0 ? (Number(total_cost) || 0) / lbs : 0;
      const result = await client.query(
        `INSERT INTO green_beans (origin, supplier, lbs_purchased, total_cost, cost_per_lb, lbs_remaining, date_received)
         VALUES ($1, $2, $3, $4, $5, $3, $6) RETURNING *`,
        [origin, supplier, lbs_purchased, total_cost, costPerLb.toFixed(2), date_received]
      );
      bean = result.rows[0];
    }

    await client.query('COMMIT');
    res.json(bean);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

router.patch('/:id', async (req, res) => {
  const { origin, supplier, total_cost, lbs_remaining, date_received } = req.body;
  try {
    if (origin) {
      const dup = await pool.query(
        `SELECT id FROM green_beans WHERE LOWER(TRIM(origin)) = LOWER(TRIM($1)) AND id != $2`,
        [origin, req.params.id]
      );
      if (dup.rows.length) {
        return res.status(400).json({ error: `"${origin}" already has a record — use New Shipment to add stock to it instead.` });
      }
    }

    const existing = await pool.query('SELECT lbs_purchased FROM green_beans WHERE id = $1', [req.params.id]);
    const lbs = Number(existing.rows[0]?.lbs_purchased) || 0;
    const costPerLb = lbs > 0 ? (Number(total_cost) || 0) / lbs : 0;

    const result = await pool.query(
      `UPDATE green_beans SET origin = $1, supplier = $2, total_cost = $3, cost_per_lb = $4, lbs_remaining = $5, date_received = $6 WHERE id = $7 RETURNING *`,
      [origin, supplier, total_cost, costPerLb.toFixed(2), lbs_remaining, date_received, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
