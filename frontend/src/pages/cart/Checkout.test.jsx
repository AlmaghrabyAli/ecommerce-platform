import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { Route, Routes } from 'react-router-dom'
import { API_BASE } from '../../test/fixtures.js'
import { testBackend } from '../../test/handlers.js'
import { renderWithProviders } from '../../test/renderWithProviders.jsx'
import { server } from '../../test/server.js'
import { Checkout } from './Checkout.jsx'

describe('Checkout page', () => {
  it('redirects to /cart when cart is empty', async () => {
    renderWithProviders(
      <Routes>
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/cart" element={<div>Redirected to cart</div>} />
      </Routes>,
      { route: '/checkout', role: 'customer' },
    )

    expect(await screen.findByText('Redirected to cart')).toBeInTheDocument()
  })

  it('prefills fullName, validates fields, exposes only COD and MockCard with zero card inputs, and places order cleanly', async () => {
    const user = userEvent.setup()
    testBackend.getDb().carts.set(2, [{ productId: 6, quantity: 2 }])

    let capturedBody = null
    server.use(
      http.post(`${API_BASE}/orders`, async ({ request }) => {
        capturedBody = await request.clone().json()
        return undefined
      }),
    )

    const { container } = renderWithProviders(
      <Routes>
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/order-confirmation/:id" element={<div>Order confirmation view</div>} />
      </Routes>,
      { route: '/checkout', role: 'customer' },
    )

    const fullNameInput = await screen.findByLabelText('Full name')
    expect(fullNameInput).toHaveValue('Demo Customer')

    // Ensure no sensitive card inputs exist anywhere
    expect(container.innerHTML).not.toMatch(/cvv|card number|expiry/i)
    expect(screen.getByLabelText(/Cash on delivery/i)).toBeChecked()
    expect(screen.getByLabelText(/Card \(demo\)/i)).toBeInTheDocument()

    // Trigger client validation errors
    await user.clear(fullNameInput)
    await user.click(screen.getByRole('button', { name: 'Place order' }))
    expect(await screen.findByText('Full name is required.')).toBeInTheDocument()
    expect(screen.getByText('Phone number is required.')).toBeInTheDocument()
    expect(screen.getByText('City is required.')).toBeInTheDocument()
    expect(screen.getByText('Address is required.')).toBeInTheDocument()

    // Fill valid shipping & select MockCard
    await user.type(fullNameInput, 'Demo Customer')
    await user.type(screen.getByLabelText('Phone'), '01012345678')
    await user.type(screen.getByLabelText('City'), 'Cairo')
    await user.type(screen.getByLabelText('Address'), '14 Tahrir Square')
    await user.type(screen.getByLabelText(/Postal code/), '11511')
    await user.type(screen.getByLabelText(/Delivery notes/), 'Ring bell')
    await user.click(screen.getByLabelText(/Card \(demo\)/i))

    // Submit
    await user.click(screen.getByRole('button', { name: 'Place order' }))
    expect(await screen.findByText('Order confirmation view')).toBeInTheDocument()

    // Verify exact BACKEND.md payload (no prices, totals, or items sent by client)
    expect(capturedBody).toEqual({
      fullName: 'Demo Customer',
      phone: '01012345678',
      addressLine: '14 Tahrir Square',
      city: 'Cairo',
      postalCode: '11511',
      notes: 'Ring bell',
      paymentMethod: 'MockCard',
    })
  })

  it('prevents double-submit, displays server 400 validation errors and 409 conflict banner with Review cart', async () => {
    const user = userEvent.setup()
    testBackend.getDb().carts.set(2, [{ productId: 6, quantity: 1 }])

    let postCount = 0
    server.use(
      http.post(`${API_BASE}/orders`, async () => {
        postCount += 1
        if (postCount === 1) {
          await new Promise((r) => setTimeout(r, 60))
          return HttpResponse.json(
            {
              title: 'One or more validation errors occurred.',
              status: 400,
              errors: { Phone: ['Invalid Egyptian phone format.'] },
            },
            { status: 400 },
          )
        }
        return HttpResponse.json(
          {
            title: 'Conflict.',
            status: 409,
            detail: 'Stock changed while placing your order. Please review your cart and try again.',
          },
          { status: 409 },
        )
      }),
    )

    renderWithProviders(
      <Routes>
        <Route path="/checkout" element={<Checkout />} />
      </Routes>,
      { route: '/checkout', role: 'customer' },
    )

    await user.type(await screen.findByLabelText('Phone'), '01012345678')
    await user.type(screen.getByLabelText('City'), 'Cairo')
    await user.type(screen.getByLabelText('Address'), '14 Tahrir Square')

    const submitBtn = screen.getByRole('button', { name: 'Place order' })
    await Promise.all([user.click(submitBtn), user.click(submitBtn)])
    expect(postCount).toBe(1)
    expect(await screen.findByText('Invalid Egyptian phone format.')).toBeInTheDocument()

    // Retry -> hits 409 conflict banner
    await user.click(submitBtn)
    expect(
      await screen.findByText(/Some items changed while you were checking out/i),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Review cart' })).toHaveAttribute('href', '/cart')
  })
})
