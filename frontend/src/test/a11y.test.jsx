import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'vitest-axe'
import { Header } from '../components/layout/Header.jsx'
import { Modal } from '../components/ui/Modal.jsx'
import { testBackend } from './handlers.js'
import { renderWithProviders } from './renderWithProviders.jsx'

const AXE_OPTIONS = {
  rules: {
    'color-contrast': { enabled: false },
  },
}

describe('Accessibility & keyboard navigation smoke suite', () => {
  it('passes axe audit on Home, Shop, ProductDetails, Login, Register, Cart, Checkout, MyOrders, Dashboard, ProductEdit, and open Modal', async () => {
    const pages = [
      {
        route: '/',
        role: 'guest',
        waitReady: async () => {
          await screen.findByRole('heading', { name: /Everything you need/i })
          await screen.findAllByText('Electronics')
          await screen.findAllByRole('article')
        },
      },
      {
        route: '/shop',
        role: 'guest',
        waitReady: async () => {
          await screen.findByText('24 products')
          await screen.findAllByText('Electronics')
        },
      },
      {
        route: '/products/wireless-earbuds-pro',
        role: 'guest',
        waitReady: async () => {
          await screen.findByRole('heading', { name: 'Wireless Earbuds Pro' })
          await screen.findByText('More in Electronics')
        },
      },
      {
        route: '/login',
        role: 'guest',
        waitReady: async () => {
          await screen.findByRole('heading', { name: 'Sign in' })
        },
      },
      {
        route: '/register',
        role: 'guest',
        waitReady: async () => {
          await screen.findByRole('heading', { name: 'Create your account' })
        },
      },
      {
        route: '/orders',
        role: 'customer',
        waitReady: async () => {
          await screen.findAllByText('ORD-20261111-C8W3TV')
          await screen.findAllByText('Electronics')
        },
      },
      {
        route: '/admin',
        role: 'admin',
        waitReady: async () => {
          await screen.findByText('Orders by status')
        },
      },
      {
        route: '/admin/products/1/edit',
        role: 'admin',
        waitReady: async () => {
          await screen.findByRole('button', { name: 'Save changes' })
        },
      },
    ]

    for (const entry of pages) {
      const { container, unmount } = renderWithProviders(null, {
        route: entry.route,
        role: entry.role,
        withRoutes: true,
      })
      await entry.waitReady()
      const results = await axe(container, AXE_OPTIONS)
      expect(results.violations).toEqual([])
      unmount()
    }

    // Cart & Checkout with an item in cart
    testBackend.getDb().carts.set(2, [{ productId: 6, quantity: 1 }])
    for (const entry of [
      {
        route: '/cart',
        role: 'customer',
        waitReady: async () => {
          await screen.findByRole('heading', { name: 'Shopping cart' })
          await screen.findAllByText('Electronics')
        },
      },
      {
        route: '/checkout',
        role: 'customer',
        waitReady: async () => {
          await screen.findByRole('heading', { name: 'Shipping details' })
          await screen.findByRole('button', { name: 'Place order' })
          await screen.findAllByText('Electronics')
        },
      },
    ]) {
      const { container, unmount } = renderWithProviders(null, {
        route: entry.route,
        role: entry.role,
        withRoutes: true,
      })
      await entry.waitReady()
      const results = await axe(container, AXE_OPTIONS)
      expect(results.violations).toEqual([])
      unmount()
    }

    // Open Modal audit
    const { container } = render(
      <Modal
        open
        onClose={() => {}}
        title="Accessible modal"
        footer={<button type="button">Done</button>}
      >
        <p>Dialog body content</p>
      </Modal>,
    )
    const modalResults = await axe(container, AXE_OPTIONS)
    expect(modalResults.violations).toEqual([])
  }, 30000)

  it('supports keyboard-only interaction for Header account menu, Modal, and Checkout form', async () => {
    const user = userEvent.setup()
    testBackend.getDb().carts.set(2, [{ productId: 6, quantity: 1 }])

    // 1. Header account menu via keyboard
    const { unmount } = renderWithProviders(<Header />, { role: 'customer' })
    const menuTrigger = screen.getByRole('button', { name: 'Account menu' })
    menuTrigger.focus()
    await user.keyboard('{Enter}')
    expect(screen.getByRole('menu')).toBeInTheDocument()
    fireEvent.keyDown(document, { key: 'ArrowDown' })
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'My orders' }))
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(document.activeElement).toBe(menuTrigger)
    unmount()

    // 2. Checkout form keyboard submit triggers accessible validation messages
    renderWithProviders(null, { route: '/checkout', role: 'customer', withRoutes: true })
    const placeOrderBtn = await screen.findByRole('button', { name: 'Place order' })
    await screen.findAllByText('Electronics')
    placeOrderBtn.focus()
    await user.keyboard('{Enter}')
    expect(await screen.findByText('Phone number is required.')).toBeInTheDocument()
  })
})
