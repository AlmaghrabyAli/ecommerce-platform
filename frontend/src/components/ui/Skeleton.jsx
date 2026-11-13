export function Skeleton({ className = '' }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-[8px] bg-[#E7E5E4]/80 ${className}`}
    />
  )
}

export function ProductCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-[12px] border border-border bg-surface p-4">
      <Skeleton className="aspect-square w-full rounded-[8px]" />
      <Skeleton className="mt-4 h-3 w-24" />
      <Skeleton className="mt-2 h-5 w-full" />
      <Skeleton className="mt-1.5 h-5 w-2/3" />
      <Skeleton className="mt-4 h-6 w-28" />
      <Skeleton className="mt-4 h-10 w-full rounded-[8px]" />
    </div>
  )
}

export function TableSkeleton({ rows = 6, cols = 6 }) {
  return (
    <div className="overflow-hidden rounded-[12px] border border-border bg-surface">
      <div className="border-b border-border bg-bg px-4 py-3">
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="divide-y divide-border">
        {Array.from({ length: rows }).map((_, rowIdx) => (
          <div key={rowIdx} className="flex items-center gap-4 px-4 py-4">
            {Array.from({ length: cols }).map((__, colIdx) => (
              <Skeleton
                key={colIdx}
                className={`h-4 ${colIdx === 0 ? 'w-32' : 'flex-1'}`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
