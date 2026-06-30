import { useState } from 'react'
import api from '../api/client'
import { useFetch } from '../hooks/useFetch'

function BlendForm({ blend, onSaved, onCancel }) {
  const { data: greenBeans } = useFetch('/green-beans')

  const [name, setName] = useState(blend?.name || '')
  const [description, setDescription] = useState(blend?.description || '')
  const [components, setComponents] = useState(
    blend?.components?.map((c) => ({ green_bean_id: c.green_bean_id, percentage: c.percentage })) || [
      { green_bean_id: '', percentage: '' },
    ]
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const updateComponent = (index, field, value) => {
    setComponents(components.map((c, i) => (i === index ? { ...c, [field]: value } : c)))
  }

  const addComponent = () => setComponents([...components, { green_bean_id: '', percentage: '' }])
  const removeComponent = (index) => setComponents(components.filter((_, i) => i !== index))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const payload = { name, description, components }
    try {
      const res = blend
        ? await api.patch(`/blends/${blend.id}`, payload)
        : await api.post('/blends', payload)
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
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-amber-700 focus:outline-none focus:ring-1 focus:ring-amber-700"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-stone-700">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-amber-700 focus:outline-none focus:ring-1 focus:ring-amber-700"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-stone-700">Beans</label>
        <div className="mt-2 space-y-2">
          {components.map((c, i) => (
            <div key={i} className="flex items-center gap-2">
              <select
                required
                value={c.green_bean_id}
                onChange={(e) => updateComponent(i, 'green_bean_id', e.target.value)}
                className="flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-amber-700 focus:outline-none focus:ring-1 focus:ring-amber-700"
              >
                <option value="">Select bean…</option>
                {greenBeans?.map((bean) => (
                  <option key={bean.id} value={bean.id}>
                    {bean.origin}
                  </option>
                ))}
              </select>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                required
                placeholder="%"
                value={c.percentage}
                onChange={(e) => updateComponent(i, 'percentage', e.target.value)}
                className="w-20 rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-amber-700 focus:outline-none focus:ring-1 focus:ring-amber-700"
              />
              <button
                type="button"
                onClick={() => removeComponent(i)}
                disabled={components.length === 1}
                className="text-stone-400 hover:text-red-600 disabled:opacity-30"
                aria-label="Remove bean"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addComponent}
          className="mt-2 text-sm font-medium text-amber-800 hover:text-amber-900"
        >
          + Add bean
        </button>
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
          {saving ? 'Saving…' : blend ? 'Save Changes' : 'Add Blend'}
        </button>
      </div>
    </form>
  )
}

export default BlendForm
