import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { testBackend } from '../../test/handlers.js'
import { renderWithProviders } from '../../test/renderWithProviders.jsx'
import { AdminOrderDetails } from './AdminOrderDetails.jsx'

describe('Admin OrderDetails page', () => {
  it('advances COD order Pending -> Confirmed -> Shipped -> Delivered and flips PaymentStatus to Paid', async () => {
    const user = userEvent.setup()

    renderWithProviders(
      <Routes>
        <Route path="/admin/orders/:id" element={<AdminOrderDetails />} />
      </Routes>,
      { route: '/admin/orders/3', role: 'admin' },
    )

    expect(
      await screen.findByRole('heading', { name: 'ORD-20261111-C8W3TV' }),
    ).toBeInTheDocument()
    expect(document.title).toBe('Order ORD-20261111-C8W3TV | Bazaaro Admin')
    expect(screen.getAllByText('Pending').length).toBeGreaterThanOrEqual(2)

    await user.click(screen.getByRole('button', { name: 'Confirm order' }))
    expect(await screen.findByText('Order status updated')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Mark as shipped' }))
    expect((await screen.findAllByText('Order status updated')).length).toBeGreaterThanOrEqual(1)

    await user.click(screen.getByRole('button', { name: 'Mark as delivered' }))
    expect((await screen.findAllByText('Order status updated')).length).toBeGreaterThanOrEqual(1)

    expect(screen.getByText('Paid')).toBeInTheDocument()
    expect(screen.getByText('No further actions')).toBeInTheDocument()
  })

  it('cancels Confirmed order via confirmation modal and restores stock', async () => {
    const user = userEvent.setup()
    const kbBefore = testBackend.getDb().products.find((p) => p.id === 5).stockQuantity

    renderWithProviders(
      <Routes>
        <Route path="/admin/orders/:id" element={<AdminOrderDetails />} />
      </Routes>,
      { route: '/admin/orders/4', role: 'admin' },
    )

    expect(
      await screen.findByRole('heading', { name: 'ORD-20261111-D2X5YZ' }),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Cancel order' }))

    const dialog = screen.getByRole('dialog', { name: 'Cancel this order?' })
    await user.click(within(dialog).getByRole('button', { name: 'Cancel order' }))
    expect(await screen.findByText('Order status updated')).toBeInTheDocument()

    const kbAfter = testBackend.getDb().products.find((p) => p.id === 5).stockQuantity
    expect(kbAfter).toBe(kbBefore + 1)
    expect(screen.getByText('No further actions')).toBeInTheDocument()
  })
})
