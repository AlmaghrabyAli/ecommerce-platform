import { PAYMENT_STATUS_META } from '../../utils/orderStatus.js'
import { Badge } from '../ui/Badge.jsx'

export function PaymentBadge({ paymentStatus }) {
  const meta = PAYMENT_STATUS_META[paymentStatus] || {
    label: paymentStatus || 'Pending',
    bg: '#FEF3C7',
    text: '#92400E',
    dot: '#D97706',
  }
  return <Badge label={meta.label} bg={meta.bg} text={meta.text} dot={meta.dot} />
}
