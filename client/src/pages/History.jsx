import PageHeader from '../components/PageHeader'
import { useFetch } from '../hooks/useFetch'

const lbs   = (v) => `${Number(v || 0).toFixed(2)}`
const money = (v) => `$${Number(v || 0).toFixed(2)}`

// Return the Sunday that starts the week containing a given date string
function weekKey(dateStr) {
  const d = new Date(dateStr)
  const day = d.getUTCDay() // 0 = Sun
  const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day))
  return start.toISOString().slice(0, 10)
}

function weekLabel(key) {
  const d = new Date(key + 'T00:00:00Z')
  return 'Week of ' + d.toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC',
  })
}

function groupByWeek(rows) {
  const map = {}
  for (const row of rows) {
    const key = weekKey(row.roast_date)
    if (!map[key]) map[key] = []
    map[key].push(row)
  }
  // Return sorted newest first
  return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]))
}

function History() {
  const { data: rows, loading, error } = useFetch('/orders/roast-history')

  if (loading) return <p className="text-sm text-stone-400">Loading history…</p>
  if (error) return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
      Couldn't load history: {error}
    </div>
  )

  const weeks = groupByWeek(rows || [])

  return (
    <div>
      <PageHeader title="Roast History" description="All roasted orders grouped by week." />

      {weeks.length === 0 && (
        <div className="rounded-xl border border-dashed border-stone-300 bg-white/60 p-10 text-center text-stone-400">
          No roasted orders yet.
        </div>
      )}

      <div className="space-y-8">
        {weeks.map(([key, items]) => {
          const totalLbs    = items.reduce((s, r) => s + Number(r.weight || 0), 0)
          const totalCost   = items.reduce((s, r) => s + Number(r.cost || 0), 0)
          const totalProfit = items.reduce((s, r) => s + Number(r.profit || 0), 0)

          return (
            <div key={key} className="overflow-x-auto rounded-xl border border-stone-200 bg-white shadow-sm">
              {/* Week header */}
              <div className="flex items-center justify-between border-b border-stone-100 bg-stone-50 px-4 py-3">
                <h2 className="font-bold text-stone-800">{weekLabel(key)}</h2>
                <span className="text-xs text-stone-500">
                  {items.length} {items.length === 1 ? 'roast' : 'roasts'}
                </span>
              </div>

              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase tracking-wide text-stone-400">
                  <tr>
                    <th className="px-4 py-2 font-medium">Customer</th>
                    <th className="px-4 py-2 font-medium">Blend</th>
                    <th className="px-4 py-2 font-medium">Type</th>
                    <th className="px-4 py-2 font-medium">Weight</th>
                    <th className="px-4 py-2 font-medium">Cost</th>
                    <th className="px-4 py-2 font-medium">Profit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-50">
                  {items.map((r) => (
                    <tr key={r.id} className="hover:bg-stone-50">
                      <td className="px-4 py-2.5 font-bold text-stone-800 whitespace-nowrap">{r.customer_name}</td>
                      <td className="px-4 py-2.5 text-stone-700 whitespace-nowrap">{r.blend_name}</td>
                      <td className="px-4 py-2.5 text-stone-700 capitalize whitespace-nowrap">
                        {r.grind_type === 'ground' ? 'Ground' : 'Whole Bean'}
                      </td>
                      <td className="px-4 py-2.5 text-stone-700 whitespace-nowrap">{lbs(r.weight)} lbs</td>
                      <td className="px-4 py-2.5 text-stone-700 whitespace-nowrap">{money(r.cost)}</td>
                      <td className="px-4 py-2.5 font-bold text-green-700 whitespace-nowrap">{money(r.profit)}</td>
                    </tr>
                  ))}
                </tbody>
                {/* Week subtotal */}
                <tfoot>
                  <tr className="border-t-2 border-stone-200 bg-stone-50 font-bold">
                    <td className="px-4 py-2.5 text-stone-500" colSpan={3}>Week Total</td>
                    <td className="px-4 py-2.5 text-stone-800 whitespace-nowrap">{lbs(totalLbs)} lbs</td>
                    <td className="px-4 py-2.5 text-stone-800 whitespace-nowrap">{money(totalCost)}</td>
                    <td className="px-4 py-2.5 text-green-700 whitespace-nowrap">{money(totalProfit)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default History
