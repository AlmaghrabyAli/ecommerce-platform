import { ChevronLeft, ChevronRight } from 'lucide-react'

function getPageNumbers(currentPage, totalPages) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1)
  }

  const pages = new Set([1, totalPages, currentPage, currentPage - 1, currentPage + 1])
  const sorted = Array.from(pages)
    .filter((p) => p >= 1 && p <= totalPages)
    .sort((a, b) => a - b)

  const result = []
  for (let i = 0; i < sorted.length; i += 1) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) {
      result.push('ellipsis')
    }
    result.push(sorted[i])
  }
  return result
}

export function Pagination({ page, totalPages, onPageChange }) {
  if (!totalPages || totalPages <= 1) return null

  const pageNumbers = getPageNumbers(page, totalPages)

  function handleSelect(nextPage) {
    if (nextPage < 1 || nextPage > totalPages || nextPage === page) return
    onPageChange(nextPage)
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  return (
    <nav
      aria-label="Pagination"
      className="flex flex-wrap items-center justify-between gap-3 pt-4"
    >
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => handleSelect(page - 1)}
          className="inline-flex h-11 sm:h-10 items-center gap-1 rounded-[8px] border border-border-strong bg-surface px-3 text-sm font-semibold text-navy hover:bg-bg disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          <span>Previous</span>
        </button>

        <div className="hidden sm:flex items-center gap-1.5">
          {pageNumbers.map((item, idx) =>
            item === 'ellipsis' ? (
              <span key={`e-${idx}`} className="px-2 text-sm text-muted">
                ...
              </span>
            ) : (
              <button
                key={item}
                type="button"
                onClick={() => handleSelect(item)}
                aria-current={item === page ? 'page' : undefined}
                className={[
                  'inline-flex h-10 min-w-[40px] items-center justify-center rounded-[8px] px-2.5 text-sm font-semibold transition-colors cursor-pointer',
                  item === page
                    ? 'bg-primary text-white'
                    : 'border border-border-strong bg-surface text-navy hover:bg-bg',
                ].join(' ')}
              >
                {item}
              </button>
            ),
          )}
        </div>

        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => handleSelect(page + 1)}
          className="inline-flex h-11 sm:h-10 items-center gap-1 rounded-[8px] border border-border-strong bg-surface px-3 text-sm font-semibold text-navy hover:bg-bg disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          <span>Next</span>
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <p className="text-sm text-muted tabular-nums">
        Page {page} of {totalPages}
      </p>
    </nav>
  )
}
