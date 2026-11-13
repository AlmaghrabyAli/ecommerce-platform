import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react'

const TONES = {
  error: {
    box: 'bg-danger-tint border-danger/30 text-[#991B1B]',
    icon: AlertCircle,
    iconColor: 'text-danger',
  },
  warning: {
    box: 'bg-warning-tint border-warning/30 text-[#92400E]',
    icon: AlertTriangle,
    iconColor: 'text-warning',
  },
  success: {
    box: 'bg-success-tint border-success/30 text-[#166534]',
    icon: CheckCircle2,
    iconColor: 'text-success',
  },
  info: {
    box: 'bg-info-tint border-[#3B82F6]/30 text-[#1E40AF]',
    icon: Info,
    iconColor: 'text-[#2563EB]',
  },
}

export function Alert({
  variant = 'error',
  title,
  message,
  children,
  action,
  onDismiss,
  className = '',
}) {
  const tone = TONES[variant] || TONES.error
  const Icon = tone.icon
  const role = variant === 'error' || variant === 'warning' ? 'alert' : 'status'

  return (
    <div
      role={role}
      className={[
        'flex items-start gap-3 rounded-[12px] border p-4 text-sm',
        tone.box,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${tone.iconColor}`} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        {title ? <p className="font-semibold">{title}</p> : null}
        {message ? <p className={title ? 'mt-0.5' : ''}>{message}</p> : null}
        {children}
        {action ? <div className="mt-3">{action}</div> : null}
      </div>
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss alert"
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] hover:bg-black/5 cursor-pointer"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  )
}
