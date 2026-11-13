import { Link, useParams } from 'react-router-dom'
import { CheckCircle2 } from 'lucide-react'
import { useOrderById } from '../../hooks/useOrders.js'
import { parseApiError } from '../../utils/errors.js'
import { formatMoney } from '../../utils/money.js'
import { formatPaymentMethod } from '../../utils/orderStatus.js'
import { OrderItemsTable } from '../../components/orders/OrderItemsTable.jsx'
import { PaymentBadge } from '../../components/orders/PaymentBadge.jsx'
import { ShippingDetails } from '../../components/orders/ShippingDetails.jsx'
import { StatusBadge } from '../../components/orders/StatusBadge.jsx'
import { Button } from '../../components/ui/Button.jsx'
import { ErrorState } from '../../components/ui/ErrorState.jsx'
import { Skeleton } from '../../components/ui/Skeleton.jsx'

export function OrderConfirmation() {
  const { id } = useParams()
  const orderQuery = useOrderById(id)

  if (orderQuery.isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <Skeleton className="mx-auto h-36 w-full rounded-[12px]" />
        <Skeleton className="h-72 w-full rounded-[12px]" />
      </div>
    )
  }

  if (orderQuery.isError) {
    const parsed = parseApiError(orderQuery.error)
    if (parsed.status === 404) {
      return (
        <ErrorState
          title="We couldn't find this order"
          message="This order may not exist or belongs to another account."
          actionLabel="Back to my orders"
          actionTo="/orders"
        />
      )
    }
    return <ErrorState message={parsed.message} onRetry={() => orderQuery.refetch()} />
  }

  const order = orderQuery.data
  if (!order) return null

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="rounded-[12px] border border-border bg-surface p-6 sm:p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success-tint text-success">
          <CheckCircle2 className="h-8 w-8" aria-hidden="true" />
        </div>
        <h1 className="mt-4 text-[24px] sm:text-[32px] font-bold text-navy">
          Thank you! Your order has been placed.
        </h1>
        <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-border bg-bg px-4 py-1.5 text-sm">
          <span className="text-muted">Order number:</span>
          <span className="font-mono font-semibold text-navy">{order.orderNumber}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-[12px] border border-border bg-surface p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted">Order status</span>
            <StatusBadge status={order.status} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted">Payment</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-ink">
                {formatPaymentMethod(order.paymentMethod)}
              </span>
              <PaymentBadge paymentStatus={order.paymentStatus} />
            </div>
          </div>
        </div>

        <ShippingDetails order={order} />
      </div>

      <OrderItemsTable items={order.items} />

      <div className="rounded-[12px] border border-border bg-surface p-5">
        <dl className="space-y-2.5 text-sm">
          <div className="flex items-center justify-between">
            <dt className="text-muted">Subtotal</dt>
            <dd className="font-medium text-ink tabular-nums">{formatMoney(order.subtotal)}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-muted">Shipping fee</dt>
            <dd className="font-medium text-ink tabular-nums">
              {order.shippingFee === 0 ? 'Free' : formatMoney(order.shippingFee)}
            </dd>
          </div>
          <div className="flex items-center justify-between border-t border-border pt-2.5 text-base font-bold text-navy">
            <dt>Total</dt>
            <dd className="tabular-nums">{formatMoney(order.total)}</dd>
          </div>
        </dl>
      </div>

      <div className="flex flex-col sm:flex-row justify-center gap-3">
        <Link to="/orders">
          <Button variant="primary" size="lg" fullWidth>
            View my orders
          </Button>
        </Link>
        <Link to="/shop">
          <Button variant="secondary" size="lg" fullWidth>
            Continue shopping
          </Button>
        </Link>
      </div>
    </div>
  )
}
