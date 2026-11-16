import { screen, waitFor } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import { API_BASE } from '../test/fixtures.js'
import { renderWithProviders } from '../test/renderWithProviders.jsx'
import { server } from '../test/server.js'

describe('Routing, guards, redirects, and document titles', () => {
  it('ProtectedRoute shows loading spinner while validating session', () => {
    server.use(
      http.get(`${API_BASE}/auth/me`, async () => {
        await new Promise((r) => setTimeout(r, 80))
        return HttpResponse.json({
          id: 2,
          fullName: 'Demo Customer',
          email: 'customer@shop.test',
          role: 'Customer',
        })
      }),
    )

    const { container } = renderWithProviders(null, {
      route: '/cart',
      role: 'customer',
      withRoutes: true,
    })

    expect(container.querySelector('.animate-spin')).toBeInTheDocument()
  })

  it('ProtectedRoute sends guests to /login and allows signed-in customers', async () => {
    renderWithProviders(null, {
      route: '/orders',
      role: 'guest',
      withRoutes: true,
    })

    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
    expect(document.title).toBe('Sign in | Bazaaro')

    renderWithProviders(null, {
      route: '/orders',
      role: 'customer',
      withRoutes: true,
    })

    expect(await screen.findByRole('heading', { name: 'My orders' })).toBeInTheDocument()
    expect(document.title).toBe('My orders | Bazaaro')
  })

  it('AdminRoute blocks customers with Forbidden and allows admins into Dashboard', async () => {
    const first = renderWithProviders(null, {
      route: '/admin',
      role: 'customer',
      withRoutes: true,
    })

    expect(
      await screen.findByRole('heading', { name: "You don't have access to this page" }),
    ).toBeInTheDocument()
    expect(document.title).toBe('Access denied | Bazaaro')

    first.unmount()

    renderWithProviders(null, {
      route: '/admin',
      role: 'admin',
      withRoutes: true,
    })

    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument()
    expect(document.title).toBe('Dashboard | Bazaaro Admin')
  })

  it('Auth pages redirect already signed-in customers to / and admins to /admin', async () => {
    const first = renderWithProviders(null, {
      route: '/login',
      role: 'customer',
      withRoutes: true,
    })
    expect(await screen.findByRole('heading', { name: /Everything you need/i })).toBeInTheDocument()

    first.unmount()

    renderWithProviders(null, {
      route: '/register',
      role: 'admin',
      withRoutes: true,
    })
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument()
    })
  })

  it('Unknown routes render 404 NotFound page with Go to home link and matching title', async () => {
    renderWithProviders(null, {
      route: '/does-not-exist',
      role: 'guest',
      withRoutes: true,
    })

    expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Go to home' })).toHaveAttribute('href', '/')
    expect(document.title).toBe('Page not found | Bazaaro')
  })
})
