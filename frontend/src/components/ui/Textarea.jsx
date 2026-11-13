import { forwardRef, useId } from 'react'
import { AlertCircle } from 'lucide-react'

export const Textarea = forwardRef(function Textarea(
  {
    label,
    optional = false,
    helperText,
    error,
    id: providedId,
    className = '',
    containerClassName = '',
    disabled = false,
    rows = 4,
    ...rest
  },
  ref,
) {
  const generatedId = useId()
  const id = providedId || generatedId
  const errorId = `${id}-error`
  const helperId = `${id}-helper`
  const describedBy = [error ? errorId : null, helperText && !error ? helperId : null]
    .filter(Boolean)
    .join(' ') || undefined

  return (
    <div className={`w-full ${containerClassName}`}>
      {label ? (
        <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink">
          {label}
          {optional ? <span className="ml-1 font-normal text-muted">(optional)</span> : null}
        </label>
      ) : null}

      <textarea
        ref={ref}
        id={id}
        rows={rows}
        disabled={disabled}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedBy}
        className={[
          'min-h-[96px] w-full rounded-[8px] border p-3 text-base sm:text-sm text-ink placeholder:text-muted transition-colors',
          disabled
            ? 'bg-bg text-muted border-border-strong cursor-not-allowed'
            : 'bg-surface border-border-strong focus:border-primary',
          error ? 'border-danger bg-danger-tint/20' : '',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        {...rest}
      />

      {error ? (
        <p id={errorId} className="mt-1.5 flex items-start gap-1.5 text-sm text-danger">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </p>
      ) : helperText ? (
        <p id={helperId} className="mt-1.5 text-sm text-muted">
          {helperText}
        </p>
      ) : null}
    </div>
  )
})
