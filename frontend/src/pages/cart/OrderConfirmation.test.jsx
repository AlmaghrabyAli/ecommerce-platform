import { screen } from '@testing-library/react'
import { Route, Routes } from 'react-router-dom'
import { renderWithProviders } from '../../test/renderWithProviders.jsx'
import { OrderConfirmation } from './OrderConfirmation.jsx'

describe('OrderConfirmation page', () => {
  it('renders order confirmation summary, payment status, shipping details, and action links', async () => {
    renderWithProviders(
      <Routes>
        <Route path="/order-confirmation/:id" element={<OrderConfirmation />} />
      </Routes>,
      { route: '/order-confirmation/3', role: 'customer' },
    )

    expect(
      await screen.findByRole('heading', { name: 'Thank you! Your order has been placed.' }),
    ).toBeInTheDocument()
    expect(screen.getByText('ORD-20261111-C8W3TV')).toBeInTheDocument()
    expect(screen.getByText('Cash on delivery')).toBeInTheDocument()
    expect(screen.getAllByText('EGP 549').length).toBeGreaterThanOrEqual(2)
    expect(screen.getByText('EGP 50')).toBeInTheDocument()
    expect(screen.getByText('EGP 599')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'View my orders' })).toHaveAttribute('href', '/orders')
    expect(screen.getByRole('link', { name: 'Continue shopping' })).toHaveAttribute('href', '/shop')
  })

  it('shows 404 Back to my orders when order does not belong to customer', async () => {
    renderWithProviders(
      <Routes>
        <Route path="/order-confirmation/:id" element={<OrderConfirmation />} />
      </Routes>,
      { route: '/order-confirmation/999', role: 'customer' },
    )

    expect(
      await screen.findByRole('heading', { name: "We couldn't find this order" }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to my orders' })).toHaveAttribute(
      'href',
      '/orders',
    )
  })
})
