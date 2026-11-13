export function Badge({ label, bg, text, dot, className = '', children }) {
  return (
    <span
      style={bg || text ? { backgroundColor: bg, color: text } : undefined}
      className={[
        'inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-xs leading-4 font-semibold whitespace-nowrap',
        !bg && !text ? 'bg-border text-ink' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {dot ? (
        <span
          className="h-1.5 w-1.5 rounded-full shrink-0"
          style={{ backgroundColor: dot }}
          aria-hidden="true"
        />
      ) : null}
      <span>{children ?? label}</span>
    </span>
  )
}
