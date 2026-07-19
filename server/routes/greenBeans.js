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

router.post('/', async (req, res) => {
  const { origin, supplier, lbs_purchased, total_cost, date_received } = req.body;
  const lbs = Number(lbs_purchased) || 0;
  const costPerLb = lbs > 0 ? (Number(total_cost) || 0) / lbs : 0;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const result = await client.query(
      `INSERT INTO green_beans (origin, supplier, lbs_purchased, total_cost, cost_per_lb, lbs_remaining, date_received)
       VALUES ($1, $2, $3, $4, $5, $3, $6) RETURNING *`,
      [origin, supplier, lbs_purchased, total_cost, costPerLb.toFixed(2), date_received]
    );
    const newBean = result.rows[0];

    // Any blend built on an older lot of this same origin now prices off the new entry —
    // orders already placed keep their stored cost/profit, only future orders see this.
    await client.query(
      `UPDATE blend_components bc
       SET green_bean_id = $1
       FROM green_beans gb
       WHERE bc.green_bean_id = gb.id
         AND gb.origin = $2
         AND gb.id != $1`,
      [newBean.id, origin]
    );

    await client.query('COMMIT');
    res.json(newBean);
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