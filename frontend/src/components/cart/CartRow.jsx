import { Link } from 'react-router-dom'
import { AlertTriangle, Trash2 } from 'lucide-react'
import { formatMoney } from '../../utils/money.js'
import { ProductImage } from '../product/ProductImage.jsx'
import { QuantityStepper } from '../ui/QuantityStepper.jsx'
import { Spinner } from '../ui/Spinner.jsx'

export function CartRow({ item, onUpdateQuantity, onRemove, busy = false }) {
  const isUnavailable = item.isAvailable === false
  const warningText =
    item.stockQuantity > 0 && item.stockQuantity < item.quantity
      ? `Only ${item.stockQuantity} left in stock. Please update the quantity.`
      : 'This product is no longer available.'

  return (
    <div
      className={[
        'rounded-[12px] border p-4 transition-colors',
        isUnavailable ? 'border-warning/50 bg-warning-tint/35' : 'border-border bg-surface',
      ].join(' ')}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4 min-w-0 flex-1">
          <Link to={`/products/${item.slug}`} className="h-20 w-20 shrink-0 overflow-hidden rounded-[8px] border border-border">
            <ProductImage src={item.imageUrl} alt={item.name} iconClassName="h-7 w-7" />
          </Link>

          <div className="min-w-0 flex-1">
            <Link
              to={`/products/${item.slug}`}
              className="text-base font-semibold text-navy hover:text-primary-dark transition-colors line-clamp-2"
            >
              {item.name}
            </Link>
            <p className="mt-1 text-sm text-muted tabular-nums">
              {formatMoney(item.unitPrice)} each
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 sm:justify-end">
          <div className="flex items-center gap-2">
            <QuantityStepper
              label={`Quantity for ${item.name}`}
              value={item.quantity}
              min={1}
              max={item.stockQuantity > 0 ? Math.min(1000, item.stockQuantity) : 1}
              disabled={busy || item.stockQuantity <= 0}
              onChange={(nextQty) => onUpdateQuantity(item.productId, nextQty)}
            />
            {busy ? <Spinner className="h-4 w-4 text-primary" /> : null}
          </div>

          <div className="flex items-center gap-4">
            <p className="min-w-[96px] text-right text-base font-bold text-navy tabular-nums">
              {formatMoney(item.lineTotal)}
            </p>
            <button
              type="button"
              disabled={busy}
              onClick={() => onRemove(item.productId)}
              aria-label={`Remove ${item.name}`}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-[8px] px-2.5 text-sm font-medium text-danger hover:bg-danger-tint disabled:opacity-50 cursor-pointer"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              <span>Remove</span>
            </button>
          </div>
        </div>
      </div>

      {isUnavailable ? (
        <p role="alert" className="mt-3 flex items-center gap-2 text-sm font-medium text-[#92400E]">
          <AlertTriangle className="h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
          <span>{warningText}</span>
        </p>
      ) : null}
    </div>
  )
}
