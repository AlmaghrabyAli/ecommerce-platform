import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StatusActions } from '../admin/StatusActions.jsx'
import { OrderItemsTable } from './OrderItemsTable.jsx'
import { PaymentBadge } from './PaymentBadge.jsx'
import { ShippingDetails } from './ShippingDetails.jsx'
import { StatusBadge } from './StatusBadge.jsx'
import { StatusStepper } from './StatusStepper.jsx'

describe('Order components', () => {
  it('StatusBadge and PaymentBadge render all known statuses plus fallback', () => {
    render(
      <div>
        <StatusBadge status="Pending" />
        <StatusBadge status="Confirmed" />
        <StatusBadge status="Shipped" />
        <StatusBadge status="Delivered" />
        <StatusBadge status="Cancelled" />
        <StatusBadge status="CustomStatus" />
        <PaymentBadge paymentStatus="Paid" />
        <PaymentBadge paymentStatus="Failed" />
      </div>,
    )

    expect(screen.getAllByText('Pending').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Confirmed')).toBeInTheDocument()
    expect(screen.getByText('Shipped')).toBeInTheDocument()
    expect(screen.getByText('Delivered')).toBeInTheDocument()
    expect(screen.getByText('Cancelled')).toBeInTheDocument()
    expect(screen.getByText('CustomStatus')).toBeInTheDocument()
    expect(screen.getByText('Paid')).toBeInTheDocument()
    expect(screen.getByText('Failed')).toBeInTheDocument()
  })

  it('StatusStepper renders progression steps for Pending through Delivered and cancelled alert for Cancelled', () => {
    const { rerender } = render(<StatusStepper status="Pending" />)
    expect(screen.getByText('Pending')).toBeInTheDocument()
    expect(screen.getByText('Confirmed')).toBeInTheDocument()
    expect(screen.getByText('Shipped')).toBeInTheDocument()
    expect(screen.getByText('Delivered')).toBeInTheDocument()

    rerender(<StatusStepper status="Delivered" />)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()

    rerender(<StatusStepper status="Cancelled" />)
    expect(screen.getByRole('status')).toHaveTextContent('Order cancelled')
    expect(screen.getByText(/items were returned to stock/i)).toBeInTheDocument()
  })

  it('StatusActions shows valid transitions for every status and opens Cancel modal', async () => {
    const user = userEvent.setup()
    const onUpdateStatus = vi.fn().mockResolvedValue({})

    const { rerender } = render(
      <StatusActions status="Pending" onUpdateStatus={onUpdateStatus} />,
    )
    await user.click(screen.getByRole('button', { name: 'Confirm order' }))
    expect(onUpdateStatus).toHaveBeenCalledWith('Confirmed')

    await user.click(screen.getByRole('button', { name: 'Cancel order' }))
    const dialog = screen.getByRole('dialog', { name: 'Cancel this order?' })
    await user.click(within(dialog).getByRole('button', { name: 'Cancel order' }))
    expect(onUpdateStatus).toHaveBeenCalledWith('Cancelled')

    rerender(<StatusActions status="Confirmed" onUpdateStatus={onUpdateStatus} />)
    expect(screen.getByRole('button', { name: 'Mark as shipped' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancel order' })).toBeInTheDocument()

    rerender(<StatusActions status="Shipped" onUpdateStatus={onUpdateStatus} />)
    expect(screen.getByRole('button', { name: 'Mark as delivered' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Cancel order' })).not.toBeInTheDocument()

    rerender(<StatusActions status="Delivered" onUpdateStatus={onUpdateStatus} />)
    expect(screen.getByText('No further actions')).toBeInTheDocument()

    rerender(<StatusActions status="Cancelled" onUpdateStatus={onUpdateStatus} />)
    expect(screen.getByText('No further actions')).toBeInTheDocument()

    // Keep order closes modal without calling onUpdateStatus; rejected cancellation closes modal cleanly
    const failingUpdate = vi.fn().mockRejectedValue(new Error('Network error'))
    rerender(<StatusActions status="Pending" onUpdateStatus={failingUpdate} />)
    await user.click(screen.getByRole('button', { name: 'Cancel order' }))
    const keepDialog = screen.getByRole('dialog', { name: 'Cancel this order?' })
    await user.click(within(keepDialog).getByRole('button', { name: 'Keep order' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(failingUpdate).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Cancel order' }))
    const failDialog = screen.getByRole('dialog', { name: 'Cancel this order?' })
    await user.click(within(failDialog).getByRole('button', { name: 'Cancel order' }))
    expect(failingUpdate).toHaveBeenCalledWith('Cancelled')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('OrderItemsTable and ShippingDetails render item totals and address details', () => {
    render(
      <div>
        <OrderItemsTable
          items={[
            {
              productId: 1,
              productName: 'Wireless Earbuds Pro',
              unitPrice: 1299,
              quantity: 2,
              lineTotal: 2598,
            },
          ]}
        />
        <ShippingDetails
          order={{
            fullName: 'Sara Ali',
            phone: '01098765432',
            addressLine: '12 El Nasr Street',
            city: 'Shibin El Kom',
            postalCode: '32511',
            notes: 'Leave at reception',
          }}
        />
      </div>,
    )

    expect(screen.getAllByText('Wireless Earbuds Pro')).toHaveLength(2)
    expect(screen.getByText('EGP 1,299')).toBeInTheDocument()
    expect(screen.getAllByText('EGP 2,598')).toHaveLength(2)
    expect(screen.getByText('Sara Ali')).toBeInTheDocument()
    expect(screen.getByText('01098765432')).toBeInTheDocument()
    expect(screen.getByText('12 El Nasr Street, Shibin El Kom, 32511')).toBeInTheDocument()
    expect(screen.getByText('Leave at reception')).toBeInTheDocument()
  })
})
