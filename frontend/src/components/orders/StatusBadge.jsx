import { ORDER_STATUS_META } from '../../utils/orderStatus.js'
import { Badge } from '../ui/Badge.jsx'

export function StatusBadge({ status }) {
  const meta = ORDER_STATUS_META[status] || {
    label: status || 'Unknown',
    bg: '#F5F5F4',
    text: '#57534E',
    dot: '#78716C',
  }
  return <Badge label={meta.label} bg={meta.bg} text={meta.text} dot={meta.dot} />
}
