import { forwardRef, useId } from 'react'
import { AlertCircle, ChevronDown } from 'lucide-react'

export const Select = forwardRef(function Select(
  {
    label,
    optional = false,
    helperText,
    error,
    id: providedId,
    className = '',
    containerClassName = '',
    disabled = false,
    children,
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

      <div className="relative">
        <select
          ref={ref}
          id={id}
          disabled={disabled}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={describedBy}
          className={[
            'h-11 w-full appearance-none rounded-[8px] border pl-3 pr-9 text-base sm:text-sm text-ink transition-colors',
            disabled
              ? 'bg-bg text-muted border-border-strong cursor-not-allowed'
              : 'bg-surface border-border-strong focus:border-primary cursor-pointer',
            error ? 'border-danger' : '',
            className,
          ]
            .filter(Boolean)
            .join(' ')}
          {...rest}
        >
          {children}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted"
          aria-hidden="true"
        />
      </div>

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
