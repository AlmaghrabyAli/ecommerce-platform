import { Outlet } from 'react-router-dom'
import { Header } from './Header.jsx'
import { CategoryRow } from './CategoryRow.jsx'
import { Footer } from './Footer.jsx'

export function StoreLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-bg text-ink">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-[8px] focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        Skip to content
      </a>

      <Header />
      <CategoryRow />

      <main id="main-content" className="flex-1">
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6 py-6 sm:py-8">
          <Outlet />
        </div>
      </main>

      <Footer />
    </div>
  )
}
