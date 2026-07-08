import { useState } from 'react'
import api from '../api/client'
import { useFetch } from '../hooks/useFetch'
import { nullifyEmpty } from '../utils/nullifyEmpty'
import SearchableSelect from './SearchableSelect'

const emptyItem = { blend_id: '', bag_size_oz: '', grind_type: 'whole', quantity: 1, sale_price_per_bag: '' }

const inputCls = 'mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-amber-700 focus:outline-none focus:ring-1 focus:ring-amber-700'

function priceFor(bags, bag_size_oz, grind_type) {
  const bag = bags?.find((b) => String(b.size_oz) === String(bag_size_oz))
  if (!bag) return ''
  const price = grind_type === 'ground' ? bag.price_ground : bag.price_whole
  return price ?? ''
}

function ItemRow({ item, index, bags, blends, onChange, onRemove, removable }) {
  const set = (field) => (e) => {
    const value = e.target.value
    const next = { ...item, [field]: value }
    if (field === 'bag_size_oz' || field === 'grind_type') {
      const price = priceFor(bags, next.bag_size_oz, next.grind_type)
      if (price !== '') next.sale_price_per_bag = price
    }
    onChange(index, next)
  }

  return (
    <div className="rounded-lg border border-stone-200 p-3">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs font-medium text-stone-500">Blend</label>
          <select required value={item.blend_id} onChange={set('blend_id')} className={inputCls}>
            <option value="">Select blend…</option>
            {blends?.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-stone-500">Bag Size</label>
          <select required value={item.bag_size_oz} onChange={set('bag_size_oz')} className={inputCls}>
            <option value="">Select size…</option>
            {bags?.map((b) => <option key={b.id} value={b.size_oz}>{b.size_label || `${b.size_oz}oz`}</option>)}
          </select>
        </div>
      </div>

      <div className="mt-2 grid grid-cols-3 gap-2">
        <div>
          <label className="block text-xs font-medium text-stone-500">Grind</label>
          <select value={item.grind_type} onChange={set('grind_type')} className={inputCls}>
            <option value="whole">Whole Bean</option>
            <option value="ground">Ground</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-stone-500">Qty</label>
          <input type="number" step="1" min="1" required value={item.quantity} onChange={set('quantity')} className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-medium text-stone-500">Price / Bag</label>
          <input type="number" step="0.01" min="0" value={item.sale_price_per_bag} onChange={set('sale_price_per_bag')} className={inputCls} />
        </div>
      </div>

      {removable && (
        <button
          type="button"
          onClick={() => onRemove(index)}
          className="mt-2 text-xs font-medium text-stone-400 hover:text-red-600"
        >
          Remove item
        </button>
      )}
    </div>
  )
}

function OrderForm({ order, onSaved, onCancel }) {
  const { data: customers } = useFetch('/customers')
  const { data: blends }    = useFetch('/blends')
  const { data: bags }      = useFetch('/bags')

  const [customerId, setCustomerId] = useState(order?.customer_id || '')
  const [billingStatus, setBillingStatus] = useState(order?.billing_status || 'not_billed')
  const [notes, setNotes] = useState(order?.notes || '')
  const [discount, setDiscount] = useState(order?.discount || '')
  const [items, setItems] = useState(
    order?.items?.length
      ? order.items.map((i) => ({
          blend_id: i.blend_id,
          bag_size_oz: i.bag_size_oz,
          grind_type: i.grind_type || 'whole',
          quantity: i.quantity,
          sale_price_per_bag: i.sale_price_per_bag || '',
        }))
      : [{ ...emptyItem }]
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const updateItem = (index, next) => setItems(items.map((it, i) => (i === index ? next : it)))
  const addItem = () => setItems([...items, { ...emptyItem }])
  const removeItem = (index) => setItems(items.filter((_, i) => i !== index))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const discountValue = discount === '' ? 0 : discount
      const payload = { customer_id: customerId, notes, billing_status: billingStatus, discount: discountValue, items: items.map(nullifyEmpty) }
      if (order) {
        // Patch order header
        const res = await api.patch(`/orders/${order.id}`, { customer_id: customerId, notes, billing_status: billingStatus, discount: discountValue })
        // Patch each line item that has a known ID
        for (let idx = 0; idx < items.length; idx++) {
          const originalItem = order.items?.[idx]
          if (originalItem?.id) {
            await api.patch(`/orders/items/${originalItem.id}`, nullifyEmpty({
              blend_id:          items[idx].blend_id,
              bag_size_oz:       items[idx].bag_size_oz,
              grind_type:        items[idx].grind_type,
              quantity:          items[idx].quantity,
              sale_price_per_bag: items[idx].sale_price_per_bag,
            }))
          }
        }
        onSaved(res.data)
      } else {
        const res = await api.post('/orders', payload)
        onSaved(res.data)
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-stone-700">Customer</label>
        <SearchableSelect
          options={(customers || []).map((c) => ({ value: c.id, label: c.name }))}
          value={customerId}
          onChange={setCustomerId}
          placeholder="Search customers…"
          inputCls={inputCls}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-stone-700">Items</label>
        <div className="mt-2 space-y-2">
          {items.map((item, i) => (
            <ItemRow
              key={i}
              item={item}
              index={i}
              bags={bags}
              blends={blends}
              onChange={updateItem}
              onRemove={removeItem}
              removable={items.length > 1 && !order}
            />
          ))}
        </div>
        {!order && (
          <button type="button" onClick={addItem} className="mt-2 text-sm font-medium text-amber-800 hover:text-amber-900">
            + Add another blend
          </button>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-stone-700">Notes</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={inputCls} />
      </div>

      <div>
        <label className="block text-sm font-medium text-stone-700">Discount ($)</label>
        <input
          type="number"
          step="0.01"
          min="0"
          placeholder="0.00"
          value={discount}
          onChange={(e) => setDiscount(e.target.value)}
          className={inputCls}
        />
        <p className="mt-1 text-xs text-stone-400">Flat amount off the whole order — e.g. a subscription discount. Spread across items for profit tracking.</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-stone-700">Payment Status</label>
        <div className="mt-2 flex gap-2">
          {[
            { value: 'not_billed', label: 'Not Billed', active: 'bg-stone-700 text-white', inactive: 'bg-white text-stone-600' },
            { value: 'billed',     label: 'Billed',     active: 'bg-blue-600 text-white',   inactive: 'bg-white text-stone-600' },
            { value: 'paid',       label: 'Paid',       active: 'bg-green-700 text-white',   inactive: 'bg-white text-stone-600' },
          ].map(({ value, label, active, inactive }) => (
            <button
              key={value}
              type="button"
              onClick={() => setBillingStatus(value)}
              className={`flex-1 rounded-lg border py-2 text-sm font-medium transition-colors ${
                billingStatus === value
                  ? `${active} border-transparent shadow-sm`
                  : `${inactive} border-stone-300 hover:border-stone-400`
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-red-700">{error}</p>}

      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="rounded-lg px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100">
          Cancel
        </button>
        <button type="submit" disabled={saving} className="rounded-lg bg-amber-800 px-4 py-2 text-sm font-medium text-amber-50 shadow-sm transition-colors hover:bg-amber-900 disabled:opacity-50">
          {saving ? 'Saving…' : order ? 'Save Changes' : 'Add Order'}
        </button>
      </div>
    </form>
  )
}

export default OrderForm
