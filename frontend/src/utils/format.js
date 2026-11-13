export function pluralize(count, singular, plural = `${singular}s`) {
  const n = Number(count) || 0
  return `${n} ${n === 1 ? singular : plural}`
}

export function stockState(stockQuantity) {
  const qty = Number(stockQuantity) || 0
  if (qty <= 0) return 'out'
  if (qty <= 5) return 'low'
  return 'in'
}
