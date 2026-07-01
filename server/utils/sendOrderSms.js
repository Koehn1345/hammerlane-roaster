const twilio = require('twilio');
const pool   = require('../db/db');

function toE164(raw) {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10)                        return `+1${digits}`;
  if (digits.length === 11 && digits[0] === '1')   return `+${digits}`;
  return null;
}

const BILLING_LABEL = {
  not_billed: 'Not Billed',
  billed:     'Billed',
  paid:       'Paid',
};

async function sendOrderSms(orderId) {
  // Fetch order + customer
  const orderRes = await pool.query(
    `SELECT o.id, o.billing_status, o.sms_sent,
            c.name AS customer_name, c.phone AS customer_phone
     FROM orders o
     JOIN customers c ON o.customer_id = c.id
     WHERE o.id = $1`,
    [orderId]
  );
  if (!orderRes.rows.length) return;
  const order = orderRes.rows[0];

  if (order.sms_sent) return;                       // already sent
  const phone = toE164(order.customer_phone);
  if (!phone) return;                               // no valid phone

  // Fetch all items for the order
  const itemsRes = await pool.query(
    `SELECT oi.status, oi.grind_type, oi.quantity,
            b.name AS blend_name,
            bi.size_label, bi.size_lbs
     FROM order_items oi
     JOIN blends b ON oi.blend_id = b.id
     LEFT JOIN bag_inventory bi ON bi.size_oz = oi.bag_size_oz
     WHERE oi.order_id = $1
     ORDER BY oi.created_at`,
    [orderId]
  );
  const items = itemsRes.rows;

  // Only fire when every item is roasted
  if (!items.length || !items.every((i) => i.status === 'roasted')) return;

  // Build item lines
  const itemLines = items.map((item) => {
    const lbs   = parseFloat(item.size_lbs) || 0;
    const size  = lbs === 0.5 ? '1/2 lb'
                : Number.isInteger(lbs) ? `${lbs} lb`
                : (item.size_label?.trim() || `${lbs} lb`);
    const grind = item.grind_type === 'ground' ? 'Ground' : 'Whole Bean';
    return `– ${item.blend_name} (${size}, ${grind})`;
  }).join('\n');

  const firstName   = order.customer_name.split(' ')[0];
  const billingText = BILLING_LABEL[order.billing_status] ?? 'Not Billed';

  const body = [
    `Hi ${firstName}, your order is ready to pick up at your normal location or will be shipped ☕`,
    itemLines,
    `– Payment Status: ${billingText}`,
    `— Hammerlane Roaster`,
  ].join('\n');

  const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  await client.messages.create({
    body,
    from: process.env.TWILIO_PHONE_NUMBER,
    to:   phone,
  });

  await pool.query('UPDATE orders SET sms_sent = true WHERE id = $1', [orderId]);
  console.log(`SMS sent → order ${orderId} | ${order.customer_name} | ${phone}`);
}

module.exports = { sendOrderSms };
