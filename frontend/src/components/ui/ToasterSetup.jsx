import { useEffect, useState } from 'react'
import toast, { Toaster } from 'react-hot-toast'
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react'

export function ToasterSetup() {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 640 : false,
  )

  useEffect(() => {
    const media = window.matchMedia('(max-width: 639px)')
    const onChange = (e) => setIsMobile(e.matches)
    setIsMobile(media.matches)
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  return (
    <Toaster
      position={isMobile ? 'top-center' : 'bottom-right'}
      gutter={12}
      toastOptions={{
        duration: 4000,
      }}
    >
      {(t) => {
        const isError = t.type === 'error'
        const Icon = isError ? AlertCircle : t.type === 'success' ? CheckCircle2 : Info
        const iconColor = isError
          ? 'text-danger'
          : t.type === 'success'
            ? 'text-success'
            : 'text-[#2563EB]'

        return (
          <div
            role={isError ? 'alert' : 'status'}
            aria-live={isError ? 'assertive' : 'polite'}
            className={[
              'flex max-w-[380px] items-center gap-3 rounded-[12px] border border-border bg-surface px-4 py-3 text-sm text-ink shadow-[0_12px_32px_rgba(15,23,42,0.16)] transition-all',
              t.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2',
            ].join(' ')}
          >
            <Icon className={`h-5 w-5 shrink-0 ${iconColor}`} aria-hidden="true" />
            <span className="flex-1 font-medium">
              {typeof t.message === 'function' ? t.message(t) : t.message}
            </span>
            <button
              type="button"
              onClick={() => toast.dismiss(t.id)}
              aria-label="Dismiss notification"
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[6px] text-muted hover:bg-bg hover:text-ink cursor-pointer"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        )
      }}
    </Toaster>
  )
}
