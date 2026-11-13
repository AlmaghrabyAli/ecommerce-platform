import { ProductCardSkeleton } from '../ui/Skeleton.jsx'
import { ProductCard } from './ProductCard.jsx'

export function ProductGrid({
  products = [],
  loading = false,
  skeletonCount = 8,
  columns = 'home',
}) {
  const gridClass =
    columns === 'shop'
      ? 'grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-5'
      : 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5'

  if (loading) {
    return (
      <div className={gridClass}>
        {Array.from({ length: skeletonCount }).map((_, idx) => (
          <ProductCardSkeleton key={idx} />
        ))}
      </div>
    )
  }

  return (
    <div className={gridClass}>
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  )
}
