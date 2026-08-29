import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import DataTable from '../components/DataTable'
import Modal from '../components/Modal'
import GreenBeanForm from '../components/GreenBeanForm'
import { useFetch } from '../hooks/useFetch'
import { formatDate } from '../utils/format'

const money = (v) => v != null ? `$${Number(v).toFixed(2)}` : '—'
const lbs = (v) => v != null ? Number(v).toFixed(2) : '—'

const shipmentColumns = [
  { key: 'date_received', label: 'Date Received', format: formatDate },
  { key: 'supplier', label: 'Supplier' },
  { key: 'lbs_purchased', label: 'Lbs Purchased', format: lbs },
  { key: 'total_cost', label: 'Total Cost', format: money },
  { key: 'cost_per_lb', label: 'Cost / Lb', format: money },
]

function GreenBeanDetail() {
  const { id } = useParams()
  const { data: bean, loading, error, refetch: refetchBean } = useFetch(`/green-beans/${id}`)
  const { data: allBeans } = useFetch('/green-beans')
  const { data: shipments, loading: shipLoading, error: shipError, refetch: refetchShipments } = useFetch(`/green-beans/${id}/shipments`)
  const [modalMode, setModalMode] = useState(null) // null | 'create' | 'edit'

  const closeModal = () => setModalMode(null)
  const handleSaved = () => {
    closeModal()
    refetchBean()
    refetchShipments()
  }

  if (loading) return <p className="text-sm text-stone-400">Loading…</p>
  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Couldn't load this origin: {error}
      </div>
    )
  }

  return (
    <div>
      <Link
        to="/green-beans"
        className="mb-6 inline-flex items-center gap-1 text-sm text-stone-400 hover:text-white"
      >
        ← Green Bean Inventory
      </Link>

      <div className="mt-4 flex items-start justify-between rounded-xl border border-stone-600 bg-stone-500 p-6 shadow-sm">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-white">{bean?.origin}</h1>
          <div className="mt-3 flex flex-wrap gap-6 text-sm text-stone-100">
            <span>
              <span className="text-xs font-medium uppercase tracking-wide text-stone-300">Supplier</span>
              <br />{bean?.supplier || '—'}
            </span>
            <span>
              <span className="text-xs font-medium uppercase tracking-wide text-stone-300">Lbs Remaining</span>
              <br />{lbs(bean?.lbs_remaining)}
            </span>
            <span>
              <span className="text-xs font-medium uppercase tracking-wide text-stone-300">Total Cost</span>
              <br />{money(bean?.total_cost)}
            </span>
            <span>
              <span className="text-xs font-medium uppercase tracking-wide text-stone-300">Cost / Lb</span>
              <br />{money(bean?.cost_per_lb)}
            </span>
          </div>
        </div>
        <button
          onClick={() => setModalMode('edit')}
          className="rounded-lg bg-stone-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-stone-700"
        >
          Edit
        </button>
      </div>

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-serif text-lg font-semibold text-stone-100">Shipments</h2>
          <button
            onClick={() => setModalMode('create')}
            className="rounded-lg bg-amber-800 px-3 py-1.5 text-sm font-medium text-amber-50 shadow-sm transition-colors hover:bg-amber-900"
          >
            New Shipment
          </button>
        </div>

        {shipError && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Couldn't load shipments: {shipError}
          </div>
        )}

        {!shipLoading && !shipError && (
          <DataTable columns={shipmentColumns} rows={shipments} emptyMessage="No shipments recorded yet." />
        )}
      </section>

      {modalMode && (
        <Modal
          title={modalMode === 'create' ? 'New Shipment' : 'Edit Green Bean Stock'}
          onClose={closeModal}
        >
          <GreenBeanForm
            bean={modalMode === 'edit' ? bean : null}
            allBeans={allBeans || []}
            initialOrigin={bean?.origin}
            onSaved={handleSaved}
            onCancel={closeModal}
          />
        </Modal>
      )}
    </div>
  )
}

export default GreenBeanDetail
