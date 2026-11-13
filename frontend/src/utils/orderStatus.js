export const ORDER_STATUSES = ['Pending', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled']

export const STEPPER_STATUSES = ['Pending', 'Confirmed', 'Shipped', 'Delivered']

export const ORDER_STATUS_META = {
  Pending: { label: 'Pending', bg: '#FEF3C7', text: '#92400E', dot: '#D97706' },
  Confirmed: { label: 'Confirmed', bg: '#DBEAFE', text: '#1D4ED8', dot: '#2563EB' },
  Shipped: { label: 'Shipped', bg: '#E0E7FF', text: '#4338CA', dot: '#4F46E5' },
  Delivered: { label: 'Delivered', bg: '#DCFCE7', text: '#166534', dot: '#16A34A' },
  Cancelled: { label: 'Cancelled', bg: '#FEE2E2', text: '#B91C1C', dot: '#DC2626' },
}

export const PAYMENT_STATUS_META = {
  Paid: { label: 'Paid', bg: '#DCFCE7', text: '#166534', dot: '#16A34A' },
  Pending: { label: 'Pending', bg: '#FEF3C7', text: '#92400E', dot: '#D97706' },
}

export const PRODUCT_STATUS_META = {
  active: { label: 'Active', bg: '#DCFCE7', text: '#166534', dot: '#16A34A' },
  inactive: { label: 'Inactive', bg: '#F5F5F4', text: '#57534E', dot: '#78716C' },
}

export const STOCK_BADGE_META = {
  out: { label: 'Out of stock', bg: '#FEE2E2', text: '#B91C1C' },
  low: { label: 'Low', bg: '#FEF3C7', text: '#92400E' },
}

export const ADMIN_BADGE_META = {
  label: 'Admin',
  bg: '#FFEDD5',
  text: '#C2410C',
}

const TRANSITIONS = {
  Pending: ['Confirmed', 'Cancelled'],
  Confirmed: ['Shipped', 'Cancelled'],
  Shipped: ['Delivered'],
  Delivered: [],
  Cancelled: [],
}

export function canCancel(status) {
  return status === 'Pending' || status === 'Confirmed'
}

export function allowedNextStatuses(status) {
  return TRANSITIONS[status] || []
}

export function formatPaymentMethod(method) {
  if (method === 'MockCard') return 'Card (demo)'
  if (method === 'CashOnDelivery') return 'Cash on delivery'
  return method || ''
}
