const express = require('express');
const router = express.Router();
const pool = require('../db/db');

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM customers ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  const { name, phone, email, notes } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO customers (name, phone, email, notes) VALUES ($1, $2, $3, $4) RETURNING *`,
      [name, phone, email, notes]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM customers WHERE id = $1', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id/orders', async (req, res) => {
  try {
    const ordersResult = await pool.query(
      `SELECT * FROM orders WHERE customer_id = $1 ORDER BY created_at DESC`,
      [req.params.id]
    );
    const orders = ordersResult.rows;
    if (!orders.length) return res.json([]);

    const itemsResult = await pool.query(
      `SELECT order_items.*, blends.name AS blend_name
       FROM order_items
       JOIN blends ON order_items.blend_id = blends.id
       WHERE order_items.order_id = ANY($1)
       ORDER BY order_items.created_at`,
      [orders.map((o) => o.id)]
    );
    const byOrder = {};
    for (const item of itemsResult.rows) {
      (byOrder[item.order_id] ??= []).push(item);
    }
    res.json(orders.map((o) => ({ ...o, items: byOrder[o.id] || [] })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id', async (req, res) => {
  const { name, phone, email, notes } = req.body;
  try {
    const result = await pool.query(
      `UPDATE customers SET name = $1, phone = $2, email = $3, notes = $4 WHERE id = $5 RETURNING *`,
      [name, phone, email, notes, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM customers WHERE id = $1', [req.params.id]);
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;