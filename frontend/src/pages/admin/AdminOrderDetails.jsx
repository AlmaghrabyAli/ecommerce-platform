import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useAdminOrderById, useUpdateAdminOrderStatus } from '../../hooks/useAdmin.js'
import { formatDateTime } from '../../utils/dates.js'
import { parseApiError } from '../../utils/errors.js'
import { formatMoney } from '../../utils/money.js'
import { formatPaymentMethod } from '../../utils/orderStatus.js'
import { StatusActions } from '../../components/admin/StatusActions.jsx'
import { OrderItemsTable } from '../../components/orders/OrderItemsTable.jsx'
import { PaymentBadge } from '../../components/orders/PaymentBadge.jsx'
import { ShippingDetails } from '../../components/orders/ShippingDetails.jsx'
import { StatusBadge } from '../../components/orders/StatusBadge.jsx'
import { Breadcrumbs } from '../../components/ui/Breadcrumbs.jsx'
import { ErrorState } from '../../components/ui/ErrorState.jsx'
import { Skeleton } from '../../components/ui/Skeleton.jsx'

export function AdminOrderDetails() {
  const { id } = useParams()
  const orderQuery = useAdminOrderById(id)
  const updateStatus = useUpdateAdminOrderStatus()

  const adminOrder = orderQuery.data
  const order = adminOrder?.order

  useEffect(() => {
    if (order?.orderNumber) {
      document.title = `Order ${order.orderNumber} | Bazaaro Admin`
    }
  }, [order?.orderNumber])

  if (orderQuery.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <Skeleton className="lg:col-span-8 h-72 rounded-[12px]" />
          <Skeleton className="lg:col-span-4 h-72 rounded-[12px]" />
        </div>
      </div>
    )
  }

  if (orderQuery.isError) {
    const parsed = parseApiError(orderQuery.error)
    if (parsed.status === 404) {
      return (
        <ErrorState
          title="Order not found"
          message="We couldn't find this order."
          actionLabel="Back to orders"
          actionTo="/admin/orders"
        />
      )
    }
    return <ErrorState message={parsed.message} onRetry={() => orderQuery.refetch()} />
  }

  if (!adminOrder || !order) return null

  return (
    <div className="space-y-6">
      <div>
        <Breadcrumbs
          items={[
            { label: 'Orders', to: '/admin/orders' },
            { label: order.orderNumber },
          ]}
        />
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-mono text-2xl sm:text-3xl font-bold text-navy">
            {order.orderNumber}
          </h1>
          <StatusBadge status={order.status} />
        </div>
        <p className="mt-1 text-sm text-muted">
          Placed on {formatDateTime(order.createdAt)}
        </p>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        <div className="lg:col-span-8 space-y-6">
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-navy">Items</h2>
            <OrderItemsTable items={order.items} />
          </section>

          <div className="rounded-[12px] border border-border bg-surface p-5">
            <dl className="space-y-2.5 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-muted">Subtotal</dt>
                <dd className="font-medium text-ink tabular-nums">
                  {formatMoney(order.subtotal)}
                </dd>
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
        </div>

        <div className="lg:col-span-4 space-y-4">
          <div className="rounded-[12px] border border-border bg-surface p-5">
            <h2 className="text-base font-semibold text-navy">Customer</h2>
            <p className="mt-2 font-medium text-ink">{adminOrder.customerName}</p>
            <p className="text-sm text-muted">{adminOrder.customerEmail}</p>
          </div>

          <ShippingDetails order={order} />

          <div className="rounded-[12px] border border-border bg-surface p-5 space-y-3">
            <h2 className="text-base font-semibold text-navy">Payment</h2>
            <div className="flex items-center justify-between text-sm">
              <span className="text-ink">{formatPaymentMethod(order.paymentMethod)}</span>
              <PaymentBadge paymentStatus={order.paymentStatus} />
            </div>
            <p className="text-xs text-muted">
              Cash on delivery orders become Paid when delivered
            </p>
          </div>

          <StatusActions
            status={order.status}
            isPending={updateStatus.isPending}
            onUpdateStatus={(nextStatus) =>
              updateStatus.mutateAsync({ id: order.id, status: nextStatus })
            }
          />
        </div>
      </div>
    </div>
  )
}
