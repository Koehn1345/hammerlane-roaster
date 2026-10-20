function PageHeader({ title, description, action }) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div>
        <h1 className="font-serif text-2xl font-semibold text-stone-100">{title}</h1>
        {description && <p className="mt-1 text-sm text-stone-400">{description}</p>}
      </div>
      {/* On desktop, keep the action clear of the fixed refresh button in AppLayout
          (on mobile that button sits in the top bar instead) */}
      {action && <div className="shrink-0 md:mr-7">{action}</div>}
    </div>
  )
}

export default PageHeader
