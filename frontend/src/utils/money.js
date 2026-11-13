// "EGP 1,299" for whole numbers, "EGP 10.50" otherwise
export function formatMoney(value) {
  const n = Number(value) || 0
  const isWhole = Math.round(n * 100) % 100 === 0
  const text = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: isWhole ? 0 : 2,
    maximumFractionDigits: isWhole ? 0 : 2,
  }).format(n)
  return `EGP ${text}`
}

export function formatMoneyNumber(value) {
  const n = Number(value) || 0
  const isWhole = Math.round(n * 100) % 100 === 0
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: isWhole ? 0 : 2,
    maximumFractionDigits: isWhole ? 0 : 2,
  }).format(n)
}
