import { useId } from 'react'

export function Toggle({ checked, onChange, label, disabled = false, id: providedId }) {
  const generatedId = useId()
  const id = providedId || generatedId

  return (
    <div className="inline-flex items-center gap-3 min-h-[44px]">
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={Boolean(checked)}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={[
          'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer',
          checked ? 'bg-primary' : 'bg-border-strong',
          disabled ? 'opacity-50 cursor-not-allowed' : '',
        ].join(' ')}
      >
        <span
          className={[
            'inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform',
            checked ? 'translate-x-[22px]' : 'translate-x-[2px]',
          ].join(' ')}
        />
      </button>
      {label ? (
        <label htmlFor={id} className="text-sm font-medium text-ink cursor-pointer select-none">
          {label}
        </label>
      ) : null}
    </div>
  )
}
