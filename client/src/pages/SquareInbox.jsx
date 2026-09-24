import { useEffect, useMemo, useState } from 'react'
import PageHeader from '../components/PageHeader'
import SearchableSelect from '../components/SearchableSelect'
import { useFetch } from '../hooks/useFetch'
import api from '../api/client'

const money = (v) => `$${Number(v || 0).toFixed(2)}`

const inputCls =
  'mt-1 w-full rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-sm text-stone-700 focus:border-amber-700 focus:outline-none focus:ring-1 focus:ring-amber-700'

const WALK_IN = '__walkin__'

function pacificDate(value) {
  if (!value) return 'â'
  return new Date(value).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
    timeZone: 'America/Los_Angeles',
  })
}

function typeLabel(t) {
  if (t === 'PICKUP') return 'Pickup'
  if (t === 'SHIPMENT') return 'Ship'
  if (t === 'DIGITAL') return 'Payment link'
  return 'No fulfillment'
}

function InboxCard({ row, customers, blends, bags, onDone }) {
  const [customerId, setCustomerId] = useState(row.suggested_customer_id ?? WALK_IN)
  const [items, setItems] = useState(() =>
    row.items.map((i) => ({ ...i, include: true, blend_id: i.blend_id ?? '', bag_size_oz: i.bag_size_oz ?? '' }))
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const customerOptions = useMemo(
    () => [{ value: WALK_IN, label: 'Square Walk-in (name goes in notes)' },
           ...customers.map((c) => ({ value: c.id, label: c.name }))],
    [customers]
  )

  const setItem = (idx, field, value) =>
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [field]: value } : it)))

  const add = async () => {
    const chosen = items.filter((i) => i.include)
    setBusy(true); setError(null)
    try {
      await api.post(`/square/inbox/${row.id}/add`, {
        customer_id: customerId === WALK_IN ? null : Number(customerId),
        items: chosen.map((i) => ({
          blend_id: Number(i.blend_id),
          bag_size_oz: Number(i.bag_size_oz),
          grind_type: i.grind_type,
          quantity: Number(i.quantity),
          sale_price_per_bag: i.sale_price_per_bag,
        })),
      })
      onDone()
    } catch (err) {
      setError(err.response?.data?.error || err.message)
      setBusy(false)
    }
  }

  const dismiss = async () => {
    setBusy(true); setError(null)
    try {
      await api.post(`/square/inbox/${row.id}/dismiss`)
      onDone()
    } catch (err) {
      setError(err.response?.data?.error || err.message)
      setBusy(false)
    }
  }

  const incomplete = items.some((i) => i.include && (!i.blend_id || !i.bag_size_oz))
  const noneIncluded = !items.some((i) => i.include)

  return (
    <div className="mb-4 overflow-hidden rounded-xl border border-stone-600 bg-stone-500 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-600 bg-stone-600 px-4 py-2.5">
        <div className="min-w-0">
          <span className="font-medium text-white">{row.buyer_name || 'Unknown buyer'}</span>
          <span className="ml-2 text-xs text-stone-300">
            {pacificDate(row.square_created_at)} Â· {typeLabel(row.fulfillment_type)}
            {row.source ? ` Â· ${row.source}` : ''}
          </span>
        </div>
        <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
          {money(row.total)} paid
        </span>
      </div>

      <div className="space-y-3 p-4">
        {row.possible_matches.length > 0 && (
          <div className="rounded-lg border border-yellow-300 bg-yellow-50 p-3 text-xs text-yellow-900">
            <p className="font-semibold">Might already be in the app:</p>
            {row.possible_matches.map((m) => (
              <p key={m.id}>
                Order #{m.id} Â· {pacificDate(m.created_at)} Â· {m.summary || 'no items'}
              </p>
            ))}
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-stone-200">Customer</label>
          <SearchableSelect
            options={customerOptions}
            value={customerId}
            onChange={setCustomerId}
            placeholder="Search customersâ¦"
            inputCls={inputCls}
          />
          {row.buyer_phone && <p className="mt-1 text-xs text-stone-300">Square phone: {row.buyer_phone}</p>}
        </div>

        {items.map((it, idx) => (
          <div key={idx} className={`rounded-lg border border-stone-400 p-3 ${it.include ? '' : 'opacity-50'}`}>
            <label className="flex items-center gap-2 text-sm text-white">
              <input
                type="checkbox"
                checked={it.include}
                onChange={(e) => setItem(idx, 'include', e.target.checked)}
              />
              {it.quantity}Ã {it.square_name}{it.square_variation ? ` (${it.square_variation})` : ''}
            </label>
            {it.include && (
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs text-stone-200">Blend</label>
                  <select value={it.blend_id} onChange={(e) => setItem(idx, 'blend_id', e.target.value)} className={inputCls}>
                    <option value="">Pickâ¦</option>
                    {blends.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-stone-200">Bag</label>
                  <select value={it.bag_size_oz} onChange={(e) => setItem(idx, 'bag_size_oz', e.target.value)} className={inputCls}>
                    <option value="">Pickâ¦</option>
                    {bags.map((b) => <option key={b.id} value={b.size_oz}>{b.size_label?.trim() || `${b.size_oz} oz`}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-stone-200">Grind</label>
                  <select value={it.grind_type} onChange={(e) => setItem(idx, 'grind_type', e.target.value)} className={inputCls}>
                    <option value="whole">Whole Bean</option>
                    <option value="ground">Ground</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-stone-200">Qty</label>
                  <input type="number" min="1" value={it.quantity} onChange={(e) => setItem(idx, 'quantity', e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs text-stone-200">Price/bag</label>
                  <input type="number" step="0.01" value={it.sale_price_per_bag} onChange={(e) => setItem(idx, 'sale_price_per_bag', e.target.value)} className={inputCls} />
                </div>
              </div>
            )}
          </div>
        ))}

        {error && <p className="text-sm text-red-300">{error}</p>}

        <div className="flex flex-wrap gap-2">
          <button
            onClick={add}
            disabled={busy || incomplete || noneIncluded}
            className="rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-800 disabled:opacity-50"
          >
            Add to app
          </button>
          <button
            onClick={dismiss}
            disabled={busy}
            className="rounded-lg bg-stone-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-stone-700 disabled:opacity-50"
          >
            Dismiss
          </button>
          {incomplete && !noneIncluded && (
            <span className="self-center text-xs text-stone-200">Pick a blend and bag size for each item.</span>
          )}
        </div>
      </div>
    </div>
  )
}

function SquareInbox() {
  const { data: inbox, loading, error, refetch } = useFetch('/square/inbox')
  const { data: status, refetch: refetchStatus } = useFetch('/square/status')
  const { data: customers } = useFetch('/customers')
  const { data: blends } = useFetch('/blends')
  const { data: bags } = useFetch('/bags')
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState(null)

  const reload = () => { refetch(); refetchStatus() }

  const syncNow = async () => {
    setSyncing(true); setSyncMsg(null)
    try {
      const { data } = await api.post('/square/sync')
      setSyncMsg(data.added ? `${data.added} new from Square` : 'No new Square orders')
      reload()
    } catch (err) {
      setSyncMsg(err.response?.data?.error || err.message)
    } finally {
      setSyncing(false)
    }
  }

  useEffect(() => { if (syncMsg) { const t = setTimeout(() => setSyncMsg(null), 5000); return () => clearTimeout(t) } }, [syncMsg])

  const sortedBags = useMemo(() => [...(bags || [])].sort((a, b) => a.size_oz - b.size_oz), [bags])

  return (
    <div>
      <PageHeader
        title="Square Inbox"
        description="Paid Square orders waiting for review. Add them to the app or dismiss ones you already entered."
        action={
          status?.configured && (
            <button
              onClick={syncNow}
              disabled={syncing}
              className="shrink-0 rounded-lg bg-amber-800 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-amber-900 disabled:opacity-50"
            >
              {syncing ? 'Checkingâ¦' : 'Check Square now'}
            </button>
          )
        }
      />

      {status && !status.configured && (
        <div className="mb-4 rounded-xl border border-yellow-300 bg-yellow-50 p-4 text-sm text-yellow-900">
          Square isn't connected yet. Add a <code>SQUARE_ACCESS_TOKEN</code> variable to the app's Railway service.
          <p className="mt-1 text-xs text-yellow-700">
            This server process currently sees a token of length {status.token_length}. If you've already added
            the variable in Railway, this being 0 means the running deployment hasn't picked it up yet — check
            that it's on the right environment and redeploy.
          </p>
        </div>
      )}
      {status?.last_error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Last Square check failed: {status.last_error}
        </div>
      )}
      {(syncMsg || status?.last_sync_at) && (
        <p className="mb-4 text-xs text-stone-400">
          {syncMsg || `Last checked ${pacificDate(status.last_sync_at)} Â· checks every 10 minutes`}
        </p>
      )}

      {loading && <p className="text-sm text-stone-400">Loadingâ¦</p>}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Couldn't load the inbox: {error}
        </div>
      )}
      {inbox && inbox.length === 0 && (
        <div className="rounded-xl border border-dashed border-stone-400 bg-stone-500/60 p-8 text-center text-stone-200">
          Nothing waiting â all Square orders are handled.
        </div>
      )}
      {inbox && customers && blends && bags && inbox.map((row) => (
        <InboxCard
          key={row.id}
          row={row}
          customers={customers}
          blends={blends}
          bags={sortedBags}
          onDone={reload}
        />
      ))}
    </div>
  )
}

export default SquareInbox
