import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Modal from '../components/Modal'
import BlendForm from '../components/BlendForm'
import { useFetch } from '../hooks/useFetch'
import api from '../api/client'

function BlendDetail() {
  const { id }     = useParams()
  const navigate   = useNavigate()
  const { data: blend, loading, error, refetch } = useFetch(`/blends/${id}`)

  const [editing,       setEditing]       = useState(false)
  const [editPaylink,   setEditPaylink]   = useState(false)
  const [editPdf,       setEditPdf]       = useState(false)
  const [paylinkVal,    setPaylinkVal]    = useState('')
  const [pdfVal,        setPdfVal]        = useState('')
  const [saving,        setSaving]        = useState(false)

  const saveField = async (fields) => {
    setSaving(true)
    await api.patch(`/blends/${id}`, fields)
    await refetch()
    setSaving(false)
  }

  if (loading && !blend) return <p className="text-sm text-stone-400">Loading…</p>
  if (error || !blend) return (
    <div className="p-4">
      <button onClick={() => navigate(-1)} className="text-sm text-stone-400 hover:text-white">← Back</button>
      <p className="mt-4 text-sm text-red-600">{error || 'Blend not found'}</p>
    </div>
  )

  const inputCls = 'w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-amber-700 focus:outline-none focus:ring-1 focus:ring-amber-700'

  return (
    <div className="mx-auto max-w-lg">
      <button onClick={() => navigate(-1)} className="mb-4 inline-flex items-center gap-1 text-sm text-stone-400 hover:text-white">
        ← Back
      </button>

      {/* Info card */}
      <div className="mt-2 rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
        <h1 className="font-serif text-2xl font-bold text-stone-800">{blend.name}</h1>
        {blend.description && <p className="mt-1 text-sm text-stone-500">{blend.description}</p>}

        {blend.components?.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-medium uppercase tracking-wide text-stone-400">Beans</p>
            <div className="mt-2 space-y-1">
              {blend.components.map((c, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-stone-700">{c.origin?.trim()}</span>
                  <span className="font-semibold text-stone-800">{Number(c.percentage).toFixed(0)}%</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Pay Link */}
      <div className="mt-4 rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-wide text-stone-400">Pay Link</p>
          <button onClick={() => { setEditPaylink(true); setPaylinkVal(blend.paylink || '') }}
            className="text-xs font-medium text-amber-800 hover:text-amber-900">
            {blend.paylink ? 'Edit' : 'Add'}
          </button>
        </div>

        {editPaylink ? (
          <div className="mt-2 flex gap-2">
            <input type="url" value={paylinkVal} onChange={(e) => setPaylinkVal(e.target.value)}
              placeholder="https://..." className={inputCls} />
            <button disabled={saving}
              onClick={async () => { await saveField({ paylink: paylinkVal }); setEditPaylink(false) }}
              className="rounded-lg bg-stone-800 px-3 py-1 text-xs font-semibold text-white disabled:opacity-50">
              {saving ? '…' : 'Save'}
            </button>
            <button onClick={() => setEditPaylink(false)} className="text-xs text-stone-400 hover:text-stone-600">
              Cancel
            </button>
          </div>
        ) : blend.paylink ? (
          <a href={blend.paylink} target="_blank" rel="noreferrer"
            className="mt-2 block truncate text-sm font-medium text-blue-700 underline hover:text-blue-900">
            {blend.paylink}
          </a>
        ) : (
          <p className="mt-1 text-sm text-stone-400">Not set</p>
        )}
      </div>

      {/* Label PDF */}
      <div className="mt-4 rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-wide text-stone-400">Label PDF</p>
          <button onClick={() => { setEditPdf(true); setPdfVal(blend.label_pdf_url || '') }}
            className="text-xs font-medium text-amber-800 hover:text-amber-900">
            {blend.label_pdf_url ? 'Edit' : 'Add'}
          </button>
        </div>

        {editPdf ? (
          <div className="mt-2 flex gap-2">
            <input type="url" value={pdfVal} onChange={(e) => setPdfVal(e.target.value)}
              placeholder="https://..." className={inputCls} />
            <button disabled={saving}
              onClick={async () => { await saveField({ label_pdf_url: pdfVal }); setEditPdf(false) }}
              className="rounded-lg bg-stone-800 px-3 py-1 text-xs font-semibold text-white disabled:opacity-50">
              {saving ? '…' : 'Save'}
            </button>
            <button onClick={() => setEditPdf(false)} className="text-xs text-stone-400 hover:text-stone-600">
              Cancel
            </button>
          </div>
        ) : blend.label_pdf_url ? (
          <a href={blend.label_pdf_url} target="_blank" rel="noreferrer"
            className="mt-2 inline-flex items-center gap-2 rounded-lg border border-stone-300 px-3 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50">
            📄 View Label PDF
          </a>
        ) : (
          <p className="mt-1 text-sm text-stone-400">Not set</p>
        )}
      </div>

      {/* Edit blend button */}
      <div className="mt-6">
        <button onClick={() => setEditing(true)}
          className="w-full rounded-xl border-2 border-stone-200 bg-white py-3 text-sm font-semibold text-stone-700 transition-colors hover:border-stone-300">
          Edit Blend
        </button>
      </div>

      {editing && (
        <Modal title="Edit Blend" onClose={() => setEditing(false)}>
          <BlendForm blend={blend} onSaved={() => { setEditing(false); refetch() }} onCancel={() => setEditing(false)} />
        </Modal>
      )}
    </div>
  )
}

export default BlendDetail
