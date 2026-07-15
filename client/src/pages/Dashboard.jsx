import { useNavigate } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import NewOrderButton from '../components/NewOrderButton'
import { useFetch } from '../hooks/useFetch'

const lbs    = (v) => `${Number(v || 0).toFixed(2)} lbs`
const money  = (v) => `$${Number(v || 0).toFixed(2)}`

function StatCard({ label, value }) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-stone-400">{label}</p>
      <p className="mt-2 font-serif text-2xl font-semibold text-stone-800">{value}</p>
    </div>
  )
}

function SectionHeader({ title }) {
  return <h2 className="mb-3 font-serif text-lg font-semibold text-stone-100">{title}</h2>
}

function InventoryList({ rows, valueKey, valueFormat, emptyMessage }) {
  if (!rows || rows.length === 0) {
    return <p className="text-sm text-stone-400">{emptyMessage}</p>
  }
  return (
    <div className="divide-y divide-stone-100">
      {rows.map((row, i) => (
        <div key={i} className="flex items-center justify-between py-2.5 text-sm">
          <span className="text-stone-700">{row.label}</span>
          <span className="font-semibold text-amber-800">{valueFormat(row[valueKey])}</span>
        </div>
      ))}
    </div>
  )
}

function Dashboard() {
  const navigate = useNavigate()
  const { data, loading, error } = useFetch('/dashboard')

  if (loading) return <p className="text-sm text-stone-400">Loading…</p>
  if (error) return (
    <>
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Couldn't load dashboard: {error}
      </div>
      <NewOrderButton onCreated={() => navigate('/orders')} />
    </>
  )

  const beanRows = (data?.greenBeans || []).map((b) => ({
    label: b.origin?.trim(),
    lbs_remaining: b.lbs_remaining,
  }))

  const bagRows = (data?.bags || []).map((b) => ({
    label: b.size_label?.trim(),
    quantity_on_hand: b.quantity_on_hand,
  }))

  return (
    <div className="space-y-8">
      <PageHeader title="Dashboard" description="Roastery at a glance." />

      <NewOrderButton onCreated={() => navigate('/orders')} />

      {/* Pounds Roasted */}
      <section>
        <SectionHeader title="Pounds Roasted" />
        <div className="grid grid-cols-3 gap-4">
          <StatCard label="This Week"  value={lbs(data?.week_lbs)} />
          <StatCard label="This Month" value={lbs(data?.month_lbs)} />
          <StatCard label="This Year"  value={lbs(data?.year_lbs)} />
        </div>
      </section>

      {/* Profit */}
      <section>
        <SectionHeader title="Profit" />
        <div className="grid grid-cols-3 gap-4">
          <StatCard label="This Week"  value={money(data?.week_profit)} />
          <StatCard label="This Month" value={money(data?.month_profit)} />
          <StatCard label="This Year"  value={money(data?.year_profit)} />
        </div>
      </section>

      {/* Inventory */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <section>
          <SectionHeader title="Green Beans on Hand" />
          <div className="rounded-xl border border-stone-200 bg-white px-5 py-3 shadow-sm">
            <InventoryList
              rows={beanRows}
              valueKey="lbs_remaining"
              valueFormat={(v) => `${Number(v || 0).toFixed(2)} lbs`}
              emptyMessage="No green bean stock recorded."
            />
          </div>
        </section>

        <section>
          <SectionHeader title="Bags in Stock" />
          <div className="rounded-xl border border-stone-200 bg-white px-5 py-3 shadow-sm">
            <InventoryList
              rows={bagRows}
              valueKey="quantity_on_hand"
              valueFormat={(v) => `${Number(v || 0)} bags`}
              emptyMessage="No bag inventory recorded."
            />
          </div>
        </section>
      </div>
    </div>
  )
}

export default Dashboard
