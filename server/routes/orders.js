const express = require('express');
const router = express.Router();
const pool = require('../db/db');

const ITEM_COLUMNS = `
  order_items.id, order_items.order_id, order_items.blend_id, order_items.bag_size_oz,
  order_items.grind_type, order_items.quantity, order_items.sale_price_per_bag,
  order_items.cost_beans, order_items.cost_bags, order_items.profit, order_items.status,
  order_items.roast_date, order_items.weighed, order_items.labeled, order_items.roaster_used,
  order_items.created_at, blends.name AS blend_name
`;

async function attachItems(orders) {
  if (!orders.length) return orders;
  const ids = orders.map((o) => o.id);
  const itemsResult = await pool.query(
    `SELECT ${ITEM_COLUMNS}
     FROM order_items
     JOIN blends ON order_items.blend_id = blends.id
     WHERE order_items.order_id = ANY($1)
     ORDER BY order_items.created_at`,
    [ids]
  );
  const byOrder = {};
  for (const item of itemsResult.rows) {
    (byOrder[item.order_id] ??= []).push(item);
  }
  return orders.map((o) => ({ ...o, items: byOrder[o.id] || [] }));
}

// bean cost/lb for a blend = weighted sum of its components' green bean cost/lb
async function computeItemCosts({ blend_id, bag_size_oz, quantity, sale_price_per_bag }) {
  const blendCostResult = await pool.query(
    `SELECT COALESCE(SUM((bc.percentage / 100) * gb.cost_per_lb), 0) AS cost_per_lb
     FROM blend_components bc
     JOIN green_beans gb ON bc.green_bean_id = gb.id
     WHERE bc.blend_id = $1`,
    [blend_id]
  );
  const blendCostPerLb = Number(blendCostResult.rows[0]?.cost_per_lb || 0);

  const bagResult = await pool.query(
    `SELECT size_lbs, cost_each FROM bag_inventory WHERE size_oz = $1 LIMIT 1`,
    [bag_size_oz]
  );
  const sizeLbs = Number(bagResult.rows[0]?.size_lbs || 0);
  const bagCostEach = Number(bagResult.rows[0]?.cost_each || 0);

  const qty = Number(quantity) || 0;
  const weight = sizeLbs * qty;
  const costBeans = blendCostPerLb * weight;
  const costBags = bagCostEach * qty;
  const revenue = (Number(sale_price_per_bag) || 0) * qty;
  const profit = revenue - costBeans - costBags;

  return {
    cost_beans: costBeans.toFixed(2),
    cost_bags: costBags.toFixed(2),
    profit: profit.toFixed(2),
  };
}

router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT orders.*, customers.name AS customer_name
      FROM orders
      JOIN customers ON orders.customer_id = customers.id
      ORDER BY orders.created_at DESC
    `);
    res.json(await attachItems(result.rows));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Flat list of line items still awaiting roast (status = 'processed'), with weight/cost/profit,
// for the Roasting page.
router.get('/roasting-list', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT order_items.*, blends.name AS blend_name, customers.name AS customer_name,
             bag_inventory.size_lbs
      FROM order_items
      JOIN orders     ON order_items.order_id   = orders.id
      JOIN customers  ON orders.customer_id     = customers.id
      JOIN blends     ON order_items.blend_id   = blends.id
      LEFT JOIN bag_inventory ON bag_inventory.size_oz = order_items.bag_size_oz
      WHERE order_items.status = 'processed'
      ORDER BY blends.name, customers.name
    `);
    const rows = result.rows.map((r) => ({
      ...r,
      weight: (Number(r.size_lbs) || 0) * (Number(r.quantity) || 0),
    }));
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create an order with one or more line items
// body: { customer_id, notes, items: [{ blend_id, bag_size_oz, grind_type, quantity, sale_price_per_bag }] }
router.post('/', async (req, res) => {
  const { customer_id, notes, items } = req.body;
  if (!Array.isArray(items) || !items.length) {
    return res.status(400).json({ error: 'Order must have at least one item' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const orderResult = await client.query(
      `INSERT INTO orders (customer_id, notes) VALUES ($1, $2) RETURNING *`,
      [customer_id, notes || null]
    );
    const order = orderResult.rows[0];

    for (const item of items) {
      const costs = await computeItemCosts(item);
      await client.query(
        `INSERT INTO order_items
           (order_id, blend_id, bag_size_oz, grind_type, quantity, sale_price_per_bag, cost_beans, cost_bags, profit)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [order.id, item.blend_id, item.bag_size_oz, item.grind_type || 'whole', item.quantity,
         item.sale_price_per_bag, costs.cost_beans, costs.cost_bags, costs.profit]
      );
    }

    await client.query('COMMIT');
    const [withItems] = await attachItems([order]);
    res.json(withItems);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Update order header fields (customer, notes, billing_status) — partial update
router.patch('/:id', async (req, res) => {
  const fields = req.body;
  const allowed = ['customer_id', 'notes', 'billing_status'];
  const sets = [];
  const values = [];
  let i = 1;

  for (const key of allowed) {
    if (key in fields) {
      sets.push(`${key} = $${i++}`);
      values.push(fields[key]);
    }
  }
  if (!sets.length) return res.status(400).json({ error: 'No fields to update' });

  values.push(req.params.id);
  try {
    const result = await pool.query(
      `UPDATE orders SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`,
      values
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    const [withItems] = await attachItems(result.rows);
    res.json(withItems);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM orders WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get a single order item with full context (customer, blend names)
router.get('/items/:itemId', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT order_items.*, blends.name AS blend_name, customers.name AS customer_name,
              orders.billing_status, orders.notes AS order_notes,
              bag_inventory.size_lbs, bag_inventory.size_label
       FROM order_items
       JOIN orders     ON order_items.order_id   = orders.id
       JOIN customers  ON orders.customer_id     = customers.id
       JOIN blends     ON order_items.blend_id   = blends.id
       LEFT JOIN bag_inventory ON bag_inventory.size_oz = order_items.bag_size_oz
       WHERE order_items.id = $1`,
      [req.params.itemId]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    const row = result.rows[0];
    res.json({ ...row, weight: (Number(row.size_lbs) || 0) * (Number(row.quantity) || 0) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add an item to an existing order
router.post('/:id/items', async (req, res) => {
  const { blend_id, bag_size_oz, grind_type, quantity, sale_price_per_bag } = req.body;
  try {
    const costs = await computeItemCosts({ blend_id, bag_size_oz, quantity, sale_price_per_bag });
    const result = await pool.query(
      `INSERT INTO order_items
         (order_id, blend_id, bag_size_oz, grind_type, quantity, sale_price_per_bag, cost_beans, cost_bags, profit)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [req.params.id, blend_id, bag_size_oz, grind_type || 'whole', quantity, sale_price_per_bag,
       costs.cost_beans, costs.cost_bags, costs.profit]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update a single line item — partial update.
// Auto-stamps roast_date = today when status advances to 'roasted'.
// Recomputes cost/profit if blend, bag size, quantity, or price changes.
router.patch('/items/:itemId', async (req, res) => {
  const fields = req.body;
  const allowed = ['blend_id', 'bag_size_oz', 'grind_type', 'quantity', 'sale_price_per_bag', 'weighed', 'labeled', 'roaster_used'];
  const sets = [];
  const values = [];
  let i = 1;

  for (const key of allowed) {
    if (key in fields) {
      sets.push(`${key} = $${i++}`);
      values.push(fields[key]);
    }
  }

  if (fields.status === 'roasted') {
    sets.push(`status = $${i++}`);
    values.push('roasted');
    sets.push(`roast_date = $${i++}`);
    values.push(new Date());
  } else if ('status' in fields) {
    sets.push(`status = $${i++}`);
    values.push(fields.status);
  }

  const recomputeTriggers = ['blend_id', 'bag_size_oz', 'quantity', 'sale_price_per_bag'];
  if (recomputeTriggers.some((key) => key in fields)) {
    const current = await pool.query('SELECT * FROM order_items WHERE id = $1', [req.params.itemId]);
    const merged = { ...current.rows[0], ...fields };
    const costs = await computeItemCosts(merged);
    sets.push(`cost_beans = $${i++}`); values.push(costs.cost_beans);
    sets.push(`cost_bags = $${i++}`);  values.push(costs.cost_bags);
    sets.push(`profit = $${i++}`);     values.push(costs.profit);
  }

  if (!sets.length) return res.status(400).json({ error: 'No fields to update' });

  values.push(req.params.itemId);
  try {
    const result = await pool.query(
      `UPDATE order_items SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`,
      values
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/items/:itemId', async (req, res) => {
  try {
    await pool.query('DELETE FROM order_items WHERE id = $1', [req.params.itemId]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
