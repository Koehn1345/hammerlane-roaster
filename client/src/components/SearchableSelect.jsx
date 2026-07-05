import { useRef, useState } from 'react'

function SearchableSelect({ options, value, onChange, placeholder, inputCls }) {
  const [open,   setOpen]   = useState(false)
  const [search, setSearch] = useState('')
  const blurTimer = useRef(null)

  const selected = options.find((o) => String(o.value) === String(value))

  const filtered = search.trim()
    ? options.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()))
    : options

  const handleFocus = () => {
    clearTimeout(blurTimer.current)
    setSearch('')
    setOpen(true)
  }

  const handleBlur = () => {
    blurTimer.current = setTimeout(() => setOpen(false), 180)
  }

  const handleSelect = (val) => {
    clearTimeout(blurTimer.current)
    onChange(val)
    setOpen(false)
    setSearch('')
  }

  return (
    <div className="relative">
      <input
        type="text"
        autoComplete="off"
        placeholder={placeholder}
        value={open ? search : (selected?.label ?? '')}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onChange={(e) => setSearch(e.target.value)}
        className={inputCls}
      />
      {open && (
        <div className="absolute z-50 mt-1 max-h-52 w-full overflow-y-auto rounded-lg border border-stone-300 bg-white shadow-lg">
          {filtered.length === 0 ? (
            <p className="px-3 py-2 text-sm text-stone-400">No matches</p>
          ) : (
            filtered.map((o) => (
              <button
                key={o.value}
                type="button"
                onMouseDown={() => handleSelect(o.value)}
                className={`w-full px-3 py-2 text-left text-sm font-bold hover:bg-stone-100 ${
                  String(o.value) === String(value) ? 'bg-stone-50 font-semibold' : ''
                }`}
              >
                {o.label}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}

export default SearchableSelect
