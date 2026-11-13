import { Link, useSearchParams } from 'react-router-dom'
import { ShoppingCart } from 'lucide-react'
import { useAdminOrders } from '../../hooks/useAdmin.js'
import { formatDate } from '../../utils/dates.js'
import { parseApiError } from '../../utils/errors.js'
import { formatMoney } from '../../utils/money.js'
import { ORDER_STATUSES, formatPaymentMethod } from '../../utils/orderStatus.js'
import { PaymentBadge } from '../../components/orders/PaymentBadge.jsx'
import { StatusBadge } from '../../components/orders/StatusBadge.jsx'
import { EmptyState } from '../../components/ui/EmptyState.jsx'
import { ErrorState } from '../../components/ui/ErrorState.jsx'
import { Pagination } from '../../components/ui/Pagination.jsx'
import { TableSkeleton } from '../../components/ui/Skeleton.jsx'

const TABS = [
  { label: 'All', value: '' },
  ...ORDER_STATUSES.map((s) => ({ label: s, value: s })),
]

export function AdminOrders() {
  const [searchParams, setSearchParams] = useSearchParams()
  const status = searchParams.get('status') || ''
  const page = Math.max(1, Number.parseInt(searchParams.get('page') || '1', 10) || 1)

  const ordersQuery = useAdminOrders({
    status: status || undefined,
    page,
    pageSize: 20,
  })

  function handleSelectStatus(nextStatus) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (nextStatus) next.set('status', nextStatus)
      else next.delete('status')
      next.set('page', '1')
      return next
    })
  }

  function handlePageChange(nextPage) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set('page', String(nextPage))
      return next
    })
  }

  const data = ordersQuery.data
  const items = data?.items || []

  return (
    <div className="space-y-6">
      <h1 className="text-[28px] font-bold text-navy">Orders</h1>

      {/* Status tabs */}
      <div
        role="tablist"
        aria-label="Filter orders by status"
        className="flex items-center gap-1 overflow-x-auto border-b border-border pb-px"
      >
        {TABS.map((tab) => {
          const active = status === tab.value
          return (
            <button
              key={tab.label}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => handleSelectStatus(tab.value)}
              className={[
                'min-h-[44px] px-4 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors cursor-pointer',
                active
                  ? 'border-primary text-primary-dark'
                  : 'border-transparent text-muted hover:text-navy',
              ].join(' ')}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {ordersQuery.isLoading ? (
        <TableSkeleton rows={6} cols={7} />
      ) : ordersQuery.isError ? (
        <ErrorState
          message={parseApiError(ordersQuery.error).message}
          onRetry={() => ordersQuery.refetch()}
        />
      ) : items.length === 0 ? (
        <EmptyState
          icon={ShoppingCart}
          title="No orders found"
          hint={
            status
              ? `No ${status} orders`
              : 'Orders will appear here when customers place them.'
          }
        />
      ) : (
        <>
          <div className="hidden md:block overflow-hidden rounded-[12px] border border-border bg-surface">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="h-11 border-b border-border bg-bg text-xs font-semibold uppercase tracking-wide text-muted">
                    <th className="px-4">Order number</th>
                    <th className="px-4">Customer</th>
                    <th className="px-4">Date</th>
                    <th className="px-4 text-right">Items</th>
                    <th className="px-4">Payment</th>
                    <th className="px-4 text-right">Total</th>
                    <th className="px-4">Status</th>
                    <th className="px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {items.map((order) => (
                    <tr key={order.id} className="h-16 hover:bg-bg/60">
                      <td className="px-4 font-mono font-semibold text-navy whitespace-nowrap">
                        {order.orderNumber}
                      </td>
                      <td className="px-4">
                        <p className="font-medium text-navy">{order.customerName}</p>
                        <p className="text-xs text-muted">{order.customerEmail}</p>
                      </td>
                      <td className="px-4 text-ink whitespace-nowrap">
                        {formatDate(order.createdAt)}
                      </td>
                      <td className="px-4 text-right text-ink tabular-nums">{order.itemCount}</td>
                      <td className="px-4 whitespace-nowrap">
                        <div className="inline-flex items-center gap-2">
                          <span className="text-ink">
                            {formatPaymentMethod(order.paymentMethod)}
                          </span>
                          <PaymentBadge paymentStatus={order.paymentStatus} />
                        </div>
                      </td>
                      <td className="px-4 text-right font-semibold text-navy tabular-nums whitespace-nowrap">
                        {formatMoney(order.total)}
                      </td>
                      <td className="px-4 whitespace-nowrap">
                        <StatusBadge status={order.status} />
                      </td>
                      <td className="px-4 text-right whitespace-nowrap">
                        <Link
                          to={`/admin/orders/${order.id}`}
                          className="text-sm font-semibold text-primary-dark hover:underline"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-3 md:hidden">
            {items.map((order) => (
              <article
                key={order.id}
                className="rounded-[12px] border border-border bg-surface p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-mono font-semibold text-navy">{order.orderNumber}</p>
                    <p className="text-xs text-muted">{formatDate(order.createdAt)}</p>
                  </div>
                  <StatusBadge status={order.status} />
                </div>

                <div className="text-sm">
                  <p className="font-medium text-navy">{order.customerName}</p>
                  <p className="text-xs text-muted">{order.customerEmail}</p>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-muted">{formatPaymentMethod(order.paymentMethod)}</span>
                    <PaymentBadge paymentStatus={order.paymentStatus} />
                  </div>
                  <p className="font-bold text-navy tabular-nums">{formatMoney(order.total)}</p>
                </div>

                <Link
                  to={`/admin/orders/${order.id}`}
                  className="inline-flex h-10 w-full items-center justify-center rounded-[8px] border border-navy text-sm font-semibold text-navy hover:bg-bg"
                >
                  View
                </Link>
              </article>
            ))}
          </div>

          <Pagination
            page={data?.page || page}
            totalPages={data?.totalPages || 0}
            onPageChange={handlePageChange}
          />
        </>
      )}
    </div>
  )
}
