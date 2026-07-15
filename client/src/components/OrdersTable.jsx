import { useNavigate } from 'react-router-dom'
import api from '../api/client'
import { formatDate } from '../utils/format'

const BILLING_STATUSES = ['not_billed', 'billed', 'paid']

const BILLING_STYLE = {
  not_billed: 'bg-stone-100 text-stone-500',
  billed:     'bg-blue-100 text-blue-800',
  paid:       'bg-emerald-100 text-emerald-800',
}

const BILLING_LABEL = {
  not_billed: 'Not Billed',
  billed:     'Billed',
  paid:       'Paid',
}

function Badge({ label, style, onClick, title }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize cursor-pointer select-none transition-opacity hover:opacity-75 ${style}`}
    >
      {label}
    </button>
  )
}

// Flattens orders (with nested items) into rows, keeping the parent order's
// customer/date/billing alongside each line item.
function flattenItems(orders) {
  const rows = []
  for (const order of orders) {
    for (const item of order.items) {
      rows.push({
        ...item,
        order_id: order.id,
        customer_name: order.customer_name,
        order_date: order.created_at,
        billing_status: order.billing_status,
      })
    }
  }
  return rows
}

function OrdersTable({ orders, refetch }) {
  const navigate = useNavigate()
  const rows = flattenItems(orders || []).filter((r) => r.status === 'new')

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-stone-400 bg-stone-500/60 p-10 text-center text-stone-200">
        No new orders — everything's been processed.
      </div>
    )
  }

  const patchItem = async (itemId, fields) => {
    await api.patch(`/orders/items/${itemId}`, fields)
    refetch()
  }

  const patchOrder = async (orderId, fields) => {
    await api.patch(`/orders/${orderId}`, fields)
    refetch()
  }

  const cycleBilling = (row) => {
    const next = BILLING_STATUSES[(BILLING_STATUSES.indexOf(row.billing_status) + 1) % BILLING_STATUSES.length]
    patchOrder(row.order_id, { billing_status: next })
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-stone-600 bg-stone-500 shadow-sm">
      <table className="w-full text-left text-sm">
        <thead className="bg-stone-600 text-xs uppercase tracking-wide text-stone-300">
          <tr>
            <th className="px-3 py-3 font-medium w-px" />
            <th className="px-3 py-3 font-medium">Order Date</th>
            <th className="px-3 py-3 font-medium">Customer</th>
            <th className="px-3 py-3 font-medium">Blend</th>
            <th className="px-3 py-3 font-medium">Size</th>
            <th className="px-3 py-3 font-medium">Grind</th>
            <th className="px-3 py-3 font-medium">Qty</th>
            <th className="px-3 py-3 font-medium">Price / Bag</th>
            <th className="px-3 py-3 font-medium">Billing</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-600/60">
          {rows.map((row) => (
            <tr
              key={row.id}
              onClick={() => navigate(`/orders/items/${row.id}`)}
              className="cursor-pointer hover:bg-stone-400/40"
            >
              <td className="px-2 py-2.5" onClick={(e) => e.stopPropagation()}>
                <button
                  title="Mark Processed"
                  onClick={() => patchItem(row.id, { status: 'processed' })}
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-800 text-amber-50 shadow-sm transition-colors hover:bg-amber-900"
                >
                  ✓
                </button>
              </td>
              <td className="px-3 py-2.5 text-stone-300 whitespace-nowrap">{formatDate(row.order_date)}</td>
              <td className="px-3 py-2.5 font-medium text-white whitespace-nowrap">{row.customer_name}</td>
              <td className="px-3 py-2.5 text-stone-100 whitespace-nowrap">{row.blend_name}</td>
              <td className="px-3 py-2.5 text-stone-100">{row.bag_size_oz}oz</td>
              <td className="px-3 py-2.5 capitalize text-stone-100 whitespace-nowrap">
                {row.grind_type === 'ground' ? 'Ground' : 'Whole Bean'}
              </td>
              <td className="px-3 py-2.5 text-stone-100">{row.quantity}</td>
              <td className="px-3 py-2.5 text-stone-100 whitespace-nowrap">
                {row.sale_price_per_bag != null ? `$${Number(row.sale_price_per_bag).toFixed(2)}` : '—'}
              </td>
              <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                <Badge
                  label={BILLING_LABEL[row.billing_status] ?? row.billing_status}
                  style={BILLING_STYLE[row.billing_status] ?? BILLING_STYLE.not_billed}
                  onClick={() => cycleBilling(row)}
                  title="Click to advance billing status"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default OrdersTable
