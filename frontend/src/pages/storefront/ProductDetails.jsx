import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Banknote, PackageX, Truck } from 'lucide-react'
import { FREE_THRESHOLD } from '../../config/shipping.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { useAddToCart } from '../../hooks/useCart.js'
import { useProductBySlug, useRelatedProducts } from '../../hooks/useProducts.js'
import { parseApiError } from '../../utils/errors.js'
import { stockState } from '../../utils/format.js'
import { formatMoney } from '../../utils/money.js'
import { ProductGrid } from '../../components/product/ProductGrid.jsx'
import { ProductImage } from '../../components/product/ProductImage.jsx'
import { StockLabel } from '../../components/product/StockLabel.jsx'
import { Breadcrumbs } from '../../components/ui/Breadcrumbs.jsx'
import { Button } from '../../components/ui/Button.jsx'
import { ErrorState } from '../../components/ui/ErrorState.jsx'
import { QuantityStepper } from '../../components/ui/QuantityStepper.jsx'
import { Skeleton } from '../../components/ui/Skeleton.jsx'

export function ProductDetails() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { isAuthenticated } = useAuth()
  const addToCart = useAddToCart()
  const [quantity, setQuantity] = useState(1)

  const productQuery = useProductBySlug(slug)
  const product = productQuery.data

  const relatedQuery = useRelatedProducts(product?.categoryId, product?.id)

  useEffect(() => {
    setQuantity(1)
  }, [slug])

  useEffect(() => {
    if (product?.name) {
      document.title = `${product.name} | Bazaaro`
    }
  }, [product?.name])

  if (productQuery.isLoading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-4 w-56" />
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:gap-12">
          <Skeleton className="aspect-square w-full rounded-[12px]" />
          <div className="space-y-4">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-9 w-3/4" />
            <Skeleton className="h-8 w-36" />
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-12 w-full rounded-[8px]" />
          </div>
        </div>
      </div>
    )
  }

  if (productQuery.isError) {
    const parsed = parseApiError(productQuery.error)
    if (parsed.status === 404) {
      return (
        <div className="mx-auto max-w-md py-12 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary-tint text-primary-dark">
            <PackageX className="h-8 w-8" aria-hidden="true" />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-navy">Product not found</h1>
          <p className="mt-2 text-sm text-muted">
            This product may have been removed or is currently unavailable.
          </p>
          <Link to="/shop" className="mt-6 inline-block">
            <Button variant="primary">Back to shop</Button>
          </Link>
        </div>
      )
    }

    return <ErrorState message={parsed.message} onRetry={() => productQuery.refetch()} />
  }

  if (!product) return null

  const state = stockState(product.stockQuantity)
  const isOut = state === 'out'

  function handleAddToCart() {
    if (!isAuthenticated) {
      toast('Sign in to add items to your cart.', { id: 'auth-required-cart' })
      navigate('/login', {
        state: { from: `${location.pathname}${location.search}` },
      })
      return
    }
    addToCart.mutate({ productId: product.id, quantity })
  }

  const related = relatedQuery.data || []

  return (
    <div className="space-y-12 pb-24 md:pb-0">
      <div>
        <Breadcrumbs
          items={[
            { label: 'Home', to: '/' },
            { label: product.categoryName, to: `/shop?categoryId=${product.categoryId}` },
            { label: product.name },
          ]}
        />

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:gap-12">
          {/* Image */}
          <div className="overflow-hidden rounded-[12px] border border-border bg-surface">
            <ProductImage src={product.imageUrl} alt={product.name} iconClassName="h-16 w-16" />
          </div>

          {/* Info */}
          <div className="flex flex-col">
            <Link
              to={`/shop?categoryId=${product.categoryId}`}
              className="text-sm font-semibold text-primary-dark hover:underline w-fit"
            >
              {product.categoryName}
            </Link>

            <h1 className="mt-2 text-[28px] leading-[36px] sm:text-[32px] sm:leading-[40px] font-bold text-navy">
              {product.name}
            </h1>

            <p className="mt-4 text-[32px] leading-[40px] font-bold text-navy tabular-nums">
              {formatMoney(product.price)}
            </p>

            <div className="mt-3">
              <StockLabel stockQuantity={product.stockQuantity} />
            </div>

            <p className="mt-5 text-base leading-6 text-ink">{product.description}</p>

            <div className="mt-6 space-y-4 border-t border-border pt-6">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-ink">Quantity</span>
                <QuantityStepper
                  value={quantity}
                  min={1}
                  max={isOut ? 1 : Math.min(1000, product.stockQuantity)}
                  disabled={isOut}
                  onChange={setQuantity}
                />
              </div>

              <Button
                type="button"
                variant="primary"
                size="lg"
                fullWidth
                disabled={isOut}
                loading={addToCart.isPending}
                onClick={handleAddToCart}
              >
                {isOut ? 'Out of stock' : 'Add to cart'}
              </Button>

              {!isAuthenticated ? (
                <p className="text-sm text-muted">Sign in to add items to your cart.</p>
              ) : null}
            </div>

            <div className="mt-6 space-y-2.5 border-t border-border pt-5 text-sm text-ink">
              <div className="flex items-center gap-2.5">
                <Banknote className="h-5 w-5 text-primary-dark shrink-0" aria-hidden="true" />
                <span>Cash on delivery available</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Truck className="h-5 w-5 text-primary-dark shrink-0" aria-hidden="true" />
                <span>Free shipping on orders over {formatMoney(FREE_THRESHOLD)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Related products */}
      {related.length > 0 ? (
        <section aria-labelledby="related-heading" className="space-y-5 border-t border-border pt-8">
          <h2 id="related-heading" className="text-[22px] sm:text-[28px] font-semibold text-navy">
            More in {product.categoryName}
          </h2>
          <ProductGrid products={related} columns="home" />
        </section>
      ) : null}

      {/* Mobile sticky add to cart bar */}
      <div className="fixed bottom-0 inset-x-0 z-20 flex items-center justify-between gap-4 border-t border-border bg-surface px-4 py-3 shadow-[0_-4px_16px_rgba(15,23,42,0.08)] md:hidden">
        <div>
          <p className="text-xs text-muted">Price</p>
          <p className="text-lg font-bold text-navy tabular-nums">{formatMoney(product.price)}</p>
        </div>
        <Button
          type="button"
          variant="primary"
          size="md"
          className="flex-1 max-w-[220px]"
          disabled={isOut}
          loading={addToCart.isPending}
          onClick={handleAddToCart}
        >
          {isOut ? 'Out of stock' : 'Add to cart'}
        </Button>
      </div>
    </div>
  )
}
