const express = require('express');
const router  = express.Router();
const pool    = require('../db/db');

router.get('/', async (req, res) => {
  try {
    // Pounds roasted + profit across three time windows in one pass
    const statsResult = await pool.query(`
      SELECT
        COALESCE(SUM(CASE WHEN oi.roast_date >= CURRENT_DATE - 7
          THEN bi.size_lbs * oi.quantity END), 0)             AS week_lbs,
        COALESCE(SUM(CASE WHEN oi.roast_date >= date_trunc('month', CURRENT_DATE)
          THEN bi.size_lbs * oi.quantity END), 0)             AS month_lbs,
        COALESCE(SUM(CASE WHEN oi.roast_date >= date_trunc('year', CURRENT_DATE)
          THEN bi.size_lbs * oi.quantity END), 0)             AS year_lbs,
        COALESCE(SUM(CASE WHEN oi.roast_date >= CURRENT_DATE - 7
          THEN oi.profit END), 0)                             AS week_profit,
        COALESCE(SUM(CASE WHEN oi.roast_date >= date_trunc('month', CURRENT_DATE)
          THEN oi.profit END), 0)                             AS month_profit,
        COALESCE(SUM(CASE WHEN oi.roast_date >= date_trunc('year', CURRENT_DATE)
          THEN oi.profit END), 0)                             AS year_profit
      FROM order_items oi
      LEFT JOIN bag_inventory bi ON bi.size_oz = oi.bag_size_oz
      WHERE oi.status = 'roasted' AND oi.roast_date IS NOT NULL
    `);

    // Green beans on hand grouped by origin (only those with stock)
    const beansResult = await pool.query(`
      SELECT origin, SUM(lbs_remaining) AS lbs_remaining
      FROM green_beans
      WHERE lbs_remaining > 0
      GROUP BY origin
      ORDER BY origin
    `);

    // Bag inventory by size
    const bagsResult = await pool.query(`
      SELECT size_label, size_oz, size_lbs, quantity_on_hand
      FROM bag_inventory
      ORDER BY COALESCE(size_lbs, 0)
    `);

    res.json({
      ...statsResult.rows[0],
      greenBeans: beansResult.rows,
      bags:       bagsResult.rows,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
