import { Link, useNavigate, useParams } from 'react-router-dom'
import DataTable from '../components/DataTable'
import { useFetch } from '../hooks/useFetch'
import { formatDate } from '../utils/format'

const STATUS_STYLES = {
  new:       'bg-stone-100 text-stone-600',
  processed: 'bg-amber-100 text-amber-800',
  roasted:   'bg-green-100 text-green-800',
}

function StatusBadge(status) {
  const cls = STATUS_STYLES[status] ?? 'bg-stone-100 text-stone-600'
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${cls}`}>
      {status}
    </span>
  )
}

const orderColumns = [
  { key: 'blend_name',       label: 'Blend' },
  { key: 'bag_size_oz',      label: 'Bag Size' },
  { key: 'quantity',         label: 'Qty' },
  { key: 'roast_date',       label: 'Roast Date', format: formatDate },
  { key: 'sale_price_per_bag', label: 'Price / Bag', format: (v) => v != null ? `$${Number(v).toFixed(2)}` : '—' },
  { key: 'status',           label: 'Status', format: StatusBadge },
]

function OrderSection({ title, rows, emptyMessage, onRowClick }) {
  return (
    <section className="mt-8">
      <h2 className="mb-3 font-serif text-lg font-semibold text-stone-800">{title}</h2>
      <DataTable columns={orderColumns} rows={rows} emptyMessage={emptyMessage} onRowClick={onRowClick} />
    </section>
  )
}

function CustomerDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data: customer, loading: custLoading, error: custError } = useFetch(`/customers/${id}`)
  const { data: orders, loading: ordLoading, error: ordError } = useFetch(`/customers/${id}/orders`)

  if (custLoading) return <p className="text-sm text-stone-400">Loading…</p>
  if (custError) return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
      {custError}
    </div>
  )

  // flatten order items, carrying the parent order's billing status along with each row
  const allItems = (orders ?? []).flatMap((order) =>
    order.items.map((item) => ({ ...item, billing_status: order.billing_status }))
  )
  const notBilled = allItems.filter((i) => i.billing_status === 'not_billed')
  const billed    = allItems.filter((i) => i.billing_status === 'billed')
  const paid      = allItems.filter((i) => i.billing_status === 'paid')

  return (
    <div>
      <Link
        to="/customers"
        className="mb-6 inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-800"
      >
        ← Customers
      </Link>

      {/* Customer info card */}
      <div className="mt-4 rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
        <h1 className="font-serif text-2xl font-semibold text-stone-800">{customer?.name}</h1>
        <div className="mt-3 flex flex-wrap gap-6 text-sm text-stone-600">
          {customer?.phone && (
            <span>
              <span className="font-medium text-stone-400 uppercase tracking-wide text-xs">Phone</span>
              <br />
              {customer.phone}
            </span>
          )}
          {customer?.email && (
            <span>
              <span className="font-medium text-stone-400 uppercase tracking-wide text-xs">Email</span>
              <br />
              <a href={`mailto:${customer.email}`} className="hover:text-amber-800">
                {customer.email}
              </a>
            </span>
          )}
          {customer?.notes && (
            <span>
              <span className="font-medium text-stone-400 uppercase tracking-wide text-xs">Notes</span>
              <br />
              {customer.notes}
            </span>
          )}
        </div>
      </div>

      {ordError && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Couldn't load orders: {ordError}
        </div>
      )}

      {!ordLoading && !ordError && (
        <>
          <OrderSection
            title="Not Billed"
            rows={notBilled}
            emptyMessage="No outstanding orders."
            onRowClick={(item) => navigate(`/orders/items/${item.id}`)}
          />
          <OrderSection
            title="Billed"
            rows={billed}
            emptyMessage="No invoiced orders."
            onRowClick={(item) => navigate(`/orders/items/${item.id}`)}
          />
          <OrderSection
            title="Paid"
            rows={paid}
            emptyMessage="No paid orders."
            onRowClick={(item) => navigate(`/orders/items/${item.id}`)}
          />
        </>
      )}
    </div>
  )
}

export default CustomerDetail
