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
  const { origin, supplier, lbs_purchased, cost_per_lb, date_received } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const result = await client.query(
      `INSERT INTO green_beans (origin, supplier, lbs_purchased, cost_per_lb, lbs_remaining, date_received)
       VALUES ($1, $2, $3, $4, $3, $5) RETURNING *`,
      [origin, supplier, lbs_purchased, cost_per_lb, date_received]
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
  const { origin, supplier, cost_per_lb, lbs_remaining, date_received } = req.body;
  try {
    const result = await pool.query(
      `UPDATE green_beans SET origin = $1, supplier = $2, cost_per_lb = $3, lbs_remaining = $4, date_received = $5 WHERE id = $6 RETURNING *`,
      [origin, supplier, cost_per_lb, lbs_remaining, date_received, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;