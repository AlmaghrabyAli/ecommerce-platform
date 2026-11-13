import { forwardRef } from 'react'
import { Loader2 } from 'lucide-react'

const VARIANTS = {
  primary:
    'bg-primary text-white hover:bg-primary-hover active:bg-primary-dark border border-transparent',
  secondary:
    'bg-surface text-navy border-[1.5px] border-navy hover:bg-bg active:bg-border/40',
  ghost: 'bg-transparent text-navy hover:bg-bg border border-transparent',
  destructive:
    'bg-surface text-danger border-[1.5px] border-danger hover:bg-danger-tint',
  'destructive-solid':
    'bg-danger text-white hover:bg-[#B91C1C] border border-transparent',
}

const SIZES = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-10 min-h-[40px] px-4 text-[15px]',
  lg: 'h-12 px-6 text-base',
  icon: 'h-10 w-10 min-h-[44px] min-w-[44px] p-0',
}

export const Button = forwardRef(function Button(
  {
    type = 'button',
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled = false,
    fullWidth = false,
    className = '',
    children,
    ...rest
  },
  ref,
) {
  const isDisabled = disabled || loading

  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      className={[
        'inline-flex items-center justify-center gap-2 rounded-[8px] font-semibold transition-colors cursor-pointer select-none whitespace-nowrap',
        VARIANTS[variant] || VARIANTS.primary,
        SIZES[size] || SIZES.md,
        fullWidth ? 'w-full' : '',
        isDisabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden="true" /> : null}
      <span className="inline-flex items-center justify-center gap-2">{children}</span>
    </button>
  )
})
