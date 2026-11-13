import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { API_BASE } from '../../test/fixtures.js'
import { renderWithProviders } from '../../test/renderWithProviders.jsx'
import { server } from '../../test/server.js'
import { MyOrders } from './MyOrders.jsx'

describe('MyOrders page', () => {
  it('renders customer orders sorted newest-first with links to details', async () => {
    renderWithProviders(<MyOrders />, { role: 'customer' })

    expect(await screen.findByRole('heading', { name: 'My orders' })).toBeInTheDocument()
    expect(await screen.findByText('ORD-20261111-C8W3TV')).toBeInTheDocument()
    expect(screen.getByText('ORD-20261110-B7N2QR')).toBeInTheDocument()
    expect(screen.getByText('ORD-20261108-A4K9MP')).toBeInTheDocument()

    const links = screen.getAllByRole('link', { name: 'View details' })
    expect(links).toHaveLength(3)
    expect(links[0]).toHaveAttribute('href', '/orders/3')
  })

  it('renders empty state when user has no orders and error retry when fetch fails', async () => {
    const user = userEvent.setup()
    let mode = 'error'
    server.use(
      http.get(`${API_BASE}/orders`, () => {
        if (mode === 'error') {
          return HttpResponse.json({ title: 'Error', status: 500 }, { status: 500 })
        }
        return HttpResponse.json([])
      }),
    )

    renderWithProviders(<MyOrders />, { role: 'customer' })
    expect(await screen.findByRole('alert')).toBeInTheDocument()

    mode = 'empty'
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByText('You have no orders yet')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Start shopping' })).toHaveAttribute('href', '/shop')
  })
})
