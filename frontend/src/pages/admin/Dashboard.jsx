import { Link } from 'react-router-dom'
import { AlertTriangle, Banknote, Clock, ShoppingCart } from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useAdminStats } from '../../hooks/useAdmin.js'
import { parseApiError } from '../../utils/errors.js'
import { formatMoney } from '../../utils/money.js'
import { ORDER_STATUSES, STOCK_BADGE_META } from '../../utils/orderStatus.js'
import { StatCard } from '../../components/admin/StatCard.jsx'
import { Badge } from '../../components/ui/Badge.jsx'
import { ErrorState } from '../../components/ui/ErrorState.jsx'
import { Skeleton } from '../../components/ui/Skeleton.jsx'

const STATUS_CHART_COLORS = {
  Pending: '#D97706',
  Confirmed: '#2563EB',
  Shipped: '#4F46E5',
  Delivered: '#16A34A',
  Cancelled: '#DC2626',
}

export function Dashboard() {
  const statsQuery = useAdminStats()

  if (statsQuery.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-40" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-[12px]" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <Skeleton className="lg:col-span-7 h-80 rounded-[12px]" />
          <Skeleton className="lg:col-span-5 h-80 rounded-[12px]" />
        </div>
      </div>
    )
  }

  if (statsQuery.isError) {
    return (
      <ErrorState
        message={parseApiError(statsQuery.error).message}
        onRetry={() => statsQuery.refetch()}
      />
    )
  }

  const stats = statsQuery.data
  if (!stats) return null

  const chartData = ORDER_STATUSES.map((status) => ({
    status,
    count: stats.ordersByStatus?.[status] ?? 0,
    color: STATUS_CHART_COLORS[status],
  }))

  const topProducts = stats.topProducts || []
  const lowStockProducts = stats.lowStockProducts || []

  return (
    <div className="space-y-6">
      <h1 className="text-[28px] font-bold text-navy">Dashboard</h1>

      {/* 4 stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total orders"
          value={stats.totalOrders}
          icon={ShoppingCart}
        />
        <StatCard
          title="Revenue"
          value={formatMoney(stats.revenue)}
          caption="Excludes cancelled orders"
          icon={Banknote}
        />
        <StatCard
          title="Pending orders"
          value={stats.ordersByStatus?.Pending ?? 0}
          icon={Clock}
        />
        <StatCard
          title="Low-stock products"
          value={lowStockProducts.length}
          caption="5 or fewer in stock"
          icon={AlertTriangle}
        />
      </div>

      {/* Chart + Low stock */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <section className="lg:col-span-7 rounded-[12px] border border-border bg-surface p-5">
          <h2 className="text-lg font-semibold text-navy">Orders by status</h2>
          <div className="mt-4 h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E7E5E4" vertical={false} />
                <XAxis
                  dataKey="status"
                  tick={{ fill: '#78716C', fontSize: 12 }}
                  axisLine={{ stroke: '#E7E5E4' }}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: '#78716C', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: '#FAF8F5' }}
                  contentStyle={{
                    borderRadius: 8,
                    border: '1px solid #E7E5E4',
                    fontSize: 13,
                  }}
                />
                <Bar dataKey="count" name="Orders" radius={[6, 6, 0, 0]} maxBarSize={52}>
                  {chartData.map((entry) => (
                    <Cell key={entry.status} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="lg:col-span-5 rounded-[12px] border border-border bg-surface p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-navy">Low stock</h2>
            <Link
              to="/admin/products"
              className="text-sm font-medium text-primary-dark hover:underline"
            >
              View products
            </Link>
          </div>

          {lowStockProducts.length === 0 ? (
            <p className="mt-8 text-center text-sm text-muted">All products are well stocked</p>
          ) : (
            <ul className="mt-4 divide-y divide-border">
              {lowStockProducts.map((item) => {
                const isOut = item.stockQuantity === 0
                return (
                  <li key={item.id} className="py-3 first:pt-0 last:pb-0">
                    <Link
                      to={`/admin/products?search=${encodeURIComponent(item.name)}`}
                      className="flex items-center justify-between gap-3 rounded-[8px] px-1 py-1 hover:bg-bg transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-navy">{item.name}</p>
                        <p className="text-xs text-muted tabular-nums">
                          Stock: {item.stockQuantity}
                        </p>
                      </div>
                      {isOut ? (
                        <Badge
                          label={STOCK_BADGE_META.out.label}
                          bg={STOCK_BADGE_META.out.bg}
                          text={STOCK_BADGE_META.out.text}
                        />
                      ) : (
                        <Badge
                          label={STOCK_BADGE_META.low.label}
                          bg={STOCK_BADGE_META.low.bg}
                          text={STOCK_BADGE_META.low.text}
                        />
                      )}
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>

      {/* Top products */}
      <section className="rounded-[12px] border border-border bg-surface p-5">
        <h2 className="text-lg font-semibold text-navy">Top products</h2>

        {topProducts.length === 0 ? (
          <p className="mt-6 text-center text-sm text-muted">No sales yet</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="h-11 border-b border-border bg-bg text-xs font-semibold uppercase tracking-wide text-muted">
                  <th className="px-4">Product</th>
                  <th className="px-4 text-right">Quantity sold</th>
                  <th className="px-4 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {topProducts.map((prod) => (
                  <tr key={prod.productId} className="h-14 hover:bg-bg/60">
                    <td className="px-4 font-medium text-navy">{prod.productName}</td>
                    <td className="px-4 text-right text-ink tabular-nums">
                      {prod.quantitySold}
                    </td>
                    <td className="px-4 text-right font-semibold text-navy tabular-nums">
                      {formatMoney(prod.revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
