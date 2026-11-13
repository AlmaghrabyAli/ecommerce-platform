import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { API_BASE, makeStats } from '../../test/fixtures.js'
import { renderWithProviders } from '../../test/renderWithProviders.jsx'
import { server } from '../../test/server.js'
import { Dashboard } from './Dashboard.jsx'

describe('Admin Dashboard page', () => {
  it('renders 4 stat cards, low-stock items with badges, and top products table', async () => {
    renderWithProviders(<Dashboard />, { role: 'admin' })

    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument()
    expect(screen.getByText('Total orders')).toBeInTheDocument()
    expect(screen.getAllByText('Revenue')).toHaveLength(2)
    expect(screen.getByText('Pending orders')).toBeInTheDocument()
    expect(screen.getByText('Low-stock products')).toBeInTheDocument()
    expect(screen.getByText('Excludes cancelled orders')).toBeInTheDocument()
    expect(screen.getByText('EGP 4,445')).toBeInTheDocument()

    expect(screen.getByText('Orders by status')).toBeInTheDocument()
    expect(screen.getByText('Power Bank 20000mAh')).toBeInTheDocument()
    expect(screen.getByText('Out of stock')).toBeInTheDocument()
    expect(screen.getByText('Low')).toBeInTheDocument()
    expect(screen.getByText('Wireless Mouse Ergonomic')).toBeInTheDocument()
  })

  it('renders empty low-stock & top-products fallbacks and error retry', async () => {
    const user = userEvent.setup()
    let fail = true
    server.use(
      http.get(`${API_BASE}/admin/stats`, () => {
        if (fail) {
          return HttpResponse.json({ title: 'Error', status: 500 }, { status: 500 })
        }
        return HttpResponse.json(
          makeStats({
            totalOrders: 0,
            revenue: 0,
            lowStockProducts: [],
            topProducts: [],
          }),
        )
      }),
    )

    renderWithProviders(<Dashboard />, { role: 'admin' })
    expect(await screen.findByRole('alert')).toBeInTheDocument()

    fail = false
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByText('All products are well stocked')).toBeInTheDocument()
    expect(screen.getByText('No sales yet')).toBeInTheDocument()
  })
})
