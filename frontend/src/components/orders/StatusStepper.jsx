import { Check, XCircle } from 'lucide-react'
import { STEPPER_STATUSES } from '../../utils/orderStatus.js'

export function StatusStepper({ status }) {
  if (status === 'Cancelled') {
    return (
      <div
        role="status"
        className="flex items-center gap-3 rounded-[12px] border border-danger/30 bg-danger-tint p-4 text-[#B91C1C]"
      >
        <XCircle className="h-5 w-5 shrink-0 text-danger" aria-hidden="true" />
        <div>
          <p className="text-sm font-semibold">Order cancelled</p>
          <p className="text-xs text-[#991B1B]">
            This order was cancelled and items were returned to stock.
          </p>
        </div>
      </div>
    )
  }

  const currentIdx = STEPPER_STATUSES.indexOf(status)

  return (
    <div className="rounded-[12px] border border-border bg-surface p-5">
      <ol className="grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-2">
        {STEPPER_STATUSES.map((step, idx) => {
          const isDone = currentIdx > idx || (step === 'Delivered' && status === 'Delivered')
          const isCurrent = currentIdx === idx && status !== 'Delivered'

          return (
            <li key={step} className="flex items-center gap-3 sm:flex-col sm:text-center">
              <div
                className={[
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors',
                  isDone
                    ? 'border-primary bg-primary text-white'
                    : isCurrent
                      ? 'border-primary bg-primary-tint text-primary-dark'
                      : 'border-border-strong bg-surface text-muted',
                ].join(' ')}
              >
                {isDone ? <Check className="h-4 w-4" aria-hidden="true" /> : idx + 1}
              </div>
              <span
                className={[
                  'text-sm font-medium',
                  isDone || isCurrent ? 'text-navy font-semibold' : 'text-muted',
                ].join(' ')}
              >
                {step}
              </span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
