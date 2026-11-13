import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useCancelOrder, useOrderById } from '../../hooks/useOrders.js'
import { formatDateTime } from '../../utils/dates.js'
import { parseApiError } from '../../utils/errors.js'
import { formatMoney } from '../../utils/money.js'
import { canCancel, formatPaymentMethod } from '../../utils/orderStatus.js'
import { OrderItemsTable } from '../../components/orders/OrderItemsTable.jsx'
import { PaymentBadge } from '../../components/orders/PaymentBadge.jsx'
import { ShippingDetails } from '../../components/orders/ShippingDetails.jsx'
import { StatusBadge } from '../../components/orders/StatusBadge.jsx'
import { StatusStepper } from '../../components/orders/StatusStepper.jsx'
import { Button } from '../../components/ui/Button.jsx'
import { ErrorState } from '../../components/ui/ErrorState.jsx'
import { Modal } from '../../components/ui/Modal.jsx'
import { Skeleton } from '../../components/ui/Skeleton.jsx'

export function OrderDetails() {
  const { id } = useParams()
  const orderQuery = useOrderById(id)
  const cancelOrder = useCancelOrder()
  const [cancelModalOpen, setCancelModalOpen] = useState(false)
  const cancellingRef = useRef(false)

  const order = orderQuery.data

  useEffect(() => {
    if (order?.orderNumber) {
      document.title = `Order ${order.orderNumber} | Bazaaro`
    }
  }, [order?.orderNumber])

  if (orderQuery.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-28 w-full rounded-[12px]" />
        <Skeleton className="h-56 w-full rounded-[12px]" />
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

  if (!order) return null

  const allowCancel = canCancel(order.status)

  async function handleConfirmCancel() {
    if (cancellingRef.current || cancelOrder.isPending) return
    cancellingRef.current = true
    try {
      await cancelOrder.mutateAsync(order.id)
      setCancelModalOpen(false)
    } catch {
      // Error toast and query refresh are handled by useCancelOrder.
      setCancelModalOpen(false)
    } finally {
      cancellingRef.current = false
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/orders"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-dark hover:underline"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          <span>Back to my orders</span>
        </Link>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
          <div>
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

          {allowCancel ? (
            <div className="flex flex-col items-start sm:items-end gap-1">
              <Button
                type="button"
                variant="destructive"
                onClick={() => setCancelModalOpen(true)}
              >
                Cancel order
              </Button>
              <p className="text-xs text-muted">Cancelling returns the items to stock.</p>
            </div>
          ) : null}
        </div>
      </div>

      <StatusStepper status={order.status} />

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        <div className="lg:col-span-8 space-y-6">
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-navy">Items</h2>
            <OrderItemsTable items={order.items} />
          </section>
        </div>

        <div className="lg:col-span-4 space-y-4">
          <ShippingDetails order={order} />

          <div className="rounded-[12px] border border-border bg-surface p-5 space-y-3">
            <h2 className="text-base font-semibold text-navy">Payment</h2>
            <div className="flex items-center justify-between text-sm">
              <span className="text-ink">{formatPaymentMethod(order.paymentMethod)}</span>
              <PaymentBadge paymentStatus={order.paymentStatus} />
            </div>
          </div>

          <div className="rounded-[12px] border border-border bg-surface p-5">
            <h2 className="text-base font-semibold text-navy">Summary</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-muted">Subtotal</dt>
                <dd className="text-ink tabular-nums">{formatMoney(order.subtotal)}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted">Shipping fee</dt>
                <dd className="text-ink tabular-nums">
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
      </div>

      <Modal
        open={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        title="Cancel this order?"
        preventClose={cancelOrder.isPending}
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              disabled={cancelOrder.isPending}
              onClick={() => setCancelModalOpen(false)}
            >
              Keep order
            </Button>
            <Button
              type="button"
              variant="destructive-solid"
              loading={cancelOrder.isPending}
              onClick={handleConfirmCancel}
            >
              Cancel order
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink">
          Are you sure you want to cancel order{' '}
          <span className="font-mono font-semibold">{order.orderNumber}</span>? Cancelling returns
          the items to stock.
        </p>
      </Modal>
    </div>
  )
}
