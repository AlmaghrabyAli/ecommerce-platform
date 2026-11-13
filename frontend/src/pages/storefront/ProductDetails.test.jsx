import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { Route, Routes } from 'react-router-dom'
import { API_BASE } from '../../test/fixtures.js'
import { testBackend } from '../../test/handlers.js'
import { renderWithProviders } from '../../test/renderWithProviders.jsx'
import { server } from '../../test/server.js'
import { ProductDetails } from './ProductDetails.jsx'

describe('ProductDetails page', () => {
  it('renders product details, related products, sets title, and adds chosen quantity for signed-in user', async () => {
    const user = userEvent.setup()

    renderWithProviders(
      <Routes>
        <Route path="/products/:slug" element={<ProductDetails />} />
      </Routes>,
      { route: '/products/wireless-earbuds-pro', role: 'customer' },
    )

    expect(
      await screen.findByRole('heading', { name: 'Wireless Earbuds Pro' }),
    ).toBeInTheDocument()
    expect(document.title).toBe('Wireless Earbuds Pro | Bazaaro')
    expect(screen.getAllByText('EGP 1,299').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('In stock')).toBeInTheDocument()
    expect(
      await screen.findByRole('heading', { name: 'More in Electronics' }),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Increase quantity' }))
    await user.click(screen.getAllByRole('button', { name: 'Add to cart' })[0])

    expect(await screen.findByText('Added to cart')).toBeInTheDocument()
    expect(testBackend.getDb().carts.get(2)).toEqual([{ productId: 1, quantity: 2 }])
  })

  it('redirects guests to /login when clicking Add to cart and disables button when out of stock', async () => {
    const user = userEvent.setup()

    renderWithProviders(
      <Routes>
        <Route path="/products/:slug" element={<ProductDetails />} />
        <Route path="/login" element={<div>Login target</div>} />
      </Routes>,
      { route: '/products/power-bank-20000mah', role: 'guest' },
    )

    expect(await screen.findByRole('heading', { name: 'Power Bank 20000mAh' })).toBeInTheDocument()
    expect(screen.getAllByText('Out of stock').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByRole('button', { name: 'Out of stock' })[0]).toBeDisabled()

    renderWithProviders(
      <Routes>
        <Route path="/products/:slug" element={<ProductDetails />} />
        <Route path="/login" element={<div>Login target</div>} />
      </Routes>,
      { route: '/products/wireless-earbuds-pro', role: 'guest' },
    )

    const addButtons = await screen.findAllByRole('button', { name: 'Add to cart' })
    await user.click(addButtons[0])
    await waitFor(() => {
      expect(screen.getByText('Login target')).toBeInTheDocument()
    })
  })

  it('shows 404 Back to shop state for missing slug and error retry for 500', async () => {
    renderWithProviders(
      <Routes>
        <Route path="/products/:slug" element={<ProductDetails />} />
      </Routes>,
      { route: '/products/does-not-exist' },
    )

    expect(await screen.findByRole('heading', { name: 'Product not found' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to shop' })).toHaveAttribute('href', '/shop')

    server.use(
      http.get(`${API_BASE}/products/broken`, () =>
        HttpResponse.json({ title: 'Error', status: 500 }, { status: 500 }),
      ),
    )

    renderWithProviders(
      <Routes>
        <Route path="/products/:slug" element={<ProductDetails />} />
      </Routes>,
      { route: '/products/broken' },
    )

    expect(await screen.findByRole('alert')).toBeInTheDocument()
  })
})
