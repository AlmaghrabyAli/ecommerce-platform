import { stockState } from '../../utils/format.js'

export function StockLabel({ stockQuantity, variant = 'inline' }) {
  const state = stockState(stockQuantity)

  if (state === 'out') {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-danger">
        <span className="h-2 w-2 rounded-full bg-danger shrink-0" aria-hidden="true" />
        <span>Out of stock</span>
      </span>
    )
  }

  if (state === 'low') {
    return (
      <span
        className={[
          'inline-flex items-center gap-1.5 font-medium text-warning',
          variant === 'card' ? 'text-xs' : 'text-sm',
        ].join(' ')}
      >
        <span className="h-2 w-2 rounded-full bg-warning shrink-0" aria-hidden="true" />
        <span>Only {stockQuantity} left</span>
      </span>
    )
  }

  if (variant === 'card') return null

  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-success">
      <span className="h-2 w-2 rounded-full bg-success shrink-0" aria-hidden="true" />
      <span>In stock</span>
    </span>
  )
}
