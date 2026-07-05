import { NavLink } from 'react-router-dom'

const navItems = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/orders', label: 'Orders' },
  { to: '/roasting', label: 'Roasting' },
  { to: '/history',  label: 'History' },
  { to: '/billing', label: 'Billing' },
  { to: '/customers', label: 'Customers' },
  { to: '/blends', label: 'Blends' },
  { to: '/green-beans', label: 'Green Bean Inventory' },
  { to: '/bags', label: 'Bag Inventory' },
]

function NavItems({ onNavClick }) {
  return (
    <nav className="flex flex-1 flex-col gap-1 px-3">
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={onNavClick}
          className={({ isActive }) =>
            `rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              isActive
                ? 'bg-amber-800 text-amber-50 shadow-sm'
                : 'text-stone-600 hover:bg-stone-200/70 hover:text-stone-900'
            }`
          }
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  )
}

const SidebarContent = ({ onNavClick }) => (
  <>
    <div className="flex items-center gap-2 px-6 py-6">
      <span className="text-2xl">☕</span>
      <span className="font-serif text-lg font-semibold tracking-tight text-stone-800">
        Roastic
      </span>
    </div>
    <NavItems onNavClick={onNavClick} />
    <div className="px-6 py-4 text-xs text-stone-400">
      Roastic &copy; {new Date().getFullYear()}
    </div>
  </>
)

function Sidebar({ mobileOpen, onClose }) {
  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex h-screen w-64 shrink-0 flex-col border-r border-stone-200 bg-stone-50">
        <SidebarContent />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-stone-900/40"
            onClick={onClose}
          />
          <aside className="absolute left-0 top-0 flex h-full w-72 flex-col bg-stone-50 shadow-xl">
            <div className="flex items-center justify-between px-6 py-5">
              <div className="flex items-center gap-2">
                <span className="text-2xl">☕</span>
                <span className="font-serif text-lg font-semibold tracking-tight text-stone-800">
                  Roastic
                </span>
              </div>
              <button
                onClick={onClose}
                className="text-stone-400 hover:text-stone-600"
                aria-label="Close menu"
              >
                ✕
              </button>
            </div>
            <NavItems onNavClick={onClose} />
            <div className="px-6 py-4 text-xs text-stone-400">
              Roastic &copy; {new Date().getFullYear()}
            </div>
          </aside>
        </div>
      )}
    </>
  )
}

export default Sidebar
