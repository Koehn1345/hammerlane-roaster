/**
 * Square â Hammerlane Roaster order inbox.
 *
 * Pulls paid Square orders into the `square_inbox` table. Nothing is added to
 * `orders` automatically â each inbox row is reviewed in the app (Add / Dismiss),
 * because many Square orders are already entered by hand.
 *
 * Which Square orders are pulled:
 *   - every OPEN order that is fully paid (has tenders and nothing due), and
 *   - COMPLETED paid orders created after the sync was first turned on
 *     (so an order finished in Square before the app syncs isn't missed).
 * Unpaid payment-link checkouts and invoices are skipped.
 *
 * Env:
 *   SQUARE_ACCESS_TOKEN  required â Square production access token (read-only use)
 *   SQUARE_LOCATION_ID   optional â defaults to the Hammerlane Coffee location
 */

const pool = require('../db/db');

const SQUARE_API = 'https://connect.squareup.com/v2';
const SQUARE_VERSION = '2025-01-23';
const DEFAULT_LOCATION = 'LNME7HK8CRT7E';
const WALK_IN_NAME = 'Square Walk-in';

const state = { lastSyncAt: null, lastError: null, running: false };

function isConfigured() {
  return Boolean(process.env.SQUARE_ACCESS_TOKEN);
}

async function squareFetch(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${SQUARE_API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${process.env.SQUARE_ACCESS_TOKEN}`,
      'Square-Version': SQUARE_VERSION,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = data.errors?.map((e) => e.detail || e.code).join('; ') || res.statusText;
    throw new Error(`Square ${res.status}: ${detail}`);
  }
  return data;
}

async function ensureSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS square_inbox (
      id SERIAL PRIMARY KEY,
      square_order_id VARCHAR(64) UNIQUE NOT NULL,
      square_created_at TIMESTAMPTZ,
      source VARCHAR(100),
      fulfillment_type VARCHAR(30),
      buyer_name VARCHAR(255),
      buyer_phone VARCHAR(40),
      buyer_email VARCHAR(255),
      total DECIMAL(10,2),
      items JSONB NOT NULL DEFAULT '[]',
      status VARCHAR(20) NOT NULL DEFAULT 'new',
      order_id INTEGER REFERENCES orders(id) ON DELETE SET NULL,
      resolved_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS square_sync_state (
      key VARCHAR(50) PRIMARY KEY,
      value TEXT
    )
  `);
}

async function getStartAt() {
  const { rows } = await pool.query(`SELECT value FROM square_sync_state WHERE key = 'start_at'`);
  if (rows.length) return rows[0].value;
  const now = new Date().toISOString();
  await pool.query(
    `INSERT INTO square_sync_state (key, value) VALUES ('start_at', $1) ON CONFLICT (key) DO NOTHING`,
    [now]
  );
  return now;
}

async function searchAll(query) {
  const orders = [];
  let cursor;
  do {
    const data = await squareFetch('/orders/search', {
      method: 'POST',
      body: {
        location_ids: [process.env.SQUARE_LOCATION_ID || DEFAULT_LOCATION],
        query,
        limit: 500,
        cursor,
      },
    });
    orders.push(...(data.orders || []));
    cursor = data.cursor;
  } while (cursor);
  return orders;
}

const isPaid = (o) =>
  Array.isArray(o.tenders) && o.tenders.length > 0 && Number(o.net_amount_due_money?.amount || 0) === 0;

// ---- Item mapping -----------------------------------------------------------

// Pounds from text like "2#", "5#, Whole Bean", "1/2#", "2# Costa Rica Whole Bean"
function parseLbs(text) {
  if (!text) return null;
  if (/1\s*\/\s*2\s*#/.test(text)) return 0.5;
  const m = text.match(/(\d+(?:\.\d+)?)\s*#/);
  return m ? Number(m[1]) : null;
}

function mapLineItem(li, blends, bags) {
  const name = li.name || '';
  const variation = li.variation_name || '';
  const both = `${variation} ${name}`;

  const lbs = parseLbs(variation) ?? parseLbs(name);
  const bag = lbs != null ? bags.find((b) => Number(b.size_lbs) === lbs) : null;

  // Strip size / grind words, then pick the longest blend name contained in what's left.
  const cleaned = name
    .replace(/1\s*\/\s*2\s*#|\d+(?:\.\d+)?\s*#/g, ' ')
    .replace(/whole\s*bean|ground/gi, ' ')
    .toLowerCase();
  const blend = blends
    .filter((b) => cleaned.includes(b.name.trim().toLowerCase()))
    .sort((a, b) => b.name.length - a.name.length)[0];

  return {
    square_name: name,
    square_variation: variation || null,
    quantity: Number(li.quantity) || 1,
    // What the customer actually paid per bag: line total after discounts, before tax.
    sale_price_per_bag: (
      li.total_money
        ? (Number(li.total_money.amount) - Number(li.total_tax_money?.amount || 0)) / 100 / (Number(li.quantity) || 1)
        : (Number(li.base_price_money?.amount) || 0) / 100
    ).toFixed(2),
    blend_id: blend?.id ?? null,
    bag_size_oz: bag?.size_oz ?? null,
    grind_type: /ground/i.test(both) ? 'ground' : 'whole',
  };
}

// ---- Buyer ------------------------------------------------------------------

async function resolveBuyer(order) {
  for (const f of order.fulfillments || []) {
    const r = (f.pickup_details || f.shipment_details || f.delivery_details || {}).recipient;
    if (r?.display_name?.trim()) {
      return { name: r.display_name.trim(), phone: r.phone_number || null, email: r.email_address || null };
    }
  }
  const customerId = order.customer_id || order.tenders?.find((t) => t.customer_id)?.customer_id;
  if (customerId) {
    try {
      const { customer: c } = await squareFetch(`/customers/${customerId}`);
      const name = [c.given_name, c.family_name].filter(Boolean).join(' ') || c.company_name || c.email_address;
      if (name) return { name, phone: c.phone_number || null, email: c.email_address || null };
    } catch (err) {
      console.warn(`Square customer lookup failed for ${customerId}:`, err.message);
    }
  }
  return { name: null, phone: null, email: null };
}

// ---- Sync -------------------------------------------------------------------

async function syncSquareOrders() {
  if (!isConfigured()) throw new Error('SQUARE_ACCESS_TOKEN is not set');
  if (state.running) return { added: 0, skipped: true };
  state.running = true;
  try {
    const startAt = await getStartAt();
    const [open, completed] = await Promise.all([
      searchAll({
        filter: { state_filter: { states: ['OPEN'] } },
        sort: { sort_field: 'CREATED_AT', sort_order: 'DESC' },
      }),
      searchAll({
        filter: {
          state_filter: { states: ['COMPLETED'] },
          date_time_filter: { created_at: { start_at: startAt } },
        },
        sort: { sort_field: 'CREATED_AT', sort_order: 'DESC' },
      }),
    ]);

    const candidates = [...open, ...completed].filter(isPaid);
    if (!candidates.length) {
      state.lastSyncAt = new Date().toISOString();
      state.lastError = null;
      return { added: 0 };
    }

    const { rows: known } = await pool.query(
      `SELECT square_order_id FROM square_inbox WHERE square_order_id = ANY($1)`,
      [candidates.map((o) => o.id)]
    );
    const knownIds = new Set(known.map((r) => r.square_order_id));
    const fresh = candidates.filter((o) => !knownIds.has(o.id));

    const [{ rows: blends }, { rows: bags }] = await Promise.all([
      pool.query('SELECT id, name FROM blends'),
      pool.query('SELECT size_oz, size_lbs FROM bag_inventory'),
    ]);

    let added = 0;
    for (const o of fresh) {
      const buyer = await resolveBuyer(o);
      const items = (o.line_items || []).map((li) => mapLineItem(li, blends, bags));
      const result = await pool.query(
        `INSERT INTO square_inbox
           (square_order_id, square_created_at, source, fulfillment_type, buyer_name, buyer_phone, buyer_email, total, items)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         ON CONFLICT (square_order_id) DO NOTHING`,
        [
          o.id,
          o.created_at,
          o.source?.name || null,
          o.fulfillments?.[0]?.type || null,
          buyer.name,
          buyer.phone,
          buyer.email,
          ((Number(o.total_money?.amount) || 0) / 100).toFixed(2),
          JSON.stringify(items),
        ]
      );
      added += result.rowCount;
    }

    state.lastSyncAt = new Date().toISOString();
    state.lastError = null;
    return { added };
  } catch (err) {
    state.lastError = err.message;
    throw err;
  } finally {
    state.running = false;
  }
}

function startSquareSync(intervalMinutes = 10) {
  if (!isConfigured()) {
    console.log('Square sync off â SQUARE_ACCESS_TOKEN not set');
    return;
  }
  const run = () =>
    syncSquareOrders()
      .then((r) => r.added && console.log(`Square sync: ${r.added} new order(s) in inbox`))
      .catch((err) => console.error('Square sync failed:', err.message));
  setTimeout(run, 5_000);
  setInterval(run, intervalMinutes * 60_000);
}

module.exports = {
  WALK_IN_NAME,
  state,
  isConfigured,
  ensureSchema,
  syncSquareOrders,
  startSquareSync,
  mapLineItem,
  parseLbs,
};
