import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Modal from '../components/Modal'
import OrderForm from '../components/OrderForm'
import { useFetch } from '../hooks/useFetch'
import api from '../api/client'
import { formatDate } from '../utils/format'

const money = (v) => (v != null ? `$${Number(v).toFixed(2)}` : '—')
const lbs = (v) => Number(v || 0).toFixed(2)

function Toggle({ label, checked, onChange }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`flex flex-1 flex-col items-center gap-2 rounded-xl border-2 p-4 transition-colors ${
        checked
          ? 'border-amber-700 bg-amber-50 text-amber-800'
          : 'border-stone-200 bg-white text-stone-400 hover:border-stone-300'
      }`}
    >
      <span className="text-2xl">{checked ? '✓' : '○'}</span>
      <span className="text-sm font-medium">{label}</span>
    </button>
  )
}

function RoasterBtn({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-xl border-2 py-4 text-lg font-bold transition-colors ${
        active
          ? 'border-amber-700 bg-amber-800 text-amber-50'
          : 'border-stone-200 bg-white text-stone-500 hover:border-amber-400'
      }`}
    >
      {label}
    </button>
  )
}

function RoastingItemDetail() {
  const { itemId } = useParams()
  const navigate = useNavigate()
  const { data: item, loading, error, refetch } = useFetch(`/orders/items/${itemId}`)
  const { data: orders } = useFetch('/orders')
  const [editing, setEditing] = useState(false)
  const [patching, setPatching] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const patch = async (fields) => {
    setPatching(true)
    await api.patch(`/orders/items/${itemId}`, fields)
    await refetch()
    setPatching(false)
  }

  const localToday = () => new Date().toLocaleDateString('en-CA')

  const markRoasted = async () => {
    await patch({ status: 'roasted', local_date: localToday() })
    navigate('/roasting')
  }

  if (loading && !item) return <p className="p-6 text-sm text-stone-400">Loading…</p>
  if (error || !item) return (
    <div className="p-6">
      <Link to="/roasting" className="text-sm text-stone-500 hover:text-stone-800">← Roasting</Link>
      <p className="mt-4 text-sm text-red-600">{error || 'Item not found'}</p>
    </div>
  )

  const parentOrder = orders?.find((o) => o.id === item.order_id)

  return (
    <div className="mx-auto max-w-lg">
      <Link to="/roasting" className="mb-4 inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-800">
        ← Roasting
      </Link>

      {/* Customer / order info */}
      <div className="mt-2 rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
        <h1 className="font-serif text-2xl font-semibold text-stone-800">{item.customer_name}</h1>
        <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <div>
            <p className="text-xs uppercase tracking-wide text-stone-400">Blend</p>
            <p className="font-medium text-stone-800">{item.blend_name}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-stone-400">Grind</p>
            <p className="font-medium capitalize text-stone-800">
              {item.grind_type === 'ground' ? 'Ground' : 'Whole Bean'}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-stone-400">Size</p>
            <p className="font-medium text-stone-800">{item.size_label?.trim() || `${item.bag_size_oz}oz`}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-stone-400">Qty</p>
            <p className="font-medium text-stone-800">{item.quantity}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-stone-400">Weight</p>
            <p className="font-medium text-stone-800">{lbs(item.weight)} lbs</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-stone-400">Order Date</p>
            <p className="font-medium text-stone-800">{formatDate(item.created_at)}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-stone-400">Revenue</p>
            <p className="font-medium text-stone-800">{money(Number(item.sale_price_per_bag) * item.quantity)}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-stone-400">Profit</p>
            <p className="font-semibold text-green-700">{money(item.profit)}</p>
          </div>
          {item.roast_date && (
            <div className="col-span-2">
              <p className="text-xs uppercase tracking-wide text-stone-400">Roasted</p>
              <p className="font-medium text-green-700">{formatDate(item.roast_date)}</p>
            </div>
          )}
        </div>
      </div>

      {/* Weighed / Label toggles */}
      <div className="mt-4 flex gap-3">
        <Toggle label="Weighed" checked={item.weighed} onChange={() => patch({ weighed: !item.weighed })} />
        <Toggle label="Label" checked={item.labeled} onChange={() => patch({ labeled: !item.labeled })} />
      </div>

      {/* Roaster selection */}
      <div className="mt-4">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-stone-400">Roaster</p>
        <div className="flex gap-3">
          <RoasterBtn
            label="1# Roaster"
            active={item.roaster_used === '1lb'}
            onClick={() => patch({ roaster_used: item.roaster_used === '1lb' ? null : '1lb' })}
          />
          <RoasterBtn
            label="2# Roaster"
            active={item.roaster_used === '2lb'}
            onClick={() => patch({ roaster_used: item.roaster_used === '2lb' ? null : '2lb' })}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="mt-6 flex gap-3">
        <button
          onClick={() => setEditing(true)}
          className="flex-1 rounded-xl border-2 border-stone-200 bg-white py-3 text-sm font-medium text-stone-700 transition-colors hover:border-stone-300"
        >
          Edit Order
        </button>
        {item.status !== 'roasted' ? (
          <button
            onClick={markRoasted}
            disabled={patching}
            className="flex-1 rounded-xl bg-green-700 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-green-800 disabled:opacity-50"
          >
            {patching ? 'Saving…' : '✓ Mark Roasted'}
          </button>
        ) : (
          <div className="flex flex-1 items-center justify-center rounded-xl bg-green-50 py-3 text-sm font-medium text-green-700">
            ✓ Roasted {formatDate(item.roast_date)}
          </div>
        )}
      </div>

      {/* Delete */}
      <div className="mt-4 flex justify-center">
        {confirmDelete ? (
          <div className="flex items-center gap-3">
            <span className="text-sm text-stone-500">Delete this order item?</span>
            <button
              onClick={async () => {
                await api.delete(`/orders/items/${itemId}`)
                navigate('/roasting')
              }}
              className="rounded-lg bg-red-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-red-700"
            >
              Yes, delete
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="rounded-lg px-4 py-1.5 text-sm font-medium text-stone-500 hover:text-stone-700"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="text-sm font-medium text-red-500 hover:text-red-700"
          >
            Delete item
          </button>
        )}
      </div>

      {editing && parentOrder && (
        <Modal title="Edit Order" onClose={() => setEditing(false)}>
          <OrderForm
            order={parentOrder}
            onSaved={() => { setEditing(false); refetch() }}
            onCancel={() => setEditing(false)}
          />
        </Modal>
      )}
    </div>
  )
}

export default RoastingItemDetail
