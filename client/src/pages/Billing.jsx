import { useMemo } from 'react'
import PageHeader from '../components/PageHeader'
import { useFetch } from '../hooks/useFetch'
import api from '../api/client'
import { formatDate } from '../utils/format'

const money = (v) => `$${Number(v || 0).toFixed(2)}`

function groupByCustomer(orders, billingStatus) {
  const map = {}
  for (const order of orders) {
    if (order.billing_status !== billingStatus) continue
    for (const item of order.items) {
      const key = order.customer_name
      if (!map[key]) map[key] = { customer_name: key, customer_id: order.customer_id, order_ids: new Set(), items: [], total: 0 }
      map[key].order_ids.add(order.id)
      map[key].items.push({ ...item, order_id: order.id })
      map[key].total += Number(item.sale_price_per_bag || 0) * Number(item.quantity || 1)
    }
  }
  return Object.values(map).sort((a, b) => a.customer_name.localeCompare(b.customer_name))
}

function CustomerGroup({ group, actionLabel, actionColor, onAction }) {
  return (
    <div className="mb-4 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-stone-100 bg-stone-50 px-4 py-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-medium text-stone-800 truncate">{group.customer_name}</span>
          <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
            {money(group.total)}
          </span>
        </div>
        <button
          onClick={() => onAction([...group.order_ids])}
          className={`shrink-0 rounded-lg px-3 py-1 text-xs font-semibold text-white shadow-sm transition-colors ${actionColor}`}
        >
          {actionLabel}
        </button>
      </div>
      <table className="w-full text-left text-xs">
        <tbody className="divide-y divide-stone-50">
          {group.items.map((item, i) => (
            <tr key={i} className="hover:bg-amber-50/30">
              <td className="px-4 py-2 text-stone-400 whitespace-nowrap">{formatDate(item.roast_date)}</td>
              <td className="px-4 py-2 font-medium text-stone-700 whitespace-nowrap">{item.blend_name}</td>
              <td className="px-4 py-2 text-stone-500 capitalize whitespace-nowrap">
                {item.grind_type === 'ground' ? 'Ground' : 'Whole Bean'}
              </td>
              <td className="px-4 py-2 text-stone-500">{item.quantity}×</td>
              <td className="px-4 py-2 text-right font-medium text-stone-700 whitespace-nowrap">
                {money(Number(item.sale_price_per_bag || 0) * Number(item.quantity || 1))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Billing() {
  const { data: orders, loading, error, refetch } = useFetch('/orders')

  const notBilledGroups = useMemo(() => groupByCustomer(orders || [], 'not_billed'), [orders])
  const billedGroups    = useMemo(() => groupByCustomer(orders || [], 'billed'),     [orders])

  const totalNotBilled = notBilledGroups.reduce((s, g) => s + g.total, 0)
  const totalBilled    = billedGroups.reduce((s, g) => s + g.total, 0)

  const markOrders = async (orderIds, status) => {
    await Promise.all(orderIds.map((id) => api.patch(`/orders/${id}`, { billing_status: status })))
    refetch()
  }

  if (loading) return <p className="text-sm text-stone-400">Loading billing…</p>
  if (error) return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
      Couldn't load orders: {error}
    </div>
  )

  return (
    <div>
      <PageHeader title="Billing" description="Outstanding and invoiced orders, grouped by customer." />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_200px_1fr]">

        {/* Not Billed */}
        <div>
          <h2 className="mb-3 font-serif text-lg font-semibold text-stone-700">Not Billed</h2>
          {notBilledGroups.length === 0 ? (
            <div className="rounded-xl border border-dashed border-stone-300 bg-white/60 p-8 text-center text-stone-400">
              All caught up — nothing outstanding.
            </div>
          ) : (
            notBilledGroups.map((g) => (
              <CustomerGroup
                key={g.customer_name}
                group={g}
                actionLabel="Mark Billed"
                actionColor="bg-blue-600 hover:bg-blue-700"
                onAction={(ids) => markOrders(ids, 'billed')}
              />
            ))
          )}
        </div>

        {/* Totals */}
        <div className="lg:pt-9">
          <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm space-y-5">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-stone-400">Not Billed</p>
              <p className="mt-1 font-serif text-2xl font-bold text-amber-700">{money(totalNotBilled)}</p>
            </div>
            <div className="border-t border-stone-100 pt-5">
              <p className="text-xs font-medium uppercase tracking-wide text-stone-400">Billed</p>
              <p className="mt-1 font-serif text-2xl font-bold text-blue-700">{money(totalBilled)}</p>
            </div>
            <div className="border-t border-stone-100 pt-5">
              <p className="text-xs font-medium uppercase tracking-wide text-stone-400">Combined</p>
              <p className="mt-1 font-serif text-xl font-semibold text-stone-700">
                {money(totalNotBilled + totalBilled)}
              </p>
            </div>
          </div>
        </div>

        {/* Billed */}
        <div>
          <h2 className="mb-3 font-serif text-lg font-semibold text-stone-700">Billed</h2>
          {billedGroups.length === 0 ? (
            <div className="rounded-xl border border-dashed border-stone-300 bg-white/60 p-8 text-center text-stone-400">
              No invoiced orders waiting on payment.
            </div>
          ) : (
            billedGroups.map((g) => (
              <CustomerGroup
                key={g.customer_name}
                group={g}
                actionLabel="Mark Paid"
                actionColor="bg-green-700 hover:bg-green-800"
                onAction={(ids) => markOrders(ids, 'paid')}
              />
            ))
          )}
        </div>

      </div>
    </div>
  )
}

export default Billing
