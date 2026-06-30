import { useState } from 'react'
import api from '../api/client'

const emptyForm = { name: '', phone: '', email: '', notes: '' }

function CustomerForm({ customer, onSaved, onCancel }) {
  const [form, setForm] = useState(
    customer
      ? {
          name: customer.name || '',
          phone: customer.phone || '',
          email: customer.email || '',
          notes: customer.notes || '',
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
      const res = customer
        ? await api.patch(`/customers/${customer.id}`, form)
        : await api.post('/customers', form)
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
        <label className="block text-sm font-medium text-stone-700">Name</label>
        <input
          type="text"
          required
          value={form.name}
          onChange={handleChange('name')}
          className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-amber-700 focus:outline-none focus:ring-1 focus:ring-amber-700"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-stone-700">Phone</label>
        <input
          type="text"
          value={form.phone}
          onChange={handleChange('phone')}
          className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-amber-700 focus:outline-none focus:ring-1 focus:ring-amber-700"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-stone-700">Email</label>
        <input
          type="email"
          value={form.email}
          onChange={handleChange('email')}
          className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-amber-700 focus:outline-none focus:ring-1 focus:ring-amber-700"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-stone-700">Notes</label>
        <textarea
          value={form.notes}
          onChange={handleChange('notes')}
          rows={3}
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
          {saving ? 'Saving…' : customer ? 'Save Changes' : 'Add Customer'}
        </button>
      </div>
    </form>
  )
}

export default CustomerForm
