import { forwardRef, useId, useState } from 'react'
import { AlertCircle, Eye, EyeOff } from 'lucide-react'

export const Input = forwardRef(function Input(
  {
    label,
    optional = false,
    helperText,
    error,
    type = 'text',
    id: providedId,
    className = '',
    containerClassName = '',
    disabled = false,
    ...rest
  },
  ref,
) {
  const generatedId = useId()
  const id = providedId || generatedId
  const errorId = `${id}-error`
  const helperId = `${id}-helper`
  const [showPassword, setShowPassword] = useState(false)

  const isPassword = type === 'password'
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type

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
        <input
          ref={ref}
          id={id}
          type={inputType}
          disabled={disabled}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={describedBy}
          className={[
            'h-11 w-full rounded-[8px] border px-3 text-base sm:text-sm text-ink placeholder:text-muted transition-colors',
            disabled
              ? 'bg-bg text-muted border-border-strong cursor-not-allowed'
              : 'bg-surface border-border-strong focus:border-primary',
            error ? 'border-danger bg-danger-tint/20' : '',
            isPassword ? 'pr-11' : '',
            className,
          ]
            .filter(Boolean)
            .join(' ')}
          {...rest}
        />

        {isPassword ? (
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            className="absolute right-0.5 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-[6px] text-muted hover:text-ink cursor-pointer"
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Eye className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        ) : null}
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
