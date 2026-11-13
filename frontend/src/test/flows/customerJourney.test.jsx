import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { testBackend } from '../handlers.js'
import { renderWithProviders } from '../renderWithProviders.jsx'

describe('Customer E2E journeys', () => {
  it('Flow 1: Guest shops, hits auth prompt, registers, adds to cart, checks out with COD, verifies order & stock, and cancels restoring stock', async () => {
    const user = userEvent.setup()
    const stockBefore = testBackend.getDb().products.find((p) => p.id === 1).stockQuantity

    renderWithProviders(null, { route: '/', role: 'guest', withRoutes: true })

    // Home -> Shop now
    expect(
      await screen.findByRole('heading', { name: 'Everything you need, delivered to your door' }),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: 'Shop now' }))

    expect(await screen.findByRole('heading', { name: 'All products' })).toBeInTheDocument()

    // Filter to Electronics
    await user.click(screen.getAllByRole('radio', { name: 'Electronics' })[0])
    expect(await screen.findByRole('heading', { name: 'Electronics' })).toBeInTheDocument()

    // Click Wireless Earbuds Pro card -> ProductDetails
    const productLinks = await screen.findAllByRole('link', { name: 'Wireless Earbuds Pro' })
    await user.click(productLinks[0])

    expect(
      await screen.findByRole('heading', { name: 'Wireless Earbuds Pro' }),
    ).toBeInTheDocument()

    // Guest clicking Add to cart -> /login
    await user.click(screen.getAllByRole('button', { name: 'Add to cart' })[0])
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument()

    // Switch to Register and create account
    await user.click(screen.getByRole('link', { name: 'Create an account' }))
    expect(await screen.findByRole('heading', { name: 'Create your account' })).toBeInTheDocument()

    await user.type(screen.getByLabelText('Full name'), 'Nadia Hassan')
    await user.type(screen.getByLabelText('Email'), 'nadia@example.com')
    await user.type(screen.getByLabelText('Password'), 'Password@123')
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    // Returns to product page as signed-in customer
    expect(
      await screen.findByRole('heading', { name: 'Wireless Earbuds Pro' }),
    ).toBeInTheDocument()

    // Add quantity 2 to cart
    await user.click(screen.getByRole('button', { name: 'Increase quantity' }))
    await user.click(screen.getAllByRole('button', { name: 'Add to cart' })[0])
    expect(await screen.findByText('Added to cart')).toBeInTheDocument()

    // Navigate to Cart via header link
    await user.click(screen.getByRole('link', { name: /Cart \(2 items\)/i }))
    expect(await screen.findByRole('heading', { name: 'Shopping cart' })).toBeInTheDocument()

    // Proceed to Checkout
    await user.click(screen.getAllByRole('button', { name: 'Proceed to checkout' })[0])
    expect(await screen.findByRole('heading', { name: 'Checkout' })).toBeInTheDocument()
    expect(screen.getByLabelText('Full name')).toHaveValue('Nadia Hassan')

    await user.type(screen.getByLabelText('Phone'), '01012345678')
    await user.type(screen.getByLabelText('City'), 'Giza')
    await user.type(screen.getByLabelText('Address'), '25 Dokki Street')
    await user.click(screen.getByRole('button', { name: 'Place order' }))

    // Confirmation page
    expect(
      await screen.findByRole('heading', { name: 'Thank you! Your order has been placed.' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Cash on delivery')).toBeInTheDocument()
    expect(testBackend.getDb().products.find((p) => p.id === 1).stockQuantity).toBe(
      stockBefore - 2,
    )

    // Go to My Orders -> View details -> Cancel order -> stock restored
    await user.click(screen.getByRole('link', { name: 'View my orders' }))
    expect(await screen.findByRole('heading', { name: 'My orders' })).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: 'View details' }))

    await user.click(await screen.findByRole('button', { name: 'Cancel order' }))
    const modal = screen.getByRole('dialog', { name: 'Cancel this order?' })
    await user.click(within(modal).getByRole('button', { name: 'Cancel order' }))

    expect((await screen.findAllByText('Order cancelled')).length).toBeGreaterThanOrEqual(1)
    expect(testBackend.getDb().products.find((p) => p.id === 1).stockQuantity).toBe(stockBefore)
  })

  it('Flow 2: Checkout 409 stock conflict banner lets customer review cart and retry checkout successfully', async () => {
    const user = userEvent.setup()
    testBackend.getDb().carts.set(2, [{ productId: 6, quantity: 2 }])
    testBackend.forceConflictOnNextCheckout()

    renderWithProviders(null, { route: '/checkout', role: 'customer', withRoutes: true })

    await user.type(await screen.findByLabelText('Phone'), '01012345678')
    await user.type(screen.getByLabelText('City'), 'Cairo')
    await user.type(screen.getByLabelText('Address'), '14 Tahrir Square')
    await user.click(screen.getByRole('button', { name: 'Place order' }))

    expect(
      await screen.findByText(/Some items changed while you were checking out/i),
    ).toBeInTheDocument()

    // Review cart -> back to checkout -> retry succeeds
    await user.click(screen.getByRole('link', { name: 'Review cart' }))
    expect(await screen.findByRole('heading', { name: 'Shopping cart' })).toBeInTheDocument()
    await user.click(screen.getAllByRole('button', { name: 'Proceed to checkout' })[0])

    await user.type(await screen.findByLabelText('Phone'), '01012345678')
    await user.type(screen.getByLabelText('City'), 'Cairo')
    await user.type(screen.getByLabelText('Address'), '14 Tahrir Square')
    await user.click(screen.getByRole('button', { name: 'Place order' }))

    expect(
      await screen.findByRole('heading', { name: 'Thank you! Your order has been placed.' }),
    ).toBeInTheDocument()
  })

  it('Flow 3: Expired token mid-session triggers single session-expired toast, redirects to /login, and returns after sign in', async () => {
    const user = userEvent.setup()
    testBackend.getDb().carts.set(2, [{ productId: 6, quantity: 1 }])

    renderWithProviders(null, { route: '/cart', role: 'customer', withRoutes: true })
    expect(await screen.findByRole('heading', { name: 'Shopping cart' })).toBeInTheDocument()

    // Expire token and navigate to Checkout -> /cart fetch returns 401 -> single toast + redirect to /login with state.from='/checkout'
    testBackend.expireToken('test-token-customer')
    await user.click(screen.getAllByRole('button', { name: 'Proceed to checkout' })[0])

    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
    expect(screen.getAllByText('Your session expired. Please sign in again.')).toHaveLength(1)

    // Re-authenticate -> returns to /checkout
    await user.type(screen.getByLabelText('Email'), 'customer@shop.test')
    await user.type(screen.getByLabelText('Password'), 'Customer@12345')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Checkout' })).toBeInTheDocument()
    })
  })
})
