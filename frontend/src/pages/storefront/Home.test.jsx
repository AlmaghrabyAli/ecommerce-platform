import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { API_BASE } from '../../test/fixtures.js'
import { renderWithProviders } from '../../test/renderWithProviders.jsx'
import { server } from '../../test/server.js'
import { Home } from './Home.jsx'

describe('Home page', () => {
  it('renders loading skeletons, then hero, store benefits, 6 category cards, and 8 new arrivals', async () => {
    server.use(
      http.get(`${API_BASE}/categories`, async () => {
        await new Promise((r) => setTimeout(r, 40))
        return HttpResponse.json([{ id: 3, name: 'Electronics', slug: 'electronics', description: 'Gadgets' }])
      }),
    )

    const { container } = renderWithProviders(<Home />)
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0)

    expect(
      screen.getByRole('heading', { name: 'Everything you need, delivered to your door' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Cash on delivery available')).toBeInTheDocument()
    expect(screen.getByText('Free shipping on orders over EGP 1,000')).toBeInTheDocument()

    expect(await screen.findByRole('heading', { name: 'Electronics' })).toBeInTheDocument()
    const articles = await screen.findAllByRole('article')
    expect(articles).toHaveLength(8)
    expect(screen.getByRole('link', { name: /Shop now/i })).toHaveAttribute('href', '/shop')
    expect(screen.getByRole('link', { name: /View all/i })).toHaveAttribute('href', '/shop')
  })

  it('renders error state with retry button when catalog fails and recovers on retry', async () => {
    const user = userEvent.setup()
    let fail = true
    server.use(
      http.get(`${API_BASE}/categories`, () => {
        if (fail) {
          return HttpResponse.json({ title: 'Error', status: 500 }, { status: 500 })
        }
        return HttpResponse.json([{ id: 3, name: 'Electronics', slug: 'electronics', description: 'Gadgets' }])
      }),
    )

    renderWithProviders(<Home />)
    expect(await screen.findByRole('alert')).toBeInTheDocument()

    fail = false
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByRole('heading', { name: 'Electronics' })).toBeInTheDocument()
  })
})
