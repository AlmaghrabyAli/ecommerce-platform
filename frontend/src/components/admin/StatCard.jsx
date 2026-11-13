export function StatCard({ title, value, caption, icon: Icon }) {
  return (
    <div className="rounded-[12px] border border-border bg-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted">{title}</p>
          <p className="mt-2 text-2xl sm:text-3xl font-bold text-navy tabular-nums">{value}</p>
          {caption ? <p className="mt-1 text-xs text-muted">{caption}</p> : null}
        </div>
        {Icon ? (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] bg-primary-tint text-primary-dark">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </div>
        ) : null}
      </div>
    </div>
  )
}
