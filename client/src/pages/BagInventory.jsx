import { useState } from 'react'
import PageHeader from '../components/PageHeader'
import DataTable from '../components/DataTable'
import Modal from '../components/Modal'
import BagForm from '../components/BagForm'
import { useFetch } from '../hooks/useFetch'

const money = (v) => (v != null ? `$${Number(v).toFixed(2)}` : '—')

const columns = [
  { key: 'size_label', label: 'Size' },
  { key: 'size_oz', label: 'oz' },
  { key: 'quantity_on_hand', label: 'On Hand' },
  { key: 'price_whole', label: 'Whole Bean', format: money },
  { key: 'price_ground', label: 'Ground', format: money },
  { key: 'cost_each', label: 'Cost Each', format: money },
]

function BagInventory() {
  const { data: bags, loading, error, refetch } = useFetch('/bags')
  const [modalMode, setModalMode] = useState(null)

  const closeModal = () => setModalMode(null)
  const handleSaved = () => {
    closeModal()
    refetch()
  }

  return (
    <div>
      <PageHeader
        title="Bag Inventory"
        description="Packaging stock for finished roasts."
        action={
          <button
            onClick={() => setModalMode('create')}
            className="rounded-lg bg-amber-800 px-4 py-2 text-sm font-medium text-amber-50 shadow-sm transition-colors hover:bg-amber-900"
          >
            New Bag Order
          </button>
        }
      />

      {loading && <p className="text-sm text-stone-400">Loading bag stock…</p>}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Couldn't load bag stock: {error}
        </div>
      )}

      {!loading && !error && (
        <DataTable
          columns={columns}
          rows={bags}
          emptyMessage="No bag stock recorded yet."
          renderActions={(bag) => (
            <button
              onClick={() => setModalMode(bag)}
              className="text-sm font-medium text-amber-800 hover:text-amber-900"
            >
              Edit
            </button>
          )}
        />
      )}

      {modalMode && (
        <Modal title={modalMode === 'create' ? 'New Bag Order' : 'Edit Bag Stock'} onClose={closeModal}>
          <BagForm bag={modalMode === 'create' ? null : modalMode} onSaved={handleSaved} onCancel={closeModal} />
        </Modal>
      )}
    </div>
  )
}

export default BagInventory
