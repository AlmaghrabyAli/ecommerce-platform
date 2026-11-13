import { fireEvent, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { testBackend } from '../../test/handlers.js'
import { renderWithProviders } from '../../test/renderWithProviders.jsx'
import { ProductEdit } from './ProductEdit.jsx'

describe('Admin ProductEdit page', () => {
  it('validates fields on create, previews image with fallback, and creates product', async () => {
    const user = userEvent.setup()

    renderWithProviders(
      <Routes>
        <Route path="/admin/products/new" element={<ProductEdit />} />
        <Route path="/admin/products/:id/edit" element={<div>Created edit redirect</div>} />
      </Routes>,
      { route: '/admin/products/new', role: 'admin' },
    )

    expect(await screen.findByRole('heading', { name: 'Add product' })).toBeInTheDocument()

    // Trigger client validation
    await user.click(screen.getByRole('button', { name: 'Create product' }))
    expect(await screen.findByText('Product name is required.')).toBeInTheDocument()
    expect(screen.getByText('Description is required.')).toBeInTheDocument()
    expect(screen.getByText('Price is required.')).toBeInTheDocument()
    expect(screen.getByText('Stock quantity is required.')).toBeInTheDocument()
    expect(screen.getByText('Please select a category.')).toBeInTheDocument()

    // Fill valid product + test image preview & fallback
    await user.type(screen.getByLabelText('Product name'), 'Studio Mic USB')
    await user.type(screen.getByLabelText('Description'), 'Clear condenser microphone.')
    await user.type(screen.getByLabelText('Price (EGP)'), '1499')
    await user.type(screen.getByLabelText('Stock quantity'), '12')
    await user.selectOptions(screen.getByLabelText('Category'), '3')

    const imgInput = screen.getByLabelText(/Image URL/)
    await user.type(imgInput, 'https://example.com/mic.jpg')
    const previewImg = screen.getByRole('img', { name: 'Studio Mic USB' })
    expect(previewImg).toHaveAttribute('src', 'https://example.com/mic.jpg')
    fireEvent.error(previewImg)
    expect(screen.queryByRole('img', { name: 'Studio Mic USB' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Create product' }))
    expect(await screen.findByText('Product saved')).toBeInTheDocument()
    expect(await screen.findByText('Created edit redirect')).toBeInTheDocument()
  })

  it('edits product with rowVersion, handles 409 conflict banner + Reload, and saves updated version', async () => {
    const user = userEvent.setup()

    renderWithProviders(
      <Routes>
        <Route path="/admin/products/:id/edit" element={<ProductEdit />} />
        <Route path="/admin/products" element={<div>Back to products list</div>} />
      </Routes>,
      { route: '/admin/products/1/edit', role: 'admin' },
    )

    const nameInput = await screen.findByLabelText('Product name')
    expect(nameInput).toHaveValue('Wireless Earbuds Pro')
    expect(screen.getByText('wireless-earbuds-pro')).toBeInTheDocument()

    // Simulate someone else updating product 1 behind the scenes
    testBackend.bumpProductVersion(1)

    await user.clear(nameInput)
    await user.type(nameInput, 'Wireless Earbuds Pro v2')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(
      await screen.findByText(
        'This product was changed by someone else. Reload it and try again.',
      ),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Reload' }))
    await waitFor(() => {
      expect(screen.getByLabelText('Product name')).toHaveValue('Wireless Earbuds Pro')
    })

    // Save with fresh rowVersion
    await user.clear(screen.getByLabelText('Product name'))
    await user.type(screen.getByLabelText('Product name'), 'Wireless Earbuds Pro v2')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByText('Product saved')).toBeInTheDocument()
    expect(await screen.findByText('Back to products list')).toBeInTheDocument()
  })

  it('shows 404 Back to products when editing unknown product id', async () => {
    renderWithProviders(
      <Routes>
        <Route path="/admin/products/:id/edit" element={<ProductEdit />} />
      </Routes>,
      { route: '/admin/products/999/edit', role: 'admin' },
    )

    expect(await screen.findByRole('heading', { name: 'Product not found' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to products' })).toHaveAttribute(
      'href',
      '/admin/products',
    )
  })

  it('uploads an image file from Preview, rejects non-image files, removes preview image, and renders server error banner', async () => {
    const user = userEvent.setup()
    const OriginalImage = globalThis.Image
    globalThis.Image = class MockJsdomImage {
      set src(_v) {
        queueMicrotask(() => this.onload?.())
      }
    }

    try {
      renderWithProviders(
        <Routes>
          <Route path="/admin/products/new" element={<ProductEdit />} />
        </Routes>,
        { route: '/admin/products/new', role: 'admin' },
      )

      expect(await screen.findByRole('heading', { name: 'Add product' })).toBeInTheDocument()

      const fileInput = screen.getByLabelText('Upload product image file')

      // Upload valid image file -> triggers createPreviewImageUrl + sets imageUrl & shows Remove button
      const validFile = new File(['pngdata'], 'photo.png', { type: 'image/png' })
      await user.upload(fileInput, validFile)
      expect(await screen.findByText('Product image added to preview')).toBeInTheDocument()
      expect(screen.getByLabelText(/Image URL/).value).toMatch(/^blob:/)

      // Remove uploaded image
      await user.click(screen.getByRole('button', { name: 'Remove' }))
      expect(screen.getByLabelText(/Image URL/)).toHaveValue('')

      // Reject non-image file (use fireEvent so accept="image/*" doesn't filter in user.upload)
      const textFile = new File(['hello'], 'notes.txt', { type: 'text/plain' })
      fireEvent.change(fileInput, { target: { files: [textFile] } })
      expect(await screen.findByText('Please select a valid image file.')).toBeInTheDocument()

      // Trigger generic 400 validation errors & banner fallback
      await user.type(screen.getByLabelText('Product name'), 'Desk Stand')
      await user.type(screen.getByLabelText('Description'), 'Solid stand.')
      await user.type(screen.getByLabelText('Price (EGP)'), '499')
      await user.type(screen.getByLabelText('Stock quantity'), '5')
      await user.selectOptions(screen.getByLabelText('Category'), '3')

      const { HttpResponse, http } = await import('msw')
      const { API_BASE } = await import('../../test/fixtures.js')
      const { server } = await import('../../test/server.js')
      server.use(
        http.post(
          `${API_BASE}/admin/products`,
          () =>
            HttpResponse.json(
              {
                title: 'Validation failed',
                status: 400,
                errors: { name: ['Name already taken.'] },
              },
              { status: 400 },
            ),
          { once: true },
        ),
      )

      await user.click(screen.getByRole('button', { name: 'Create product' }))
      expect(await screen.findByText('Name already taken.')).toBeInTheDocument()

      server.use(
        http.post(
          `${API_BASE}/admin/products`,
          () => HttpResponse.json({ title: 'Server failure', status: 500 }, { status: 500 }),
          { once: true },
        ),
      )
      await user.click(screen.getByRole('button', { name: 'Create product' }))
      expect(
        await screen.findByText('Something went wrong on our side. Please try again.'),
      ).toBeInTheDocument()
    } finally {
      globalThis.Image = OriginalImage
    }
  })
})
