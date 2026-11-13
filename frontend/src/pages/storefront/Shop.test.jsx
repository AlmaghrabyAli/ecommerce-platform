import { act, fireEvent, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { API_BASE } from '../../test/fixtures.js'
import { renderWithProviders } from '../../test/renderWithProviders.jsx'
import { server } from '../../test/server.js'
import { Shop } from './Shop.jsx'

describe('Shop page', () => {
  it('fetches products, supports category/price/inStock/sort filters, chips, pagination, and URL restore', async () => {
    const user = userEvent.setup()
    const capturedQueries = []
    server.use(
      http.get(`${API_BASE}/products`, ({ request }) => {
        capturedQueries.push(new URL(request.url).searchParams.toString())
        return undefined
      }),
    )

    // Initial URL restore test
    renderWithProviders(<Shop />, {
      route: '/shop?categoryId=3&sortBy=price&sortDir=asc',
    })

    expect(await screen.findByRole('heading', { name: 'Electronics' })).toBeInTheDocument()
    expect(screen.getByText('4 products')).toBeInTheDocument()
    expect(screen.getByLabelText('Sort by')).toHaveValue('price:asc')
    expect(capturedQueries[0]).toContain('categoryId=3')
    expect(capturedQueries[0]).toContain('sortBy=price')
    expect(capturedQueries[0]).toContain('sortDir=asc')

    // Change sort to name:desc
    await user.selectOptions(screen.getByLabelText('Sort by'), 'name:desc')
    await waitFor(() => {
      expect(capturedQueries.some((q) => q.includes('sortBy=name&sortDir=desc'))).toBe(true)
    })

    // Apply min & max price
    await user.type(document.getElementById('sidebar-min-price'), '700')
    await user.type(document.getElementById('sidebar-max-price'), '2000')
    await user.click(screen.getAllByRole('button', { name: 'Apply' })[0])
    expect(await screen.findByText('Min: EGP 700')).toBeInTheDocument()
    expect(screen.getByText('Max: EGP 2,000')).toBeInTheDocument()

    // Toggle in stock
    await user.click(screen.getAllByRole('switch', { name: 'In stock only' })[0])
    const removeInStockChip = await screen.findByRole('button', { name: 'Remove In stock only' })
    expect(removeInStockChip).toBeInTheDocument()

    // Remove one chip (In stock only)
    await user.click(removeInStockChip)
    expect(screen.queryByRole('button', { name: 'Remove In stock only' })).not.toBeInTheDocument()

    // Clear all filters returns to 24 products (2 pages of 12)
    await user.click(screen.getByRole('button', { name: 'Clear all filters' }))
    expect(await screen.findByRole('heading', { name: 'All products' })).toBeInTheDocument()
    expect(await screen.findByText('24 products')).toBeInTheDocument()
    expect(screen.getByText('Page 1 of 2')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Next' }))
    expect(await screen.findByText('Page 2 of 2')).toBeInTheDocument()
  })

  it('debounces inline search input and updates heading and empty state', async () => {
    renderWithProviders(<Shop />, { route: '/shop?page=2' })
    expect(await screen.findByText('Page 2 of 2')).toBeInTheDocument()

    const searchBox = screen.getByLabelText('Filter products by name')
    vi.useFakeTimers()
    fireEvent.change(searchBox, { target: { value: 'xyznonexistent' } })

    act(() => {
      vi.advanceTimersByTime(450)
    })
    vi.useRealTimers()

    expect(
      await screen.findByRole('heading', { name: 'Results for "xyznonexistent"' }),
    ).toBeInTheDocument()
    expect(await screen.findByText('No products match your filters')).toBeInTheDocument()
    expect(screen.getByText('0 products')).toBeInTheDocument()
  })

  it('shows error state and recovers on retry', async () => {
    const user = userEvent.setup()
    let fail = true
    server.use(
      http.get(`${API_BASE}/products`, () => {
        if (fail) {
          return HttpResponse.json({ title: 'Error', status: 500 }, { status: 500 })
        }
        return undefined
      }),
    )

    renderWithProviders(<Shop />, { route: '/shop' })
    expect(await screen.findByRole('alert')).toBeInTheDocument()

    fail = false
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByText('24 products')).toBeInTheDocument()
  })
})
