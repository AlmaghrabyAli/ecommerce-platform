import { Fragment } from 'react'
import { Link } from 'react-router-dom'

export function Breadcrumbs({ items = [] }) {
  if (!items.length) return null

  return (
    <nav aria-label="Breadcrumb" className="mb-4">
      <ol className="flex flex-wrap items-center gap-1.5 text-xs font-medium text-muted">
        {items.map((item, idx) => {
          const isLast = idx === items.length - 1
          return (
            <Fragment key={`${item.label}-${idx}`}>
              {idx > 0 ? <li aria-hidden="true">/</li> : null}
              <li className={isLast ? 'text-ink truncate max-w-[260px]' : ''}>
                {isLast || !item.to ? (
                  <span aria-current={isLast ? 'page' : undefined}>{item.label}</span>
                ) : (
                  <Link to={item.to} className="hover:text-primary-dark transition-colors">
                    {item.label}
                  </Link>
                )}
              </li>
            </Fragment>
          )
        })}
      </ol>
    </nav>
  )
}
