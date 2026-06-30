function DataTable({ columns, rows, emptyMessage = 'Nothing here yet.', renderActions, onRowClick }) {
  if (!rows || rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-stone-300 bg-white/60 p-10 text-center text-stone-400">
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
      <table className="w-full text-left text-sm">
        <thead className="bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
          <tr>
            {columns.map((col) => (
              <th key={col.key} className="px-4 py-3 font-medium">
                {col.label}
              </th>
            ))}
            {renderActions && <th className="px-4 py-3 font-medium" />}
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {rows.map((row, i) => (
            <tr
              key={row.id ?? i}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={`hover:bg-amber-50/50 ${onRowClick ? 'cursor-pointer' : ''}`}
            >
              {columns.map((col) => (
                <td key={col.key} className="px-4 py-3 text-stone-700">
                  {col.format ? col.format(row[col.key], row) : row[col.key]}
                </td>
              ))}
              {renderActions && (
                <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                  {renderActions(row)}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default DataTable
