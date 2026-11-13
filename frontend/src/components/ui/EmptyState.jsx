import { Link } from 'react-router-dom'
import { PackageOpen } from 'lucide-react'
import { Button } from './Button.jsx'

export function EmptyState({
  icon: Icon = PackageOpen,
  title,
  hint,
  actionLabel,
  actionTo,
  onAction,
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[12px] border border-border bg-surface px-6 py-12 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-tint text-primary-dark">
        <Icon className="h-8 w-8" aria-hidden="true" />
      </div>
      <h3 className="mt-4 text-xl font-semibold text-navy">{title}</h3>
      {hint ? <p className="mt-1.5 max-w-md text-sm text-muted">{hint}</p> : null}
      {actionLabel && actionTo ? (
        <Link to={actionTo} className="mt-5">
          <Button variant="primary">{actionLabel}</Button>
        </Link>
      ) : actionLabel && onAction ? (
        <Button variant="primary" onClick={onAction} className="mt-5">
          {actionLabel}
        </Button>
      ) : null}
    </div>
  )
}
