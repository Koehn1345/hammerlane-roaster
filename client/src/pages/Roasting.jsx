import { useNavigate } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import { useFetch } from '../hooks/useFetch'
import api from '../api/client'

const money = (v) => `$${Number(v || 0).toFixed(2)}`
const lbs = (v) => Number(v || 0).toFixed(2)

function Checkbox({ checked, onChange }) {
  return (
    <input
      type="checkbox"
      checked={checked}
      onChange={onChange}
      className="h-4 w-4 cursor-pointer accent-amber-800"
    />
  )
}

function RoasterButton({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-2 py-0.5 text-xs font-medium transition-colors ${
        active ? 'bg-amber-800 text-amber-50' : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
      }`}
    >
      {label}
    </button>
  )
}

function Roasting() {
  const navigate = useNavigate()
  const { data: items, loading, error, refetch } = useFetch('/orders/roasting-list')

  const patch = async (id, fields, e) => {
    e?.stopPropagation()
    await api.patch(`/orders/items/${id}`, fields)
    refetch()
  }

  if (loading) return <p className="text-sm text-stone-400">Loading roast list…</p>
  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Couldn't load roast list: {error}
      </div>
    )
  }

  const totalWeight = (items ?? []).reduce((sum, i) => sum + Number(i.weight || 0), 0)

  const byBlend = {}
  for (const item of items ?? []) {
    (byBlend[item.blend_name] ??= []).push(item)
  }
  const blendNames = Object.keys(byBlend).sort()

  return (
    <div>
      <PageHeader title="Roasting" description="Beans waiting to be roasted, grouped by blend." />

      {/* Summary strip */}
      <div className="mb-6 flex flex-wrap items-stretch gap-3">
        <div className="rounded-xl border border-stone-200 bg-white px-5 py-4 shadow-sm">
          <p className="text-xs text-stone-400">Total Not Roasted</p>
          <p className="font-serif text-3xl font-bold text-red-600">
            {lbs(totalWeight)}<span className="ml-1 text-sm font-normal text-stone-400">lbs</span>
          </p>
        </div>
        {blendNames.map((name) => {
          const w = byBlend[name].reduce((s, i) => s + Number(i.weight || 0), 0)
          return (
            <div key={name} className="rounded-xl border border-stone-200 bg-white px-5 py-4 shadow-sm">
              <p className="text-xs text-stone-400">{name}</p>
              <p className={`font-serif text-2xl font-semibold ${w > 0 ? 'text-amber-800' : 'text-stone-300'}`}>
                {lbs(w)}<span className="ml-1 text-xs font-normal text-stone-400">lbs</span>
              </p>
            </div>
          )
        })}
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-stone-300 bg-white/60 p-10 text-center text-stone-400">
          Nothing waiting to be roasted.
        </div>
      ) : (
        <div className="space-y-4">
          {blendNames.map((blendName) => (
            <div key={blendName} className="overflow-x-auto rounded-xl border border-stone-200 bg-white shadow-sm">
              <div className="flex items-center gap-2 border-b border-stone-100 bg-stone-50 px-4 py-2.5">
                <h3 className="font-serif text-base font-semibold text-stone-800">{blendName}</h3>
                <span className="rounded-full bg-stone-200 px-2 py-0.5 text-xs font-medium text-stone-600">
                  {byBlend[blendName].length}
                </span>
              </div>
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase tracking-wide text-stone-400">
                  <tr>
                    <th className="px-3 py-2 font-medium w-px" />
                    <th className="px-3 py-2 font-medium">Customer</th>
                    <th className="px-3 py-2 font-medium">Wt (lbs)</th>
                    <th className="px-3 py-2 font-medium">Qty</th>
                    <th className="px-3 py-2 font-medium">Type</th>
                    <th className="px-3 py-2 font-medium text-center">Weighed</th>
                    <th className="px-3 py-2 font-medium text-center">Label</th>
                    <th className="px-3 py-2 font-medium">Cost</th>
                    <th className="px-3 py-2 font-medium">Profit</th>
                    <th className="px-3 py-2 font-medium">Roaster</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {byBlend[blendName].map((item) => (
                    <tr
                      key={item.id}
                      className="cursor-pointer hover:bg-amber-50/40"
                      onClick={() => navigate(`/orders/items/${item.id}`)}
                    >
                      <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={(e) => patch(item.id, { status: 'roasted' }, e)}
                          className="rounded-md bg-green-700 px-2.5 py-1 text-xs font-semibold text-white whitespace-nowrap transition-colors hover:bg-green-800"
                        >
                          ✓ Roast
                        </button>
                      </td>
                      <td className="px-3 py-2.5 font-medium text-stone-800 whitespace-nowrap">
                        {item.customer_name}
                      </td>
                      <td className="px-3 py-2.5 text-stone-600">{lbs(item.weight)}</td>
                      <td className="px-3 py-2.5 text-stone-600">{item.quantity}</td>
                      <td className="px-3 py-2.5 text-stone-600 whitespace-nowrap">
                        {item.grind_type === 'ground' ? 'Ground' : 'Whole Bean'}
                      </td>
                      <td className="px-3 py-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                        <Checkbox checked={item.weighed} onChange={(e) => patch(item.id, { weighed: !item.weighed }, e)} />
                      </td>
                      <td className="px-3 py-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                        <Checkbox checked={item.labeled} onChange={(e) => patch(item.id, { labeled: !item.labeled }, e)} />
                      </td>
                      <td className="px-3 py-2.5 text-stone-600 whitespace-nowrap">
                        {money(Number(item.sale_price_per_bag) * item.quantity)}
                      </td>
                      <td className="px-3 py-2.5 font-medium text-green-700 whitespace-nowrap">
                        {money(item.profit)}
                      </td>
                      <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-1">
                          <RoasterButton
                            label="1#"
                            active={item.roaster_used === '1lb'}
                            onClick={(e) => patch(item.id, { roaster_used: item.roaster_used === '1lb' ? null : '1lb' }, e)}
                          />
                          <RoasterButton
                            label="2#"
                            active={item.roaster_used === '2lb'}
                            onClick={(e) => patch(item.id, { roaster_used: item.roaster_used === '2lb' ? null : '2lb' }, e)}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Roasting
