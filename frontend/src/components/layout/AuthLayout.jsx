import { Link, Outlet } from 'react-router-dom'
import { ShoppingBag } from 'lucide-react'

export function AuthLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-bg text-ink">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-[8px] focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        Skip to content
      </a>

      <header className="h-16 border-b border-border bg-surface">
        <div className="mx-auto flex h-full max-w-[1280px] items-center px-4 sm:px-6">
          <Link to="/" className="inline-flex items-center gap-2 text-xl font-bold text-navy">
            <ShoppingBag className="h-6 w-6 text-primary shrink-0" aria-hidden="true" />
            <span>Bazaaro</span>
          </Link>
        </div>
      </header>

      <main
        id="main-content"
        className="flex flex-1 items-center justify-center px-4 py-8 sm:py-12"
      >
        <div className="w-full max-w-[440px] rounded-[12px] border border-border bg-surface p-6 sm:p-8">
          <Outlet />
        </div>
      </main>

      <footer className="py-4 text-center text-xs text-muted">
        © 2026 Bazaaro
      </footer>
    </div>
  )
}
