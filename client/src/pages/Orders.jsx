import { useState } from 'react'
import PageHeader from '../components/PageHeader'
import Modal from '../components/Modal'
import OrderForm from '../components/OrderForm'
import OrdersTable from '../components/OrdersTable'
import { useFetch } from '../hooks/useFetch'

function Orders() {
  const { data: orders, loading, error, refetch } = useFetch('/orders')
  const [modalMode, setModalMode] = useState(null)

  const closeModal = () => setModalMode(null)
  const handleSaved = () => { closeModal(); refetch() }

  return (
    <div>
      <PageHeader
        title="Orders"
        description="Track customer orders from roast to delivery."
        action={
          <button
            onClick={() => setModalMode('create')}
            className="rounded-lg bg-amber-800 px-4 py-2 text-sm font-medium text-amber-50 shadow-sm transition-colors hover:bg-amber-900"
          >
            New Order
          </button>
        }
      />

      {loading && <p className="text-sm text-stone-400">Loading orders…</p>}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Couldn't load orders: {error}
        </div>
      )}

      {!loading && !error && (
        <OrdersTable
          orders={orders}
          refetch={refetch}
          onEdit={(row) => setModalMode(orders.find((o) => o.id === row.order_id))}
        />
      )}

      {modalMode && (
        <Modal title={modalMode === 'create' ? 'New Order' : 'Edit Order'} onClose={closeModal}>
          <OrderForm
            order={modalMode === 'create' ? null : modalMode}
            onSaved={handleSaved}
            onCancel={closeModal}
          />
        </Modal>
      )}
    </div>
  )
}

export default Orders
