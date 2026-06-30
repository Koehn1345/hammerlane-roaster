import { useState } from 'react'
import api from '../api/client'
import { nullifyEmpty } from '../utils/nullifyEmpty'

const emptyForm = { origin: '', supplier: '', lbs_purchased: '', cost_per_lb: '', date_received: '' }

function GreenBeanForm({ bean, onSaved, onCancel }) {
  const [form, setForm] = useState(
    bean
      ? {
          origin: bean.origin || '',
          supplier: bean.supplier || '',
          cost_per_lb: bean.cost_per_lb || '',
          lbs_remaining: bean.lbs_remaining || '',
          date_received: bean.date_received ? bean.date_received.slice(0, 10) : '',
        }
      : emptyForm
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const handleChange = (field) => (e) => setForm({ ...form, [field]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const payload = nullifyEmpty(form)
      const res = bean
        ? await api.patch(`/green-beans/${bean.id}`, payload)
        : await api.post('/green-beans', payload)
      onSaved(res.data)
    } catch (err) {
      setError(err.response?.data?.error || err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-stone-700">Origin</label>
        <input
          type="text"
          required
          value={form.origin}
          onChange={handleChange('origin')}
          className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-amber-700 focus:outline-none focus:ring-1 focus:ring-amber-700"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-stone-700">Supplier</label>
        <input
          type="text"
          value={form.supplier}
          onChange={handleChange('supplier')}
          className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-amber-700 focus:outline-none focus:ring-1 focus:ring-amber-700"
        />
      </div>

      {bean ? (
        <div>
          <label className="block text-sm font-medium text-stone-700">Lbs Remaining</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={form.lbs_remaining}
            onChange={handleChange('lbs_remaining')}
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-amber-700 focus:outline-none focus:ring-1 focus:ring-amber-700"
          />
        </div>
      ) : (
        <div>
          <label className="block text-sm font-medium text-stone-700">Lbs Purchased</label>
          <input
            type="number"
            step="0.01"
            min="0"
            required
            value={form.lbs_purchased}
            onChange={handleChange('lbs_purchased')}
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-amber-700 focus:outline-none focus:ring-1 focus:ring-amber-700"
          />
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-stone-700">Cost / Lb</label>
        <input
          type="number"
          step="0.01"
          min="0"
          value={form.cost_per_lb}
          onChange={handleChange('cost_per_lb')}
          className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-amber-700 focus:outline-none focus:ring-1 focus:ring-amber-700"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-stone-700">Date Received</label>
        <input
          type="date"
          value={form.date_received}
          onChange={handleChange('date_received')}
          className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-amber-700 focus:outline-none focus:ring-1 focus:ring-amber-700"
        />
      </div>

      {error && <p className="text-sm text-red-700">{error}</p>}

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-amber-800 px-4 py-2 text-sm font-medium text-amber-50 shadow-sm transition-colors hover:bg-amber-900 disabled:opacity-50"
        >
          {saving ? 'Saving…' : bean ? 'Save Changes' : 'Add Shipment'}
        </button>
      </div>
    </form>
  )
}

export default GreenBeanForm
