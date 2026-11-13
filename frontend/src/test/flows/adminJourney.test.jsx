import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { testBackend } from '../handlers.js'
import { renderWithProviders } from '../renderWithProviders.jsx'

describe('Admin E2E journeys', () => {
  it('Flow 4: Admin navigates dashboard, creates category & product, handles status progression & stock restoration, and blocks customer role', async () => {
    const user = userEvent.setup()
    renderWithProviders(null, { route: '/admin', role: 'admin', withRoutes: true })

    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument()

    // Go to Categories & create one
    const adminNav = screen.getByRole('navigation', { name: 'Admin navigation' })
    await user.click(within(adminNav).getByRole('link', { name: 'Categories' }))
    expect(await screen.findByRole('heading', { name: 'Categories' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Add category' }))
    const catDialog = screen.getByRole('dialog', { name: 'Add category' })
    await user.type(within(catDialog).getByLabelText('Category name'), 'Smart Home')
    await user.click(within(catDialog).getByRole('button', { name: 'Save' }))
    expect(await screen.findByText('Category saved')).toBeInTheDocument()

    // Go to Products -> Add product -> Create product
    await user.click(within(adminNav).getByRole('link', { name: 'Products' }))
    await user.click(await screen.findByRole('link', { name: /Add product/i }))
    expect(await screen.findByRole('heading', { name: 'Add product' })).toBeInTheDocument()

    await user.type(screen.getByLabelText('Product name'), 'Smart Plug WiFi')
    await user.type(screen.getByLabelText('Description'), 'Remote controlled smart outlet.')
    await user.type(screen.getByLabelText('Price (EGP)'), '350')
    await user.type(screen.getByLabelText('Stock quantity'), '25')
    await user.selectOptions(
      screen.getByLabelText('Category'),
      screen.getByRole('option', { name: 'Smart Home' }).value,
    )
    await user.click(screen.getByRole('button', { name: 'Create product' }))
    expect(await screen.findByText('Product saved')).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: 'Edit product' })).toBeInTheDocument()

    // Go to Orders -> open COD Pending order #3 -> advance to Delivered
    await user.click(within(adminNav).getByRole('link', { name: 'Orders' }))
    await user.click(await screen.findByRole('tab', { name: 'Pending' }))
    const viewLinks = await screen.findAllByRole('link', { name: 'View' })
    await user.click(viewLinks[0])

    await user.click(await screen.findByRole('button', { name: 'Confirm order' }))
    expect(await screen.findByText('Order status updated')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Mark as shipped' }))
    expect((await screen.findAllByText('Order status updated')).length).toBeGreaterThanOrEqual(1)
    await user.click(screen.getByRole('button', { name: 'Mark as delivered' }))
    expect((await screen.findAllByText('Order status updated')).length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Paid')).toBeInTheDocument()

    // Return to Dashboard and verify Pending count updated to 0
    await user.click(within(adminNav).getByRole('link', { name: 'Dashboard' }))
    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument()
    expect(testBackend.getDb().orders.find((o) => o.id === 3).status).toBe('Delivered')

    // Verify customer trying to access /admin is blocked
    renderWithProviders(null, { route: '/admin/orders', role: 'customer', withRoutes: true })
    expect(
      await screen.findByRole('heading', { name: "You don't have access to this page" }),
    ).toBeInTheDocument()
  })
})
