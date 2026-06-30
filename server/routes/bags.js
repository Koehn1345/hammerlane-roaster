const express = require('express');
const router = express.Router();
const pool = require('../db/db');

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM bag_inventory ORDER BY size_oz');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  const { size_oz, size_label, size_lbs, quantity_on_hand, cost_each, price_whole, price_ground } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO bag_inventory (size_oz, size_label, size_lbs, quantity_on_hand, cost_each, price_whole, price_ground)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [size_oz, size_label, size_lbs, quantity_on_hand, cost_each, price_whole, price_ground]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id', async (req, res) => {
  const { cost_each, quantity_on_hand, price_whole, price_ground, size_lbs } = req.body;
  try {
    const result = await pool.query(
      `UPDATE bag_inventory SET
         cost_each        = COALESCE($1, cost_each),
         quantity_on_hand = COALESCE($2, quantity_on_hand),
         price_whole      = COALESCE($3, price_whole),
         price_ground     = COALESCE($4, price_ground),
         size_lbs         = COALESCE($5, size_lbs)
       WHERE id = $6 RETURNING *`,
      [cost_each, quantity_on_hand, price_whole, price_ground, size_lbs, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
