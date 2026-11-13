import { formatMoney } from '../../utils/money.js'

export function OrderItemsTable({ items = [] }) {
  return (
    <div className="overflow-hidden rounded-[12px] border border-border bg-surface">
      {/* Desktop/Tablet table */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="h-11 border-b border-border bg-bg text-xs font-semibold uppercase tracking-wide text-muted">
              <th className="px-4">Product</th>
              <th className="px-4 text-right">Unit price</th>
              <th className="px-4 text-right">Qty</th>
              <th className="px-4 text-right">Line total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {items.map((item, idx) => (
              <tr key={`${item.productId}-${idx}`} className="h-14 hover:bg-bg/60">
                <td className="px-4 font-medium text-navy">{item.productName}</td>
                <td className="px-4 text-right text-ink tabular-nums">
                  {formatMoney(item.unitPrice)}
                </td>
                <td className="px-4 text-right text-ink tabular-nums">{item.quantity}</td>
                <td className="px-4 text-right font-semibold text-navy tabular-nums">
                  {formatMoney(item.lineTotal)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile stacked cards */}
      <div className="divide-y divide-border sm:hidden">
        {items.map((item, idx) => (
          <div key={`${item.productId}-${idx}`} className="p-4 space-y-1.5">
            <p className="font-semibold text-navy">{item.productName}</p>
            <div className="flex items-center justify-between text-sm text-muted tabular-nums">
              <span>
                {formatMoney(item.unitPrice)} × {item.quantity}
              </span>
              <span className="font-semibold text-navy">{formatMoney(item.lineTotal)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
