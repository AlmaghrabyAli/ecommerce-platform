import { Link } from 'react-router-dom'
import { ShoppingBag } from 'lucide-react'
import { useCategories } from '../../hooks/useCategories.js'

export function Footer() {
  const { data: categories = [] } = useCategories()

  return (
    <footer className="bg-navy text-white border-t border-navy-soft">
      <div className="mx-auto max-w-[1280px] px-4 sm:px-6 py-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <Link to="/" className="inline-flex items-center gap-2 text-lg font-bold text-white">
            <ShoppingBag className="h-5 w-5 text-primary shrink-0" aria-hidden="true" />
            <span>Bazaaro</span>
          </Link>

          <nav aria-label="Footer categories" className="flex flex-wrap gap-x-6 gap-y-2">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                to={`/shop?categoryId=${cat.id}`}
                className="text-sm text-[#CBD5E1] hover:text-white transition-colors"
              >
                {cat.name}
              </Link>
            ))}
          </nav>
        </div>

        <div className="mt-6 border-t border-white/10 pt-5">
          <p className="text-xs text-[#94A3B8]">© 2026 Bazaaro</p>
        </div>
      </div>
    </footer>
  )
}
