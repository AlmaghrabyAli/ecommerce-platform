import { X } from 'lucide-react'

export function Chip({ label, onRemove, removeLabel }) {
  return (
    <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-primary-tint pl-3 pr-1.5 text-xs font-semibold text-primary-dark whitespace-nowrap">
      <span>{label}</span>
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          aria-label={removeLabel || `Remove ${label}`}
          className="inline-flex h-6 w-6 items-center justify-center rounded-full hover:bg-primary/15 cursor-pointer"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      ) : null}
    </span>
  )
}
