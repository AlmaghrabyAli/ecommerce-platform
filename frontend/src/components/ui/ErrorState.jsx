import { Link } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'
import { Button } from './Button.jsx'

export function ErrorState({
  title = 'Something went wrong',
  message = 'Please try again.',
  onRetry,
  actionLabel,
  actionTo,
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center rounded-[12px] border border-border bg-surface px-6 py-12 text-center"
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-danger-tint text-danger">
        <AlertTriangle className="h-8 w-8" aria-hidden="true" />
      </div>
      <h3 className="mt-4 text-xl font-semibold text-navy">{title}</h3>
      {message ? <p className="mt-1.5 max-w-md text-sm text-muted">{message}</p> : null}
      {onRetry ? (
        <Button variant="primary" onClick={onRetry} className="mt-5">
          Try again
        </Button>
      ) : actionLabel && actionTo ? (
        <Link to={actionTo} className="mt-5">
          <Button variant="primary">{actionLabel}</Button>
        </Link>
      ) : null}
    </div>
  )
}
