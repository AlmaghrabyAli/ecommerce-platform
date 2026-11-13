import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { API_BASE } from '../../test/fixtures.js'
import { renderWithProviders } from '../../test/renderWithProviders.jsx'
import { server } from '../../test/server.js'
import { AdminOrders } from './Orders.jsx'

describe('Admin Orders page', () => {
  it('renders order list and filters across status tabs with URL sync', async () => {
    const user = userEvent.setup()
    renderWithProviders(<AdminOrders />, { route: '/admin/orders', role: 'admin' })

    expect(await screen.findByRole('heading', { name: 'Orders' })).toBeInTheDocument()
    expect(await screen.findAllByText('ORD-20261111-D2X5YZ')).toHaveLength(2)

    await user.click(screen.getByRole('tab', { name: 'Pending' }))
    expect(await screen.findAllByText('ORD-20261111-C8W3TV')).toHaveLength(2)
    expect(screen.queryByText('ORD-20261111-D2X5YZ')).not.toBeInTheDocument()
  })

  it('shows empty tab message when no orders match and error retry on failure', async () => {
    const user = userEvent.setup()
    let fail = true
    server.use(
      http.get(`${API_BASE}/admin/orders`, () => {
        if (fail) return HttpResponse.json({ title: 'Error', status: 500 }, { status: 500 })
        return HttpResponse.json({ items: [], page: 1, pageSize: 20, totalCount: 0, totalPages: 0 })
      }),
    )

    renderWithProviders(<AdminOrders />, {
      route: '/admin/orders?status=Shipped',
      role: 'admin',
    })

    expect(await screen.findByRole('alert')).toBeInTheDocument()
    fail = false
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByText('No Shipped orders')).toBeInTheDocument()
  })
})
