import PageHeader from '../components/PageHeader'
import NewOrderButton from '../components/NewOrderButton'
import OrdersTable from '../components/OrdersTable'
import { useFetch } from '../hooks/useFetch'

function Orders() {
  const { data: orders, loading, error, refetch } = useFetch('/orders')

  return (
    <div>
      <PageHeader
        title="Orders"
        description="Track customer orders from roast to delivery."
      />

      <NewOrderButton onCreated={refetch} />

      {loading && <p className="text-sm text-stone-400">Loading orders…</p>}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Couldn't load orders: {error}
        </div>
      )}

      {!loading && !error && (
        <OrdersTable orders={orders} refetch={refetch} />
      )}
    </div>
  )
}

export default Orders
