import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { API_BASE } from '../../test/fixtures.js'
import { testBackend } from '../../test/handlers.js'
import { renderWithProviders } from '../../test/renderWithProviders.jsx'
import { server } from '../../test/server.js'
import { AdminProducts } from './Products.jsx'

describe('Admin Products page', () => {
  it('lists all products (including inactive), filters by category, and toggles Deactivate / Activate', async () => {
    const user = userEvent.setup()
    testBackend.getDb().products.find((p) => p.id === 3).isActive = false

    renderWithProviders(<AdminProducts />, { route: '/admin/products', role: 'admin' })

    expect(await screen.findByRole('heading', { name: 'Products' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Add product/i })).toHaveAttribute(
      'href',
      '/admin/products/new',
    )

    // Filter to Electronics so both active (id 1) and inactive (id 3) appear on page 1
    await screen.findByRole('option', { name: 'Electronics' })
    await user.selectOptions(screen.getByLabelText('Filter by category'), '3')
    expect(await screen.findAllByText('Wireless Earbuds Pro')).toHaveLength(2)
    expect(screen.getAllByText('Inactive').length).toBeGreaterThanOrEqual(1)

    // Track PUT requests to verify imageUrl is preserved
    const putRequests = []
    server.use(
      http.put(`${API_BASE}/admin/products/:id`, async ({ request, params }) => {
        const body = await request.json()
        putRequests.push({ id: params.id, body })
        // Let normal handler proceed by returning passthrough or updating db
        const prod = testBackend.getDb().products.find((p) => p.id === Number(params.id))
        if (prod) {
          prod.isActive = Boolean(body.isActive)
          prod.versionCounter += 1
          return HttpResponse.json({ ...prod })
        }
        return HttpResponse.json({ title: 'Not found', status: 404 }, { status: 404 })
      }),
    )

    // Activate inactive product
    const activateBtns = screen.getAllByRole('button', { name: 'Activate' })
    await user.click(activateBtns[0])
    expect(await screen.findByText('Product saved')).toBeInTheDocument()
    expect(putRequests.at(-1)?.body.isActive).toBe(true)
    expect(putRequests.at(-1)?.body.imageUrl).toBeTruthy()

    // Deactivate active product via modal
    const deactivateBtns = screen.getAllByRole('button', { name: 'Deactivate' })
    await user.click(deactivateBtns[0])
    const dialog = screen.getByRole('dialog', { name: 'Deactivate product?' })
    await user.click(within(dialog).getByRole('button', { name: 'Deactivate' }))
    expect(await screen.findByText('Product deactivated')).toBeInTheDocument()
    expect(putRequests.at(-1)?.body.isActive).toBe(false)
    expect(putRequests.at(-1)?.body.imageUrl).toBeTruthy()
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })

  it('shows error state and recovers on retry', async () => {
    const user = userEvent.setup()
    let fail = true
    server.use(
      http.get(`${API_BASE}/admin/products`, () => {
        if (fail) return HttpResponse.json({ title: 'Error', status: 500 }, { status: 500 })
        return undefined
      }),
    )

    renderWithProviders(<AdminProducts />, { role: 'admin' })
    expect(await screen.findByRole('alert')).toBeInTheDocument()

    fail = false
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByText('Page 1 of 2')).toBeInTheDocument()
  })

  it('opens delete confirmation modal, cancels, and deletes product successfully', async () => {
    const user = userEvent.setup()
    renderWithProviders(<AdminProducts />, { route: '/admin/products', role: 'admin' })

    expect(await screen.findByRole('heading', { name: 'Products' })).toBeInTheDocument()

    const deleteBtns = await screen.findAllByRole('button', { name: 'Delete' })
    expect(deleteBtns.length).toBeGreaterThan(0)

    await user.click(deleteBtns[0])
    const dialog = screen.getByRole('dialog', { name: 'Delete product?' })
    expect(dialog).toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    const deleteBtnsAfterCancel = screen.getAllByRole('button', { name: 'Delete' })
    await user.click(deleteBtnsAfterCancel[0])
    const dialogAgain = screen.getByRole('dialog', { name: 'Delete product?' })
    await user.click(within(dialogAgain).getByRole('button', { name: 'Delete' }))

    expect(await screen.findByText('Product deleted')).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })
})
