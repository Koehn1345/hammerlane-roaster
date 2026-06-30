import PageHeader from '../components/PageHeader'

const stats = [
  { label: 'Pending Orders', value: '—' },
  { label: 'Active Customers', value: '—' },
  { label: 'Green Bean Lbs on Hand', value: '—' },
  { label: 'Bags in Stock', value: '—' },
]

function Dashboard() {
  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="A quick look at how the roastery is running."
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm"
          >
            <p className="text-sm text-stone-500">{stat.label}</p>
            <p className="mt-2 font-serif text-2xl font-semibold text-amber-800">
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-xl border border-dashed border-stone-300 bg-white/60 p-10 text-center text-stone-400">
        Recent activity and roast schedule will show up here.
      </div>
    </div>
  )
}

export default Dashboard
