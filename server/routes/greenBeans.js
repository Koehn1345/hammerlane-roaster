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
  try {
    const result = await pool.query(
      `INSERT INTO green_beans (origin, supplier, lbs_purchased, cost_per_lb, lbs_remaining, date_received)
       VALUES ($1, $2, $3, $4, $3, $5) RETURNING *`,
      [origin, supplier, lbs_purchased, cost_per_lb, date_received]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
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