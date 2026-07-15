import { useState } from 'react'
import PageHeader from '../components/PageHeader'
import DataTable from '../components/DataTable'
import Modal from '../components/Modal'
import GreenBeanForm from '../components/GreenBeanForm'
import { useFetch } from '../hooks/useFetch'
import { formatDate } from '../utils/format'

const columns = [
  { key: 'origin', label: 'Origin' },
  { key: 'supplier', label: 'Supplier' },
  { key: 'lbs_remaining', label: 'Lbs Remaining' },
  { key: 'cost_per_lb', label: 'Cost / Lb' },
  { key: 'date_received', label: 'Date Received', format: formatDate },
]

function GreenBeanInventory() {
  const { data: beans, loading, error, refetch } = useFetch('/green-beans')
  const [modalMode, setModalMode] = useState(null)

  const closeModal = () => setModalMode(null)
  const handleSaved = () => {
    closeModal()
    refetch()
  }

  return (
    <div>
      <PageHeader
        title="Green Bean Inventory"
        description="Raw stock from your suppliers, ready to roast."
        action={
          <button
            onClick={() => setModalMode('create')}
            className="rounded-lg bg-amber-800 px-4 py-2 text-sm font-medium text-amber-50 shadow-sm transition-colors hover:bg-amber-900"
          >
            New Shipment
          </button>
        }
      />

      {loading && <p className="text-sm text-stone-400">Loading green bean stock…</p>}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Couldn't load green bean stock: {error}
        </div>
      )}

      {!loading && !error && (
        <DataTable
          columns={columns}
          rows={beans}
          emptyMessage="No green bean stock recorded yet."
          renderActions={(bean) => (
            <button
              onClick={() => setModalMode(bean)}
              className="text-sm font-medium text-amber-300 hover:text-amber-200"
            >
              Edit
            </button>
          )}
        />
      )}

      {modalMode && (
        <Modal
          title={modalMode === 'create' ? 'New Shipment' : 'Edit Green Bean Stock'}
          onClose={closeModal}
        >
          <GreenBeanForm
            bean={modalMode === 'create' ? null : modalMode}
            allBeans={beans || []}
            onSaved={handleSaved}
            onCancel={closeModal}
          />
        </Modal>
      )}
    </div>
  )
}

export default GreenBeanInventory
