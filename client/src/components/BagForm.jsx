import { useState } from 'react'
import api from '../api/client'
import { nullifyEmpty } from '../utils/nullifyEmpty'

const emptyForm = { size_oz: '', size_label: '', size_lbs: '', quantity_on_hand: '', cost_each: '', price_whole: '', price_ground: '' }

const input = 'mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-amber-700 focus:outline-none focus:ring-1 focus:ring-amber-700'
const inputDisabled = input + ' disabled:bg-stone-100 disabled:text-stone-400'

function BagForm({ bag, onSaved, onCancel }) {
  const [form, setForm] = useState(
    bag
      ? {
          size_oz: bag.size_oz || '',
          size_label: bag.size_label || '',
          size_lbs: bag.size_lbs || '',
          quantity_on_hand: bag.quantity_on_hand ?? '',
          cost_each: bag.cost_each || '',
          price_whole: bag.price_whole || '',
          price_ground: bag.price_ground || '',
        }
      : emptyForm
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const res = bag
        ? await api.patch(
            `/bags/${bag.id}`,
            nullifyEmpty({
              cost_each: form.cost_each,
              quantity_on_hand: form.quantity_on_hand,
              price_whole: form.price_whole,
              price_ground: form.price_ground,
              size_lbs: form.size_lbs,
            })
          )
        : await api.post('/bags', nullifyEmpty(form))
      onSaved(res.data)
    } catch (err) {
      setError(err.response?.data?.error || err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-stone-700">Size Label</label>
          <input type="text" required disabled={!!bag} value={form.size_label} onChange={set('size_label')} className={inputDisabled} />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700">Size (oz)</label>
          <input type="number" step="1" min="0" required disabled={!!bag} value={form.size_oz} onChange={set('size_oz')} className={inputDisabled} />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-stone-700">Weight (lbs) — used for roasting totals</label>
        <input type="number" step="0.01" min="0" value={form.size_lbs} onChange={set('size_lbs')} className={input} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-stone-700">Qty on Hand</label>
          <input type="number" step="1" min="0" value={form.quantity_on_hand} onChange={set('quantity_on_hand')} className={input} />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700">Cost Each</label>
          <input type="number" step="0.01" min="0" value={form.cost_each} onChange={set('cost_each')} className={input} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-stone-700">Price — Whole Bean</label>
          <input type="number" step="0.01" min="0" value={form.price_whole} onChange={set('price_whole')} className={input} />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700">Price — Ground</label>
          <input type="number" step="0.01" min="0" value={form.price_ground} onChange={set('price_ground')} className={input} />
        </div>
      </div>

      {error && <p className="text-sm text-red-700">{error}</p>}

      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="rounded-lg px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100">
          Cancel
        </button>
        <button type="submit" disabled={saving} className="rounded-lg bg-amber-800 px-4 py-2 text-sm font-medium text-amber-50 shadow-sm transition-colors hover:bg-amber-900 disabled:opacity-50">
          {saving ? 'Saving…' : bag ? 'Save Changes' : 'Add Bag Order'}
        </button>
      </div>
    </form>
  )
}

export default BagForm
