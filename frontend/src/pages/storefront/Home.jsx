import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Banknote,
  BookOpen,
  Cpu,
  Dumbbell,
  Home as HomeIcon,
  Laptop,
  Shirt,
  Tag,
  Truck,
} from 'lucide-react'
import { FREE_THRESHOLD } from '../../config/shipping.js'
import { useCategories } from '../../hooks/useCategories.js'
import { useProducts } from '../../hooks/useProducts.js'
import { formatMoney } from '../../utils/money.js'
import { ProductGrid } from '../../components/product/ProductGrid.jsx'
import { Button } from '../../components/ui/Button.jsx'
import { ErrorState } from '../../components/ui/ErrorState.jsx'
import { Skeleton } from '../../components/ui/Skeleton.jsx'
import { parseApiError } from '../../utils/errors.js'

const CATEGORY_ICONS = {
  electronics: Cpu,
  'computers-accessories': Laptop,
  'home-kitchen': HomeIcon,
  fashion: Shirt,
  'sports-outdoors': Dumbbell,
  'books-stationery': BookOpen,
}

export function Home() {
  const categoriesQuery = useCategories()
  const productsQuery = useProducts({ sortBy: 'newest', sortDir: 'desc', pageSize: 8 })

  return (
    <div className="space-y-12">
      {/* Hero */}
      <section className="overflow-hidden rounded-[16px] border border-primary/20 bg-primary-tint/60 p-6 sm:p-10 lg:p-12">
        <div className="grid grid-cols-1 items-center gap-8 md:grid-cols-12">
          <div className="md:col-span-7 space-y-5">
            <h1 className="text-[28px] leading-[36px] sm:text-[40px] sm:leading-[48px] font-bold text-navy">
              Everything you need, delivered to your door
            </h1>
            <p className="max-w-xl text-base text-ink/80">
              Shop electronics, home essentials, fashion, and everyday gear at clear prices across
              Egypt.
            </p>
            <div>
              <Link to="/shop">
                <Button variant="primary" size="lg">
                  Shop now
                </Button>
              </Link>
            </div>
          </div>

          <div className="md:col-span-5 flex justify-center">
            <svg
              viewBox="0 0 320 220"
              className="h-44 sm:h-52 w-full max-w-[320px]"
              aria-hidden="true"
            >
              <rect x="28" y="24" width="264" height="172" rx="20" fill="#FFFFFF" stroke="#E7E5E4" strokeWidth="2" />
              <circle cx="96" cy="96" r="42" fill="#FFEDD5" />
              <rect x="74" y="74" width="44" height="44" rx="10" fill="#F97316" />
              <path d="M88 94h16M96 86v16" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />
              <rect x="158" y="64" width="106" height="16" rx="8" fill="#0F172A" />
              <rect x="158" y="92" width="84" height="12" rx="6" fill="#CBD5E1" />
              <rect x="158" y="114" width="62" height="12" rx="6" fill="#E7E5E4" />
              <rect x="54" y="156" width="212" height="18" rx="9" fill="#FAF8F5" stroke="#E7E5E4" />
              <rect x="64" y="161" width="96" height="8" rx="4" fill="#F97316" opacity="0.85" />
            </svg>
          </div>
        </div>
      </section>

      {/* Info strip (2 items) */}
      <section aria-label="Store benefits" className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex items-center gap-3.5 rounded-[12px] border border-border bg-surface px-5 py-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-tint text-primary-dark">
            <Banknote className="h-5 w-5" aria-hidden="true" />
          </div>
          <p className="text-sm sm:text-base font-medium text-navy">Cash on delivery available</p>
        </div>

        <div className="flex items-center gap-3.5 rounded-[12px] border border-border bg-surface px-5 py-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-tint text-primary-dark">
            <Truck className="h-5 w-5" aria-hidden="true" />
          </div>
          <p className="text-sm sm:text-base font-medium text-navy">
            Free shipping on orders over {formatMoney(FREE_THRESHOLD)}
          </p>
        </div>
      </section>

      {/* Shop by category */}
      <section aria-labelledby="categories-heading" className="space-y-5">
        <h2 id="categories-heading" className="text-[22px] sm:text-[28px] font-semibold text-navy">
          Shop by category
        </h2>

        {categoriesQuery.isLoading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div key={idx} className="rounded-[12px] border border-border bg-surface p-4 space-y-3">
                <Skeleton className="h-10 w-10 rounded-[10px]" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-full" />
              </div>
            ))}
          </div>
        ) : categoriesQuery.isError ? (
          <ErrorState
            message={parseApiError(categoriesQuery.error).message}
            onRetry={() => categoriesQuery.refetch()}
          />
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {(categoriesQuery.data || []).map((cat) => {
              const Icon = CATEGORY_ICONS[cat.slug] || Tag
              return (
                <Link
                  key={cat.id}
                  to={`/shop?categoryId=${cat.id}`}
                  className="group flex flex-col rounded-[12px] border border-border bg-surface p-4 transition-all duration-150 hover:-translate-y-0.5 hover:border-primary hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)]"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-primary-tint text-primary-dark">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <h3 className="mt-3 text-sm font-semibold text-navy group-hover:text-primary-dark">
                    {cat.name}
                  </h3>
                  {cat.description ? (
                    <p className="mt-1 line-clamp-2 text-xs text-muted">{cat.description}</p>
                  ) : null}
                </Link>
              )
            })}
          </div>
        )}
      </section>

      {/* New arrivals */}
      <section aria-labelledby="new-arrivals-heading" className="space-y-5">
        <div className="flex items-center justify-between gap-4">
          <h2 id="new-arrivals-heading" className="text-[22px] sm:text-[28px] font-semibold text-navy">
            New arrivals
          </h2>
          <Link
            to="/shop"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-dark hover:underline"
          >
            <span>View all</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        {productsQuery.isError ? (
          <ErrorState
            message={parseApiError(productsQuery.error).message}
            onRetry={() => productsQuery.refetch()}
          />
        ) : (
          <ProductGrid
            products={productsQuery.data?.items || []}
            loading={productsQuery.isLoading}
            skeletonCount={8}
            columns="home"
          />
        )}
      </section>
    </div>
  )
}
