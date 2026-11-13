import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  FolderTree,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  ShoppingBag,
  ShoppingCart,
  Store,
  X,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import { ADMIN_BADGE_META } from '../../utils/orderStatus.js'
import { Badge } from '../ui/Badge.jsx'

const NAV_ITEMS = [
  { label: 'Dashboard', to: '/admin', icon: LayoutDashboard, end: true },
  { label: 'Products', to: '/admin/products', icon: Package },
  { label: 'Categories', to: '/admin/categories', icon: FolderTree },
  { label: 'Orders', to: '/admin/orders', icon: ShoppingCart },
]

function getAdminPageTitle(pathname) {
  if (pathname === '/admin') return 'Dashboard'
  if (pathname === '/admin/products/new') return 'Add product'
  if (/^\/admin\/products\/\d+\/edit$/.test(pathname)) return 'Edit product'
  if (pathname.startsWith('/admin/products')) return 'Products'
  if (pathname.startsWith('/admin/categories')) return 'Categories'
  if (/^\/admin\/orders\/\d+$/.test(pathname)) return 'Order details'
  if (pathname.startsWith('/admin/orders')) return 'Orders'
  return 'Admin'
}

export function AdminLayout() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const [drawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => {
    setDrawerOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!drawerOpen) return undefined
    function handleKey(e) {
      if (e.key === 'Escape') setDrawerOpen(false)
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [drawerOpen])

  const pageTitle = getAdminPageTitle(location.pathname)

  const sidebarContent = (
    <div className="flex h-full flex-col bg-navy text-white">
      <div className="flex h-16 items-center justify-between border-b border-white/10 px-5">
        <Link to="/admin" className="inline-flex items-center gap-2 text-xl font-bold text-white">
          <ShoppingBag className="h-6 w-6 text-primary shrink-0" aria-hidden="true" />
          <span>Bazaaro</span>
        </Link>
        <button
          type="button"
          onClick={() => setDrawerOpen(false)}
          aria-label="Close navigation menu"
          className="inline-flex h-10 w-10 items-center justify-center rounded-[8px] text-[#CBD5E1] hover:bg-navy-soft hover:text-white lg:hidden cursor-pointer"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      <nav aria-label="Admin navigation" className="flex-1 space-y-1 px-3 py-4">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              [
                'flex h-11 items-center gap-3 rounded-[8px] px-3 text-sm font-medium transition-colors border-l-[3px]',
                isActive
                  ? 'bg-navy-soft text-white border-primary'
                  : 'border-transparent text-[#CBD5E1] hover:bg-navy-soft/60 hover:text-white',
              ].join(' ')
            }
          >
            <item.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-white/10 p-3">
        <Link
          to="/"
          className="flex h-11 items-center gap-3 rounded-[8px] px-3 text-sm font-medium text-[#CBD5E1] hover:bg-navy-soft hover:text-white transition-colors"
        >
          <Store className="h-5 w-5 shrink-0" aria-hidden="true" />
          <span>View store</span>
        </Link>
      </div>
    </div>
  )

  return (
    <div className="flex min-h-screen bg-bg text-ink">
      <a
        href="#admin-main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-[8px] focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        Skip to content
      </a>

      {/* Desktop sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:block lg:w-[260px] lg:z-30">
        {sidebarContent}
      </aside>

      {/* Mobile/tablet drawer */}
      {drawerOpen ? (
        <div
          className="fixed inset-0 z-50 flex lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Admin navigation"
        >
          <button
            type="button"
            tabIndex={-1}
            aria-hidden="true"
            className="fixed inset-0 bg-[#0F172A]/50 cursor-pointer"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="relative z-10 w-[260px] max-w-[80vw] h-full shadow-[0_12px_32px_rgba(15,23,42,0.16)]">
            {sidebarContent}
          </aside>
        </div>
      ) : null}

      <div className="flex flex-1 flex-col lg:pl-[260px] min-w-0">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b border-border bg-surface px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open navigation menu"
              className="inline-flex h-11 w-11 items-center justify-center rounded-[8px] text-navy hover:bg-bg lg:hidden cursor-pointer"
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </button>
            <p className="truncate text-lg sm:text-xl font-semibold text-navy">{pageTitle}</p>
          </div>

          <div className="flex items-center gap-3 sm:gap-4 shrink-0">
            <Link
              to="/"
              className="hidden sm:inline-flex items-center gap-1.5 text-sm font-medium text-primary-dark hover:underline"
            >
              <Store className="h-4 w-4" aria-hidden="true" />
              <span>View store</span>
            </Link>

            <div className="hidden md:flex items-center gap-2">
              <span className="text-sm font-medium text-ink">{user?.fullName}</span>
              <Badge
                label={ADMIN_BADGE_META.label}
                bg={ADMIN_BADGE_META.bg}
                text={ADMIN_BADGE_META.text}
              />
            </div>

            <button
              type="button"
              onClick={logout}
              className="inline-flex h-10 items-center gap-1.5 rounded-[8px] border border-border-strong bg-surface px-3 text-sm font-semibold text-navy hover:bg-bg cursor-pointer"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              <span>Sign out</span>
            </button>
          </div>
        </header>

        <main id="admin-main-content" className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
