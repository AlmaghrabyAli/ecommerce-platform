import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { Route, Routes } from 'react-router-dom'
import { API_BASE } from '../../test/fixtures.js'
import { testBackend } from '../../test/handlers.js'
import { renderWithProviders } from '../../test/renderWithProviders.jsx'
import { server } from '../../test/server.js'
import { Cart } from './Cart.jsx'

describe('Cart page', () => {
  it('renders empty state with Start shopping CTA when cart has no items', async () => {
    renderWithProviders(<Cart />, { role: 'customer' })
    expect(await screen.findByText('Your cart is empty')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Start shopping' })).toHaveAttribute('href', '/shop')
  })

  it('updates item quantity, removes items, clears cart via modal, and blocks checkout on unavailable items', async () => {
    const user = userEvent.setup()
    testBackend.getDb().carts.set(2, [
      { productId: 6, quantity: 2 },
      { productId: 4, quantity: 1 }, // stockQuantity 0 -> isAvailable: false
    ])

    renderWithProviders(
      <Routes>
        <Route path="/cart" element={<Cart />} />
        <Route path="/checkout" element={<div>Checkout destination</div>} />
      </Routes>,
      { route: '/cart', role: 'customer' },
    )

    expect(await screen.findByRole('heading', { name: 'Shopping cart' })).toBeInTheDocument()
    expect(screen.getByText('(3 items)')).toBeInTheDocument()
    expect(screen.getByText('This product is no longer available.')).toBeInTheDocument()
    expect(
      screen.getByText('Update or remove unavailable items before checking out.'),
    ).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Proceed to checkout' })[0]).toBeDisabled()

    // Remove the unavailable item -> checkout becomes enabled
    await user.click(screen.getByRole('button', { name: 'Remove Power Bank 20000mAh' }))
    expect(await screen.findByText('Item removed')).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: 'Proceed to checkout' })[0]).toBeEnabled()
    })

    // Update quantity on remaining item (449 * 3 = 1,347)
    await user.click(screen.getByRole('button', { name: 'Increase quantity' }))
    expect(await screen.findByText('(3 items)')).toBeInTheDocument()
    expect(screen.getAllByText('EGP 1,347').length).toBeGreaterThanOrEqual(1)

    // Open Clear cart modal and confirm
    await user.click(screen.getByRole('button', { name: 'Clear cart' }))
    const dialog = screen.getByRole('dialog', { name: 'Clear your cart?' })
    await user.click(within(dialog).getByRole('button', { name: 'Clear cart' }))
    expect(await screen.findByText('Cart cleared')).toBeInTheDocument()
    expect(await screen.findByText('Your cart is empty')).toBeInTheDocument()
  })

  it('navigates to /checkout and displays error state with retry on failure', async () => {
    const user = userEvent.setup()
    let fail = true
    testBackend.getDb().carts.set(2, [{ productId: 6, quantity: 1 }])
    server.use(
      http.get(`${API_BASE}/cart`, () => {
        if (fail) {
          return HttpResponse.json({ title: 'Error', status: 500 }, { status: 500 })
        }
        return undefined
      }),
    )

    renderWithProviders(
      <Routes>
        <Route path="/cart" element={<Cart />} />
        <Route path="/checkout" element={<div>Checkout destination</div>} />
      </Routes>,
      { route: '/cart', role: 'customer' },
    )

    expect(await screen.findByRole('alert')).toBeInTheDocument()
    fail = false
    await user.click(screen.getByRole('button', { name: 'Try again' }))

    const checkoutBtn = (await screen.findAllByRole('button', { name: 'Proceed to checkout' }))[0]
    await user.click(checkoutBtn)
    expect(screen.getByText('Checkout destination')).toBeInTheDocument()
  })
})
