import { Link } from 'react-router-dom'
import { FLAT_FEE, FREE_THRESHOLD } from '../../config/shipping.js'
import { formatMoney } from '../../utils/money.js'
import { Button } from '../ui/Button.jsx'

export function OrderSummary({ subtotal, hasUnavailable, onCheckout }) {
  return (
    <div className="rounded-[12px] border border-border bg-surface p-6">
      <h2 className="text-xl font-semibold text-navy">Order summary</h2>

      <dl className="mt-5 space-y-3 border-t border-border pt-4 text-sm">
        <div className="flex items-center justify-between">
          <dt className="text-muted">Subtotal</dt>
          <dd className="text-lg font-bold text-navy tabular-nums">{formatMoney(subtotal)}</dd>
        </div>
      </dl>

      <p className="mt-4 rounded-[8px] bg-bg p-3 text-xs leading-5 text-muted">
        Shipping: {formatMoney(FLAT_FEE)}, free on orders over {formatMoney(FREE_THRESHOLD)}. The
        final total is confirmed when you place the order.
      </p>

      {hasUnavailable ? (
        <p role="alert" className="mt-3 text-xs font-medium text-[#92400E]">
          Update or remove unavailable items before checking out.
        </p>
      ) : null}

      <div className="mt-5 space-y-2.5">
        <Button
          type="button"
          variant="primary"
          size="lg"
          fullWidth
          disabled={hasUnavailable || subtotal <= 0}
          onClick={onCheckout}
        >
          Proceed to checkout
        </Button>

        <Link
          to="/shop"
          className="inline-flex h-11 w-full items-center justify-center rounded-[8px] text-sm font-semibold text-navy hover:bg-bg transition-colors"
        >
          Continue shopping
        </Link>
      </div>
    </div>
  )
}
