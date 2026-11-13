import { useEffect, useRef, useState } from 'react'

export function Dropdown({ trigger, items = [], align = 'right' }) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)
  const menuRef = useRef(null)
  const triggerRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined

    function handleOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
      }
    }

    function handleKey(e) {
      if (e.key === 'Escape') {
        setOpen(false)
        triggerRef.current?.focus()
        return
      }
      if (!menuRef.current) return
      const focusable = Array.from(menuRef.current.querySelectorAll('[role="menuitem"]'))
      if (!focusable.length) return
      const index = focusable.indexOf(document.activeElement)
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        focusable[(index + 1) % focusable.length]?.focus()
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        focusable[(index - 1 + focusable.length) % focusable.length]?.focus()
      }
    }

    document.addEventListener('mousedown', handleOutside)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleOutside)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  return (
    <div ref={containerRef} className="relative inline-block">
      {trigger({
        ref: triggerRef,
        open,
        onClick: () => setOpen((prev) => !prev),
        ariaProps: {
          'aria-haspopup': 'menu',
          'aria-expanded': open,
        },
      })}

      {open ? (
        <div
          ref={menuRef}
          role="menu"
          className={[
            'absolute top-full mt-2 z-40 min-w-[200px] rounded-[12px] border border-border bg-surface py-1.5 shadow-[0_12px_32px_rgba(15,23,42,0.16)]',
            align === 'right' ? 'right-0' : 'left-0',
          ].join(' ')}
        >
          {items.map((item, idx) =>
            item.divider ? (
              <div key={`div-${idx}`} className="my-1 border-t border-border" role="separator" />
            ) : (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false)
                  item.onClick?.()
                }}
                className={[
                  'flex h-10 w-full items-center gap-2.5 px-4 text-left text-sm font-medium transition-colors hover:bg-bg cursor-pointer',
                  item.danger ? 'text-danger' : 'text-ink',
                ].join(' ')}
              >
                {item.icon ? <item.icon className="h-4 w-4 shrink-0" aria-hidden="true" /> : null}
                <span>{item.label}</span>
              </button>
            ),
          )}
        </div>
      ) : null}
    </div>
  )
}
