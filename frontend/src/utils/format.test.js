import { pluralize, stockState } from './format.js'

describe('format helpers', () => {
  it('pluralizes singular and plural counts', () => {
    expect(pluralize(0, 'item')).toBe('0 items')
    expect(pluralize(1, 'item')).toBe('1 item')
    expect(pluralize(2, 'item')).toBe('2 items')
    expect(pluralize(1, 'product')).toBe('1 product')
    expect(pluralize(24, 'product')).toBe('24 products')
  })

  it('computes stockState across boundary quantities 0, 1, 5, and 6', () => {
    expect(stockState(0)).toBe('out')
    expect(stockState(-1)).toBe('out')
    expect(stockState(1)).toBe('low')
    expect(stockState(5)).toBe('low')
    expect(stockState(6)).toBe('in')
  })
})
