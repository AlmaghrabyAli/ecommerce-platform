import { Loader2 } from 'lucide-react'

export function Spinner({ className = 'h-4 w-4', label }) {
  return (
    <span className="inline-flex items-center gap-2">
      <Loader2 className={`animate-spin ${className}`} aria-hidden="true" />
      {label ? <span>{label}</span> : null}
    </span>
  )
}
