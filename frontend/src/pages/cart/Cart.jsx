import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShoppingCart } from 'lucide-react'
import {
  useCart,
  useClearCart,
  useRemoveCartItem,
  useUpdateCartItem,
} from '../../hooks/useCart.js'
import { parseApiError } from '../../utils/errors.js'
import { pluralize } from '../../utils/format.js'
import { formatMoney } from '../../utils/money.js'
import { CartRow } from '../../components/cart/CartRow.jsx'
import { OrderSummary } from '../../components/cart/OrderSummary.jsx'
import { Button } from '../../components/ui/Button.jsx'
import { EmptyState } from '../../components/ui/EmptyState.jsx'
import { ErrorState } from '../../components/ui/ErrorState.jsx'
import { Modal } from '../../components/ui/Modal.jsx'
import { Skeleton } from '../../components/ui/Skeleton.jsx'

export function Cart() {
  const navigate = useNavigate()
  const cartQuery = useCart()
  const updateItem = useUpdateCartItem()
  const removeItem = useRemoveCartItem()
  const clearCart = useClearCart()

  const [clearModalOpen, setClearModalOpen] = useState(false)
  const [busyProductId, setBusyProductId] = useState(null)

  const cart = cartQuery.data
  const items = cart?.items || []
  const hasUnavailable = items.some((item) => item.isAvailable === false)

  async function handleUpdateQuantity(productId, quantity) {
    if (busyProductId !== null) return
    setBusyProductId(productId)
    try {
      await updateItem.mutateAsync({ productId, quantity })
    } catch {
      // Handled by useUpdateCartItem onError toast
    } finally {
      setBusyProductId(null)
    }
  }

  async function handleRemove(productId) {
    if (busyProductId !== null) return
    setBusyProductId(productId)
    try {
      await removeItem.mutateAsync(productId)
    } catch {
      // Handled by useRemoveCartItem onError toast
    } finally {
      setBusyProductId(null)
    }
  }

  async function handleConfirmClear() {
    if (clearCart.isPending) return
    try {
      await clearCart.mutateAsync()
      setClearModalOpen(false)
    } catch {
      setClearModalOpen(false)
    }
  }

  if (cartQuery.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-56" />
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="lg:col-span-8 space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-[12px]" />
            ))}
          </div>
          <div className="lg:col-span-4">
            <Skeleton className="h-64 w-full rounded-[12px]" />
          </div>
        </div>
      </div>
    )
  }

  if (cartQuery.isError) {
    return (
      <ErrorState
        message={parseApiError(cartQuery.error).message}
        onRetry={() => cartQuery.refetch()}
      />
    )
  }

  if (items.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-[28px] sm:text-[36px] font-bold text-navy">Shopping cart</h1>
        <EmptyState
          icon={ShoppingCart}
          title="Your cart is empty"
          hint="Add a few products and they will show up here."
          actionLabel="Start shopping"
          actionTo="/shop"
        />
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-24 lg:pb-0">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <h1 className="text-[28px] sm:text-[36px] font-bold text-navy">Shopping cart</h1>
          <span className="text-sm font-medium text-muted tabular-nums">
            ({pluralize(cart.itemCount, 'item')})
          </span>
        </div>

        <button
          type="button"
          onClick={() => setClearModalOpen(true)}
          className="min-h-[44px] px-2 text-sm font-semibold text-danger hover:underline cursor-pointer"
        >
          Clear cart
        </button>
      </div>

      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
        <div className="lg:col-span-8 space-y-4">
          {items.map((item) => (
            <CartRow
              key={item.productId}
              item={item}
              busy={busyProductId === item.productId}
              onUpdateQuantity={handleUpdateQuantity}
              onRemove={handleRemove}
            />
          ))}
        </div>

        <div className="lg:col-span-4 lg:sticky lg:top-[132px]">
          <OrderSummary
            subtotal={cart.subtotal}
            hasUnavailable={hasUnavailable}
            onCheckout={() => navigate('/checkout')}
          />
        </div>
      </div>

      {/* Mobile sticky checkout bar */}
      <div className="fixed bottom-0 inset-x-0 z-20 flex items-center justify-between gap-4 border-t border-border bg-surface px-4 py-3 shadow-[0_-4px_16px_rgba(15,23,42,0.08)] lg:hidden">
        <div>
          <p className="text-xs text-muted">Subtotal</p>
          <p className="text-lg font-bold text-navy tabular-nums">{formatMoney(cart.subtotal)}</p>
        </div>
        <Button
          type="button"
          variant="primary"
          size="md"
          className="flex-1 max-w-[220px]"
          disabled={hasUnavailable || cart.subtotal <= 0}
          onClick={() => navigate('/checkout')}
        >
          Proceed to checkout
        </Button>
      </div>

      <Modal
        open={clearModalOpen}
        onClose={() => setClearModalOpen(false)}
        title="Clear your cart?"
        preventClose={clearCart.isPending}
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              disabled={clearCart.isPending}
              onClick={() => setClearModalOpen(false)}
            >
              Keep items
            </Button>
            <Button
              type="button"
              variant="destructive-solid"
              loading={clearCart.isPending}
              onClick={handleConfirmClear}
            >
              Clear cart
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink">
          All items will be removed from your shopping cart. You can add them back from the store
          anytime.
        </p>
      </Modal>
    </div>
  )
}
