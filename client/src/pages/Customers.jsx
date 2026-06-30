import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import DataTable from '../components/DataTable'
import Modal from '../components/Modal'
import CustomerForm from '../components/CustomerForm'
import { useFetch } from '../hooks/useFetch'

const columns = [
  { key: 'name', label: 'Name' },
  { key: 'phone', label: 'Phone' },
  { key: 'email', label: 'Email' },
  { key: 'notes', label: 'Notes' },
]

function Customers() {
  const navigate = useNavigate()
  const { data: customers, loading, error, refetch } = useFetch('/customers')
  const [modalMode, setModalMode] = useState(null) // null | 'create' | customer object being edited

  const closeModal = () => setModalMode(null)
  const handleSaved = () => {
    closeModal()
    refetch()
  }

  return (
    <div>
      <PageHeader
        title="Customers"
        description="Everyone you roast for."
        action={
          <button
            onClick={() => setModalMode('create')}
            className="rounded-lg bg-amber-800 px-4 py-2 text-sm font-medium text-amber-50 shadow-sm transition-colors hover:bg-amber-900"
          >
            New Customer
          </button>
        }
      />

      {loading && <p className="text-sm text-stone-400">Loading customers…</p>}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Couldn't load customers: {error}
        </div>
      )}

      {!loading && !error && (
        <DataTable
          columns={columns}
          rows={customers}
          emptyMessage="No customers yet."
          onRowClick={(customer) => navigate(`/customers/${customer.id}`)}
          renderActions={(customer) => (
            <button
              onClick={() => setModalMode(customer)}
              className="text-sm font-medium text-amber-800 hover:text-amber-900"
            >
              Edit
            </button>
          )}
        />
      )}

      {modalMode && (
        <Modal
          title={modalMode === 'create' ? 'New Customer' : 'Edit Customer'}
          onClose={closeModal}
        >
          <CustomerForm
            customer={modalMode === 'create' ? null : modalMode}
            onSaved={handleSaved}
            onCancel={closeModal}
          />
        </Modal>
      )}
    </div>
  )
}

export default Customers
