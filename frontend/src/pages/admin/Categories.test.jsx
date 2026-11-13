import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AdminCategories } from './Categories.jsx'
import { renderWithProviders } from '../../test/renderWithProviders.jsx'

describe('Admin Categories page', () => {
  it('lists categories, creates, edits, handles 409 duplicate & 409 delete protection, and deletes empty category', async () => {
    const user = userEvent.setup()

    renderWithProviders(<AdminCategories />, { role: 'admin' })

    expect(await screen.findByRole('heading', { name: 'Categories' })).toBeInTheDocument()
    expect(await screen.findAllByText('Electronics')).toHaveLength(2)

    // Attempt duplicate category name -> 409 error inside modal
    await user.click(screen.getByRole('button', { name: 'Add category' }))
    const createDialog = screen.getByRole('dialog', { name: 'Add category' })
    await user.type(within(createDialog).getByLabelText('Category name'), 'Electronics')
    await user.click(within(createDialog).getByRole('button', { name: 'Save' }))
    expect(
      await within(createDialog).findByText('A category with this name already exists.'),
    ).toBeInTheDocument()

    // Create new category
    await user.clear(within(createDialog).getByLabelText('Category name'))
    await user.type(within(createDialog).getByLabelText('Category name'), 'Gaming')
    await user.type(within(createDialog).getByLabelText(/Description/), 'Consoles and controllers.')
    await user.click(within(createDialog).getByRole('button', { name: 'Save' }))

    expect(await screen.findByText('Category saved')).toBeInTheDocument()
    expect(await screen.findAllByText('Gaming')).toHaveLength(2)

    // Attempt delete category that has products (Books & Stationery - first row) -> 409 inline alert
    await user.click(screen.getAllByRole('button', { name: 'Delete' })[0])
    const deleteDialog = screen.getByRole('dialog', { name: 'Delete category?' })
    await user.click(within(deleteDialog).getByRole('button', { name: 'Delete' }))
    expect(
      await within(deleteDialog).findByText(/still has products \(including inactive ones\)/i),
    ).toBeInTheDocument()
    await user.click(within(deleteDialog).getByRole('button', { name: 'Cancel' }))

    // Edit newly created Gaming category
    const rows = screen.getAllByRole('row')
    const gamingRow = rows.find((r) => within(r).queryByText('Gaming'))
    await user.click(within(gamingRow).getByRole('button', { name: 'Edit' }))
    const editDialog = screen.getByRole('dialog', { name: 'Edit category' })
    await user.clear(within(editDialog).getByLabelText('Category name'))
    await user.type(within(editDialog).getByLabelText('Category name'), 'Gaming Gear')
    await user.click(within(editDialog).getByRole('button', { name: 'Save' }))
    expect((await screen.findAllByText('Category saved')).length).toBeGreaterThanOrEqual(1)

    // Delete empty Gaming Gear category -> succeeds
    const updatedRow = screen.getAllByRole('row').find((r) => within(r).queryByText('Gaming Gear'))
    await user.click(within(updatedRow).getByRole('button', { name: 'Delete' }))
    const confirmDeleteDialog = screen.getByRole('dialog', { name: 'Delete category?' })
    await user.click(within(confirmDeleteDialog).getByRole('button', { name: 'Delete' }))
    expect(await screen.findByText('Category deleted')).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.queryByText('Gaming Gear')).not.toBeInTheDocument()
    })
  })
})
