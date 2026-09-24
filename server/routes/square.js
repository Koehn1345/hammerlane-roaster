const express = require('express');
const router  = express.Router();
const pool    = require('../db/db');
const { createOrderTx } = require('./orders');
const square  = require('../square/sync');

const digits10 = (p) => (p || '').replace(/\D/g, '').slice(-10);

// Best-guess app customer for a Square buyer: phone match first, then exact name.
function suggestCustomer(row, customers) {
  const phone = digits10(row.buyer_phone);
  if (phone.length === 10) {
    const byPhone = customers.filter((c) => digits10(c.phone) === phone);
    // Several customers share Jason's number as a placeholder, only trust a unique phone match.
    if (byPhone.length === 1) return byPhone[0].id;
  }
  const name = (row.buyer_name || '').trim().toLowerCase();
  if (name) {
    const byName = customers.find((c) => c.name.trim().toLowerCase() === name);
    if (byName) return byName.id;
  }
  return null;
}

router.get('/status', async (req, res) => {
  try {
    const { rows } = await pool.query(`SELECT COUNT(*)::int AS n FROM square_inbox WHERE status = 'new'`);
    res.json({
      configured: square.isConfigured(),
      // Length only, never the token itself — lets the UI tell "no token" apart
      // from "token present but Square rejected it" when troubleshooting Railway vars.
      token_length: (process.env.SQUARE_ACCESS_TOKEN || '').length,
      last_sync_at: square.state.lastSyncAt,
      last_error: square.state.lastError,
      new_count: rows[0].n,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/sync', async (req, res) => {
  try {
    res.json(await square.syncSquareOrders());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// New inbox rows, each with a suggested customer and any app orders for that
// customer within 4 days (likely already entered by hand).
router.get('/inbox', async (req, res) => {
  try {
    const [{ rows: inbox }, { rows: customers }] = await Promise.all([
      pool.query(`SELECT * FROM square_inbox WHERE status = 'new' ORDER BY square_created_at DESC`),
      pool.query(`SELECT id, name, phone FROM customers`),
    ]);

    const out = [];
    for (const row of inbox) {
      const suggested = suggestCustomer(row, customers);
      let possible_matches = [];
      if (suggested) {
        const { rows } = await pool.query(
          `SELECT o.id, o.created_at,
                  COALESCE(string_agg(oi.quantity || 'Ã ' || b.name, ', ' ORDER BY oi.id), '') AS summary
           FROM orders o
           LEFT JOIN order_items oi ON oi.order_id = o.id
           LEFT JOIN blends b ON b.id = oi.blend_id
           WHERE o.customer_id = $1
             AND o.created_at BETWEEN $2::timestamptz - INTERVAL '4 days' AND $2::timestamptz + INTERVAL '4 days'
           GROUP BY o.id
           ORDER BY o.created_at`,
          [suggested, row.square_created_at]
        );
        possible_matches = rows;
      }
      out.push({ ...row, suggested_customer_id: suggested, possible_matches });
    }
    res.json(out);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Turn an inbox row into an app order.
// body: { customer_id (null â Square Walk-in), items: [{ blend_id, bag_size_oz, grind_type, quantity, sale_price_per_bag }] }
router.post('/inbox/:id/add', async (req, res) => {
  const { items } = req.body;
  if (!Array.isArray(items) || !items.length) {
    return res.status(400).json({ error: 'Pick at least one item to add' });
  }
  if (items.some((i) => !i.blend_id || !i.bag_size_oz)) {
    return res.status(400).json({ error: 'Every item needs a blend and a bag size' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const row = (await client.query(
      `SELECT * FROM square_inbox WHERE id = $1 FOR UPDATE`, [req.params.id]
    )).rows[0];
    if (!row) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Not found' }); }
    if (row.status !== 'new') {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: `Already ${row.status}` });
    }

    let customerId = req.body.customer_id || null;
    let walkIn = false;
    if (!customerId) {
      walkIn = true;
      const existing = await client.query(`SELECT id FROM customers WHERE name = $1 LIMIT 1`, [square.WALK_IN_NAME]);
      customerId = existing.rows[0]?.id ?? (await client.query(
        `INSERT INTO customers (name, notes) VALUES ($1, 'Square orders from buyers not in the customer list') RETURNING id`,
        [square.WALK_IN_NAME]
      )).rows[0].id;
    }

    const noteParts = [`Square #${row.square_order_id.slice(-6)}`];
    if (row.source) noteParts.push(row.source);
    if (walkIn && row.buyer_name) noteParts.push(row.buyer_name);

    const order = await createOrderTx(client, {
      customer_id: customerId,
      notes: noteParts.join(' Â· '),
      billing_status: 'paid',
      items,
    });

    await client.query(
      `UPDATE square_inbox SET status = 'added', order_id = $1, resolved_at = NOW() WHERE id = $2`,
      [order.id, row.id]
    );
    await client.query('COMMIT');
    res.json({ ok: true, order_id: order.id });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

router.post('/inbox/:id/dismiss', async (req, res) => {
  try {
    const { rowCount } = await pool.query(
      `UPDATE square_inbox SET status = 'dismissed', resolved_at = NOW() WHERE id = $1 AND status = 'new'`,
      [req.params.id]
    );
    if (!rowCount) return res.status(404).json({ error: 'Not found or already handled' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
