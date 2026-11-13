import { useEffect, useId, useRef } from 'react'
import { X } from 'lucide-react'

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  preventClose = false,
}) {
  const titleId = useId()
  const panelRef = useRef(null)
  const previousFocusRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined

    previousFocusRef.current = document.activeElement
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const focusTimer = setTimeout(() => {
      const panel = panelRef.current
      if (!panel) return
      const focusables = panel.querySelectorAll(FOCUSABLE_SELECTOR)
      if (focusables.length > 0) {
        focusables[0].focus()
      } else {
        panel.focus()
      }
    }, 0)

    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        if (!preventClose) {
          e.preventDefault()
          onClose()
        }
        return
      }

      if (e.key === 'Tab') {
        const panel = panelRef.current
        if (!panel) return
        const focusables = Array.from(panel.querySelectorAll(FOCUSABLE_SELECTOR))
        if (focusables.length === 0) {
          e.preventDefault()
          return
        }
        const first = focusables[0]
        const last = focusables[focusables.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      clearTimeout(focusTimer)
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = originalOverflow
      if (previousFocusRef.current && typeof previousFocusRef.current.focus === 'function') {
        previousFocusRef.current.focus()
      }
    }
  }, [open, onClose, preventClose])

  if (!open) return null

  const maxWidth = size === 'lg' ? 'sm:max-w-[560px]' : 'sm:max-w-[480px]'

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
      <button
        type="button"
        tabIndex={-1}
        aria-hidden="true"
        onClick={() => {
          if (!preventClose) {
            onClose()
          }
        }}
        className="fixed inset-0 bg-[#0F172A]/50"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={[
          'relative z-10 w-full bg-surface border border-border shadow-[0_12px_32px_rgba(15,23,42,0.16)]',
          'rounded-t-[16px] sm:rounded-[16px] max-h-[90vh] flex flex-col outline-none',
          maxWidth,
        ].join(' ')}
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h3 id={titleId} className="text-xl font-semibold text-navy">
            {title}
          </h3>
          <button
            type="button"
            disabled={preventClose}
            onClick={onClose}
            aria-label="Close modal"
            className="inline-flex h-10 w-10 items-center justify-center rounded-[8px] text-muted hover:bg-bg hover:text-ink disabled:opacity-50 cursor-pointer"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-5 text-ink">{children}</div>

        {footer ? (
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 border-t border-border px-6 py-4">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  )
}
