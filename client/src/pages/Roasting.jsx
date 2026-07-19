import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import { useFetch } from '../hooks/useFetch'
import api from '../api/client'

// Returns today's date in YYYY-MM-DD local time (not UTC)
const localToday = () => new Date().toLocaleDateString('en-CA')

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
  const [selected, setSelected] = useState(new Set())

  const patch = async (id, fields, e) => {
    e?.stopPropagation()
    const scrollY = window.scrollY        // save position before refetch
    await api.patch(`/orders/items/${id}`, fields)
    refetch()
    requestAnimationFrame(() => window.scrollTo(0, scrollY))  // restore after render
  }

  const toggleSelect = (id, e) => {
    e.stopPropagation()
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const bulkPatch = async (fields) => {
    const ids = [...selected]
    const scrollY = window.scrollY
    await Promise.all(ids.map((id) => api.patch(`/orders/items/${id}`, fields)))
    setSelected(new Set())
    refetch()
    requestAnimationFrame(() => window.scrollTo(0, scrollY))
  }

  if (loading && !items) return <p className="text-sm text-stone-400">Loading roast list…</p>
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
        <div className="rounded-xl border border-stone-600 bg-stone-500 px-5 py-4 shadow-sm">
          <p className="text-xs text-stone-300">Total Not Roasted</p>
          <p className="font-serif text-3xl font-bold text-red-400">
            {lbs(totalWeight)}<span className="ml-1 text-sm font-normal text-stone-300">lbs</span>
          </p>
        </div>
        {blendNames.map((name) => {
          const w = byBlend[name].reduce((s, i) => s + Number(i.weight || 0), 0)
          return (
            <div key={name} className="rounded-xl border border-stone-600 bg-stone-500 px-5 py-4 shadow-sm">
              <p className="text-xs text-stone-300">{name}</p>
              <p className={`font-serif text-2xl font-semibold ${w > 0 ? 'text-amber-300' : 'text-stone-400'}`}>
                {lbs(w)}<span className="ml-1 text-xs font-normal text-stone-300">lbs</span>
              </p>
            </div>
          )
        })}
      </div>

      {selected.size > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-stone-600 bg-stone-600 px-4 py-2.5">
          <span className="text-sm font-medium text-white">{selected.size} selected</span>
          <button
            onClick={() => bulkPatch({ status: 'roasted', local_date: localToday() })}
            className="rounded-lg bg-green-700 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-green-800"
          >
            ✓ Mark Roasted
          </button>
          <button
            onClick={() => bulkPatch({ weighed: true })}
            className="rounded-lg bg-amber-800 px-3 py-1.5 text-xs font-semibold text-amber-50 shadow-sm transition-colors hover:bg-amber-900"
          >
            Mark Weighed
          </button>
          <button
            onClick={() => bulkPatch({ labeled: true })}
            className="rounded-lg bg-amber-800 px-3 py-1.5 text-xs font-semibold text-amber-50 shadow-sm transition-colors hover:bg-amber-900"
          >
            Mark Label
          </button>
          <button onClick={() => setSelected(new Set())} className="text-xs font-medium text-stone-300 hover:text-white">
            Clear
          </button>
        </div>
      )}

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-stone-400 bg-stone-500/60 p-10 text-center text-stone-200">
          Nothing waiting to be roasted.
        </div>
      ) : (
        <div className="space-y-4">
          {blendNames.map((blendName) => {
            const groupItems = byBlend[blendName]
            const groupAllSelected = groupItems.every((i) => selected.has(i.id))
            const toggleGroupSelectAll = () => {
              setSelected((prev) => {
                const next = new Set(prev)
                if (groupAllSelected) groupItems.forEach((i) => next.delete(i.id))
                else groupItems.forEach((i) => next.add(i.id))
                return next
              })
            }
            return (
            <div key={blendName} className="overflow-x-auto rounded-xl border border-stone-600 bg-stone-500 shadow-sm">
              <div className="flex items-center gap-2 border-b border-stone-600 bg-stone-600 px-4 py-2.5">
                <h3 className="font-serif text-base font-semibold text-white">{blendName}</h3>
                <span className="rounded-full bg-stone-700 px-2 py-0.5 text-xs font-medium text-stone-200">
                  {byBlend[blendName].length}
                </span>
              </div>
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase tracking-wide text-stone-300">
                  <tr>
                    <th className="px-3 py-2 font-medium w-px">
                      <Checkbox checked={groupAllSelected} onChange={toggleGroupSelectAll} />
                    </th>
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
                <tbody className="divide-y divide-stone-600/60">
                  {byBlend[blendName].map((item) => (
                    <tr
                      key={item.id}
                      className="cursor-pointer hover:bg-stone-400/40"
                      onClick={() => navigate(`/orders/items/${item.id}`)}
                    >
                      <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                        <Checkbox checked={selected.has(item.id)} onChange={(e) => toggleSelect(item.id, e)} />
                      </td>
                      <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={(e) => patch(item.id, { status: 'roasted', local_date: localToday() }, e)}
                          className="rounded-md bg-green-700 px-2.5 py-1 text-xs font-semibold text-white whitespace-nowrap transition-colors hover:bg-green-800"
                        >
                          ✓ Roast
                        </button>
                      </td>
                      <td className="px-3 py-2.5 font-medium text-white whitespace-nowrap">
                        {item.customer_name}
                      </td>
                      <td className="px-3 py-2.5 text-stone-200">{lbs(item.weight)}</td>
                      <td className="px-3 py-2.5 text-stone-200">{item.quantity}</td>
                      <td className="px-3 py-2.5 text-stone-200 whitespace-nowrap">
                        {item.grind_type === 'ground' ? 'Ground' : 'Whole Bean'}
                      </td>
                      <td className="px-3 py-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                        <Checkbox checked={item.weighed} onChange={(e) => patch(item.id, { weighed: !item.weighed }, e)} />
                      </td>
                      <td className="px-3 py-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                        <Checkbox checked={item.labeled} onChange={(e) => patch(item.id, { labeled: !item.labeled }, e)} />
                      </td>
                      <td className="px-3 py-2.5 text-stone-200 whitespace-nowrap">
                        {money(Number(item.sale_price_per_bag) * item.quantity)}
                      </td>
                      <td className="px-3 py-2.5 font-medium text-green-400 whitespace-nowrap">
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
            )
          })}
        </div>
      )}
    </div>
  )
}

export default Roasting
