import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  ChevronDown,
  LogOut,
  Package,
  Search,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  User,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import { useCart } from '../../hooks/useCart.js'
import { Dropdown } from '../ui/Dropdown.jsx'

export function Header() {
  const { user, isAuthenticated, isAdmin, logout } = useAuth()
  const { data: cart } = useCart()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '')

  useEffect(() => {
    setSearchTerm(searchParams.get('search') || '')
  }, [searchParams])

  function handleSearchSubmit(e) {
    e.preventDefault()
    const trimmed = searchTerm.trim()
    if (trimmed) {
      navigate(`/shop?search=${encodeURIComponent(trimmed)}`)
    } else {
      navigate('/shop')
    }
  }

  const itemCount = isAuthenticated ? cart?.itemCount || 0 : 0
  const badgeText = itemCount > 9 ? '9+' : String(itemCount)
  const firstName = user?.fullName ? user.fullName.trim().split(/\s+/)[0] : 'Account'

  const menuItems = [
    {
      label: 'My orders',
      icon: Package,
      onClick: () => navigate('/orders'),
    },
    ...(isAdmin
      ? [
          {
            label: 'Admin panel',
            icon: ShieldCheck,
            onClick: () => navigate('/admin'),
          },
        ]
      : []),
    { divider: true },
    {
      label: 'Sign out',
      icon: LogOut,
      danger: true,
      onClick: logout,
    },
  ]

  return (
    <header className="sticky top-0 z-30 bg-navy text-white border-b border-navy-soft">
      <div className="mx-auto max-w-[1280px] px-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3 py-3 sm:py-0 sm:h-[72px]">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xl font-bold tracking-normal text-white rounded-[8px] py-1"
          >
            <ShoppingBag className="h-6 w-6 text-primary shrink-0" aria-hidden="true" />
            <span>Bazaaro</span>
          </Link>

          <div className="flex items-center gap-2 sm:order-3">
            {isAuthenticated ? (
              <Dropdown
                align="right"
                items={menuItems}
                trigger={({ ref, onClick, ariaProps }) => (
                  <button
                    ref={ref}
                    type="button"
                    onClick={onClick}
                    aria-label="Account menu"
                    className="inline-flex h-11 items-center gap-2 rounded-[8px] px-2.5 text-sm font-medium text-white hover:bg-navy-soft transition-colors cursor-pointer"
                    {...ariaProps}
                  >
                    <User className="h-5 w-5 shrink-0" aria-hidden="true" />
                    <span className="hidden sm:inline">{firstName}</span>
                    <ChevronDown className="hidden sm:inline h-4 w-4 text-white/70" aria-hidden="true" />
                  </button>
                )}
              />
            ) : (
              <Link
                to="/login"
                aria-label="Sign in"
                className="inline-flex h-11 items-center gap-2 rounded-[8px] px-2.5 text-sm font-medium text-white hover:bg-navy-soft transition-colors"
              >
                <User className="h-5 w-5 shrink-0" aria-hidden="true" />
                <span className="hidden sm:inline">Sign in</span>
              </Link>
            )}

            <Link
              to={isAuthenticated ? '/cart' : '/login'}
              state={isAuthenticated ? undefined : { from: '/cart' }}
              aria-label={itemCount > 0 ? `Cart (${itemCount} items)` : 'Cart'}
              className="relative inline-flex h-11 min-w-[44px] items-center justify-center rounded-[8px] px-2.5 text-white hover:bg-navy-soft transition-colors"
            >
              <ShoppingCart className="h-5 w-5 shrink-0" aria-hidden="true" />
              {itemCount > 0 ? (
                <span className="absolute right-1 top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1 text-[11px] font-bold leading-none text-white tabular-nums">
                  {badgeText}
                </span>
              ) : null}
            </Link>
          </div>

          <form
            onSubmit={handleSearchSubmit}
            role="search"
            className="w-full sm:w-auto sm:flex-1 sm:max-w-[640px] sm:order-2 sm:mx-4"
          >
            <div className="flex h-11 w-full overflow-hidden rounded-[8px] bg-surface">
              <label htmlFor="header-search-input" className="sr-only">
                Search products
              </label>
              <input
                id="header-search-input"
                type="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search products"
                className="h-full min-w-0 flex-1 bg-transparent px-3.5 text-base sm:text-sm text-ink placeholder:text-muted focus:outline-none"
              />
              <button
                type="submit"
                aria-label="Search"
                className="inline-flex h-full w-12 shrink-0 items-center justify-center bg-primary text-white hover:bg-primary-hover transition-colors cursor-pointer"
              >
                <Search className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          </form>
        </div>
      </div>
    </header>
  )
}
