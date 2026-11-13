import { useEffect, useState } from 'react'
import { Minus, Plus } from 'lucide-react'

export function QuantityStepper({
  value,
  min = 1,
  max = 1000,
  disabled = false,
  onChange,
  label = 'Quantity',
}) {
  const effectiveMax = Math.max(min, max)
  const [draft, setDraft] = useState(String(value))

  useEffect(() => {
    setDraft(String(value))
  }, [value])

  function commit(raw) {
    const parsed = Number.parseInt(raw, 10)
    const clamped = Number.isNaN(parsed) ? min : Math.max(min, Math.min(effectiveMax, parsed))
    setDraft(String(clamped))
    if (clamped !== value) {
      onChange(clamped)
    }
  }

  return (
    <div
      role="group"
      aria-label={label}
      className="inline-flex h-11 sm:h-10 items-center overflow-hidden rounded-[8px] border border-border-strong bg-surface"
    >
      <button
        type="button"
        disabled={disabled || value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
        aria-label="Decrease quantity"
        className="flex h-full w-11 sm:w-10 items-center justify-center border-r border-border-strong text-navy hover:bg-bg disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
      >
        <Minus className="h-4 w-4" aria-hidden="true" />
      </button>

      <input
        type="text"
        inputMode="numeric"
        aria-label={label}
        disabled={disabled}
        value={draft}
        onChange={(e) => {
          const next = e.target.value.replace(/[^0-9]/g, '')
          setDraft(next)
        }}
        onBlur={() => commit(draft)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            commit(draft)
          }
        }}
        className="h-full w-12 bg-surface text-center text-base sm:text-sm font-semibold text-ink tabular-nums focus:outline-none disabled:bg-bg disabled:text-muted"
      />

      <button
        type="button"
        disabled={disabled || value >= effectiveMax}
        onClick={() => onChange(Math.min(effectiveMax, value + 1))}
        aria-label="Increase quantity"
        className="flex h-full w-11 sm:w-10 items-center justify-center border-l border-border-strong text-navy hover:bg-bg disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  )
}
