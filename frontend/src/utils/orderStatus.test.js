import {
  ORDER_STATUSES,
  ORDER_STATUS_META,
  PAYMENT_STATUS_META,
  PRODUCT_STATUS_META,
  STEPPER_STATUSES,
  STOCK_BADGE_META,
  allowedNextStatuses,
  canCancel,
  formatPaymentMethod,
} from './orderStatus.js'

describe('orderStatus helpers', () => {
  it('defines exact stepper order and all order statuses', () => {
    expect(STEPPER_STATUSES).toEqual(['Pending', 'Confirmed', 'Shipped', 'Delivered'])
    expect(ORDER_STATUSES).toEqual(['Pending', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled'])
  })

  it('evaluates canCancel for all 5 statuses', () => {
    expect(canCancel('Pending')).toBe(true)
    expect(canCancel('Confirmed')).toBe(true)
    expect(canCancel('Shipped')).toBe(false)
    expect(canCancel('Delivered')).toBe(false)
    expect(canCancel('Cancelled')).toBe(false)
  })

  it('returns exact allowedNextStatuses transitions for all 5 statuses', () => {
    expect(allowedNextStatuses('Pending')).toEqual(['Confirmed', 'Cancelled'])
    expect(allowedNextStatuses('Confirmed')).toEqual(['Shipped', 'Cancelled'])
    expect(allowedNextStatuses('Shipped')).toEqual(['Delivered'])
    expect(allowedNextStatuses('Delivered')).toEqual([])
    expect(allowedNextStatuses('Cancelled')).toEqual([])
    expect(allowedNextStatuses('Unknown')).toEqual([])
  })

  it('covers badge color metadata for every order, payment, product, and stock status', () => {
    for (const s of ORDER_STATUSES) {
      expect(ORDER_STATUS_META[s]).toMatchObject({
        label: expect.any(String),
        bg: expect.stringMatching(/^#/),
        text: expect.stringMatching(/^#/),
      })
    }
    expect(PAYMENT_STATUS_META.Paid.label).toBe('Paid')
    expect(PAYMENT_STATUS_META.Pending.label).toBe('Pending')
    expect(PRODUCT_STATUS_META.active.label).toBe('Active')
    expect(PRODUCT_STATUS_META.inactive.label).toBe('Inactive')
    expect(STOCK_BADGE_META.out.label).toBe('Out of stock')
    expect(STOCK_BADGE_META.low.label).toBe('Low')
  })

  it('formats payment method labels', () => {
    expect(formatPaymentMethod('CashOnDelivery')).toBe('Cash on delivery')
    expect(formatPaymentMethod('MockCard')).toBe('Card (demo)')
    expect(formatPaymentMethod('')).toBe('')
  })
})
