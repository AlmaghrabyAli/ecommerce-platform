import { Link, useLocation, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext.jsx'
import { useAddToCart } from '../../hooks/useCart.js'
import { stockState } from '../../utils/format.js'
import { formatMoneyNumber } from '../../utils/money.js'
import { Button } from '../ui/Button.jsx'
import { ProductImage } from './ProductImage.jsx'
import { StockLabel } from './StockLabel.jsx'

export function ProductCard({ product }) {
  const { isAuthenticated } = useAuth()
  const addToCart = useAddToCart()
  const navigate = useNavigate()
  const location = useLocation()

  const state = stockState(product.stockQuantity)
  const isOut = state === 'out'
  const isAddingThis = addToCart.isPending && addToCart.variables?.productId === product.id

  function handleAddToCart() {
    if (!isAuthenticated) {
      toast('Sign in to add items to your cart.', { id: 'auth-required-cart' })
      navigate('/login', {
        state: { from: `${location.pathname}${location.search}` },
      })
      return
    }
    addToCart.mutate({ productId: product.id, quantity: 1 })
  }

  return (
    <article className="group flex flex-col rounded-[12px] border border-border bg-surface p-4 transition-shadow duration-150 hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)]">
      <Link
        to={`/products/${product.slug}`}
        className="relative block overflow-hidden rounded-[8px]"
      >
        <ProductImage
          src={product.imageUrl}
          alt={product.name}
          className="rounded-[8px]"
          imgClassName={[
            'transition-transform duration-150 group-hover:scale-[1.03]',
            isOut ? 'opacity-60' : '',
          ].join(' ')}
        />
        {isOut ? (
          <span className="absolute left-2 top-2 rounded-full border border-border bg-[#F5F5F4] px-2.5 py-0.5 text-xs font-semibold text-[#57534E]">
            Out of stock
          </span>
        ) : null}
      </Link>

      <div className="mt-3 flex flex-1 flex-col">
        {product.categoryName ? (
          <p className="text-xs font-medium text-muted truncate">{product.categoryName}</p>
        ) : null}

        <Link
          to={`/products/${product.slug}`}
          className="mt-1 line-clamp-2 min-h-[48px] text-base font-semibold leading-6 text-navy hover:text-primary-dark transition-colors"
        >
          {product.name}
        </Link>

        <div className="mt-2 flex items-baseline gap-1 tabular-nums">
          <span className="text-xs font-semibold text-muted">EGP</span>
          <span className="text-[18px] font-bold leading-6 text-navy">
            {formatMoneyNumber(product.price)}
          </span>
        </div>

        <div className="mt-1 min-h-[20px]">
          <StockLabel stockQuantity={product.stockQuantity} variant="card" />
        </div>

        <div className="mt-3 pt-1">
          <Button
            type="button"
            variant="primary"
            size="md"
            fullWidth
            disabled={isOut}
            loading={isAddingThis}
            onClick={handleAddToCart}
          >
            {isOut ? 'Out of stock' : 'Add to cart'}
          </Button>
        </div>
      </div>
    </article>
  )
}
