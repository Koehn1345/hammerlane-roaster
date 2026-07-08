import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import DataTable from '../components/DataTable'
import Modal from '../components/Modal'
import BlendForm from '../components/BlendForm'
import { useFetch } from '../hooks/useFetch'

const columns = [
  { key: 'name', label: 'Name' },
  { key: 'description', label: 'Description' },
  { key: 'beans', label: 'Beans' },
  {
    key: 'cost_per_lb',
    label: 'Cost / lb',
    format: (v) => v != null ? `$${Number(v).toFixed(2)}` : '—',
  },
  {
    key: 'paylink',
    label: 'Pay Link',
    format: (v) => v
      ? <a href={v} target="_blank" rel="noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="text-blue-700 underline hover:text-blue-900">Link</a>
      : <span className="text-stone-400">—</span>,
  },
  {
    key: 'label_pdf_url',
    label: 'Label PDF',
    format: (v) => v
      ? <a href={v} target="_blank" rel="noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="text-blue-700 underline hover:text-blue-900">PDF</a>
      : <span className="text-stone-400">—</span>,
  },
]

function Blends() {
  const navigate = useNavigate()
  const { data: blends, loading, error, refetch } = useFetch('/blends')
  const [modalMode, setModalMode] = useState(null)

  const closeModal = () => setModalMode(null)
  const handleSaved = () => { closeModal(); refetch() }

  const rows = blends?.map((blend) => ({
    ...blend,
    beans: blend.components.map((c) => `${c.origin?.trim()} (${Number(c.percentage).toFixed(0)}%)`).join(', ') || '—',
  }))

  return (
    <div>
      <PageHeader
        title="Blends"
        description="Your signature roasts and bean mixes."
        action={
          <button
            onClick={() => setModalMode('create')}
            className="rounded-lg bg-amber-800 px-4 py-2 text-sm font-medium text-amber-50 shadow-sm transition-colors hover:bg-amber-900"
          >
            New Blend
          </button>
        }
      />

      {loading && <p className="text-sm text-stone-400">Loading blends…</p>}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Couldn't load blends: {error}
        </div>
      )}

      {!loading && !error && (
        <DataTable
          columns={columns}
          rows={rows}
          emptyMessage="No blends yet."
          onRowClick={(blend) => navigate(`/blends/${blend.id}`)}
          renderActions={(blend) => (
            <button
              onClick={(e) => { e.stopPropagation(); setModalMode(blend) }}
              className="text-sm font-medium text-amber-800 hover:text-amber-900"
            >
              Edit
            </button>
          )}
        />
      )}

      {modalMode && (
        <Modal title={modalMode === 'create' ? 'New Blend' : 'Edit Blend'} onClose={closeModal}>
          <BlendForm blend={modalMode === 'create' ? null : modalMode} onSaved={handleSaved} onCancel={closeModal} />
        </Modal>
      )}
    </div>
  )
}

export default Blends
