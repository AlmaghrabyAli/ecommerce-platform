import { Link } from 'react-router-dom'
import { Package } from 'lucide-react'
import { useOrders } from '../../hooks/useOrders.js'
import { formatDate } from '../../utils/dates.js'
import { parseApiError } from '../../utils/errors.js'
import { pluralize } from '../../utils/format.js'
import { formatMoney } from '../../utils/money.js'
import { formatPaymentMethod } from '../../utils/orderStatus.js'
import { StatusBadge } from '../../components/orders/StatusBadge.jsx'
import { EmptyState } from '../../components/ui/EmptyState.jsx'
import { ErrorState } from '../../components/ui/ErrorState.jsx'
import { Skeleton } from '../../components/ui/Skeleton.jsx'

export function MyOrders() {
  const ordersQuery = useOrders()

  if (ordersQuery.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-44" />
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-[12px]" />
          ))}
        </div>
      </div>
    )
  }

  if (ordersQuery.isError) {
    return (
      <ErrorState
        message={parseApiError(ordersQuery.error).message}
        onRetry={() => ordersQuery.refetch()}
      />
    )
  }

  const orders = ordersQuery.data || []

  return (
    <div className="space-y-6">
      <h1 className="text-[28px] sm:text-[36px] font-bold text-navy">My orders</h1>

      {orders.length === 0 ? (
        <EmptyState
          icon={Package}
          title="You have no orders yet"
          hint="When you place an order, you can follow it here."
          actionLabel="Start shopping"
          actionTo="/shop"
        />
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <article
              key={order.id}
              className="flex flex-col gap-4 rounded-[12px] border border-border bg-surface p-5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-mono text-base font-semibold text-navy">
                    {order.orderNumber}
                  </span>
                  <StatusBadge status={order.status} />
                </div>
                <p className="text-sm text-muted">
                  {formatDate(order.createdAt)} · {pluralize(order.itemCount, 'item')} ·{' '}
                  {formatPaymentMethod(order.paymentMethod)}
                </p>
              </div>

              <div className="flex items-center justify-between gap-4 sm:justify-end">
                <p className="text-lg font-bold text-navy tabular-nums">
                  {formatMoney(order.total)}
                </p>
                <Link
                  to={`/orders/${order.id}`}
                  className="inline-flex min-h-[44px] items-center rounded-[8px] border border-border-strong px-4 text-sm font-semibold text-navy hover:bg-bg transition-colors"
                >
                  View details
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
