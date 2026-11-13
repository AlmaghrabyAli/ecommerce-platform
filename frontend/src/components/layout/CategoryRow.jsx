import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { useCategories } from '../../hooks/useCategories.js'

export function CategoryRow() {
  const { data: categories = [] } = useCategories()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const isShop = location.pathname === '/shop'
  const activeCategoryId = isShop ? searchParams.get('categoryId') : null

  return (
    <nav aria-label="Product categories" className="bg-navy-soft text-white border-b border-white/10">
      <div className="mx-auto max-w-[1280px] px-4 sm:px-6">
        <div className="flex h-11 items-center gap-1 overflow-x-auto whitespace-nowrap">
          <Link
            to="/shop"
            className={[
              'inline-flex h-8 items-center rounded-[6px] px-3 text-sm font-medium transition-colors shrink-0',
              isShop && !activeCategoryId
                ? 'bg-primary text-white'
                : 'text-[#CBD5E1] hover:bg-white/10 hover:text-white',
            ].join(' ')}
          >
            All products
          </Link>

          {categories.map((cat) => {
            const isActive = isShop && String(cat.id) === activeCategoryId
            return (
              <Link
                key={cat.id}
                to={`/shop?categoryId=${cat.id}`}
                className={[
                  'inline-flex h-8 items-center rounded-[6px] px-3 text-sm font-medium transition-colors shrink-0',
                  isActive
                    ? 'bg-primary text-white'
                    : 'text-[#CBD5E1] hover:bg-white/10 hover:text-white',
                ].join(' ')}
              >
                {cat.name}
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
