import { formatMoney, formatMoneyNumber } from './money.js'

describe('money helpers', () => {
  it('formats whole numbers without decimals', () => {
    expect(formatMoney(1299)).toBe('EGP 1,299')
    expect(formatMoney(0)).toBe('EGP 0')
    expect(formatMoney(99)).toBe('EGP 99')
    expect(formatMoney(1299.0)).toBe('EGP 1,299')
  })

  it('formats fractional amounts with exactly 2 decimal places', () => {
    expect(formatMoney(10.5)).toBe('EGP 10.50')
    expect(formatMoney(449.5)).toBe('EGP 449.50')
    expect(formatMoney(1234.56)).toBe('EGP 1,234.56')
  })

  it('formats large numbers with thousands separators', () => {
    expect(formatMoney(1000000)).toBe('EGP 1,000,000')
    expect(formatMoneyNumber(1299)).toBe('1,299')
    expect(formatMoneyNumber(10.5)).toBe('10.50')
  })

  it('handles null, undefined, and numeric strings safely', () => {
    expect(formatMoney(null)).toBe('EGP 0')
    expect(formatMoney(undefined)).toBe('EGP 0')
    expect(formatMoney('449')).toBe('EGP 449')
    expect(formatMoney('19.9')).toBe('EGP 19.90')
  })
})
