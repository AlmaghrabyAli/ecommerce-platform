import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { testBackend } from '../../test/handlers.js'
import { renderWithProviders } from '../../test/renderWithProviders.jsx'
import { OrderDetails } from './OrderDetails.jsx'

describe('Customer OrderDetails page', () => {
  it('renders Pending order with stepper, allows cancelling via modal, restores stock, and removes Cancel button', async () => {
    const user = userEvent.setup()
    const kettleBefore = testBackend.getDb().products.find((p) => p.id === 10).stockQuantity

    renderWithProviders(
      <Routes>
        <Route path="/orders/:id" element={<OrderDetails />} />
      </Routes>,
      { route: '/orders/3', role: 'customer' },
    )

    expect(
      await screen.findByRole('heading', { name: 'ORD-20261111-C8W3TV' }),
    ).toBeInTheDocument()
    expect(document.title).toBe('Order ORD-20261111-C8W3TV | Bazaaro')

    await user.click(screen.getByRole('button', { name: 'Cancel order' }))
    const dialog = screen.getByRole('dialog', { name: 'Cancel this order?' })
    await user.click(within(dialog).getByRole('button', { name: 'Cancel order' }))

    expect((await screen.findAllByText('Order cancelled')).length).toBeGreaterThanOrEqual(1)
    expect(screen.queryByRole('button', { name: 'Cancel order' })).not.toBeInTheDocument()
    const kettleAfter = testBackend.getDb().products.find((p) => p.id === 10).stockQuantity
    expect(kettleAfter).toBe(kettleBefore + 1)
  })

  it('hides Cancel button for Shipped order and shows 404 for unknown order id', async () => {
    renderWithProviders(
      <Routes>
        <Route path="/orders/:id" element={<OrderDetails />} />
      </Routes>,
      { route: '/orders/2', role: 'customer' },
    )

    expect(
      await screen.findByRole('heading', { name: 'ORD-20261110-B7N2QR' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Cancel order' })).not.toBeInTheDocument()

    renderWithProviders(
      <Routes>
        <Route path="/orders/:id" element={<OrderDetails />} />
      </Routes>,
      { route: '/orders/999', role: 'customer' },
    )

    expect(
      await screen.findByRole('heading', { name: "We couldn't find this order" }),
    ).toBeInTheDocument()
  })
})
