import { useEffect, useState } from 'react'
import { Package } from 'lucide-react'

export function ProductImage({
  src,
  alt,
  className = '',
  imgClassName = '',
  iconClassName = 'h-10 w-10',
}) {
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setFailed(false)
  }, [src])

  const trimmedSrc = typeof src === 'string' ? src.trim() : ''
  const showFallback = !trimmedSrc || failed

  return (
    <div
      className={[
        'relative aspect-square w-full overflow-hidden bg-[#F5F5F4]',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {showFallback ? (
        <div className="flex h-full w-full items-center justify-center text-[#A8A29E]">
          <Package className={iconClassName} aria-hidden="true" />
        </div>
      ) : (
        <img
          src={trimmedSrc}
          alt={alt}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className={`h-full w-full object-cover ${imgClassName}`}
        />
      )}
    </div>
  )
}
