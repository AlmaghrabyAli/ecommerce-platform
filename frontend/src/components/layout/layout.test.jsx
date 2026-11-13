import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { testBackend } from '../../test/handlers.js'
import { renderWithProviders } from '../../test/renderWithProviders.jsx'
import { AdminLayout } from './AdminLayout.jsx'
import { CategoryRow } from './CategoryRow.jsx'
import { Footer } from './Footer.jsx'
import { Header } from './Header.jsx'

describe('Layout components', () => {
  it('Header shows Sign in for guests, hides Admin panel for customers, and submits search to /shop', async () => {
    const user = userEvent.setup()

    renderWithProviders(
      <Routes>
        <Route
          path="/"
          element={
            <div>
              <Header />
              <CategoryRow />
              <Footer />
            </div>
          }
        />
        <Route path="/shop" element={<div data-testid="shop-dest">Shop page</div>} />
      </Routes>,
      { route: '/', role: 'guest' },
    )

    expect(screen.getByRole('link', { name: 'Sign in' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Cart' })).toHaveAttribute('href', '/login')
    const catNav = screen.getByRole('navigation', { name: 'Product categories' })
    expect(await within(catNav).findByRole('link', { name: 'Electronics' })).toBeInTheDocument()
    expect(screen.getByText('© 2026 Bazaaro')).toBeInTheDocument()

    await user.type(screen.getByLabelText('Search products'), 'wireless mouse')
    await user.click(screen.getByRole('button', { name: 'Search' }))
    expect(screen.getByTestId('shop-dest')).toBeInTheDocument()
  })

  it('Header renders customer first name + live cart badge and caps badge at 9+', async () => {
    const user = userEvent.setup()
    testBackend.getDb().carts.set(2, [
      { productId: 6, quantity: 5 },
      { productId: 13, quantity: 6 },
    ])

    renderWithProviders(<Header />, { role: 'customer' })

    expect(screen.getByText('Demo')).toBeInTheDocument()
    expect(await screen.findByText('9+')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Account menu' }))
    expect(screen.getByRole('menuitem', { name: 'My orders' })).toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: 'Admin panel' })).not.toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Sign out' })).toBeInTheDocument()
  })

  it('Header shows Admin panel menu item for admins', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Header />, { role: 'admin' })

    await user.click(screen.getByRole('button', { name: 'Account menu' }))
    expect(screen.getByRole('menuitem', { name: 'Admin panel' })).toBeInTheDocument()
  })

  it('AdminLayout renders sidebar active link, mobile drawer, and sign out', async () => {
    const user = userEvent.setup()
    renderWithProviders(
      <Routes>
        <Route path="/" element={<div data-testid="home-after-signout">Home</div>} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route path="products" element={<div>Admin products child</div>} />
        </Route>
      </Routes>,
      { route: '/admin/products', role: 'admin' },
    )

    expect(await screen.findByText('Admin products child')).toBeInTheDocument()
    const nav = screen.getByRole('navigation', { name: 'Admin navigation' })
    const productsLink = nav.querySelector('a[href="/admin/products"]')
    expect(productsLink).toHaveClass('border-primary')

    await user.click(screen.getByRole('button', { name: 'Open navigation menu' }))
    const dialog = screen.getByRole('dialog', { name: 'Admin navigation' })
    expect(dialog).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Close navigation menu' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Sign out' }))
    await waitFor(() => {
      expect(screen.getByTestId('home-after-signout')).toBeInTheDocument()
    })
  })
})
