import { fireEvent, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { Route, Routes } from 'react-router-dom'
import { API_BASE } from '../../test/fixtures.js'
import { server } from '../../test/server.js'
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

    // Fill valid product
    await user.type(screen.getByLabelText('Product name'), 'Studio Mic USB')
    await user.type(screen.getByLabelText('Description'), 'Clear condenser microphone.')
    await user.type(screen.getByLabelText('Price (EGP)'), '1499')
    await user.type(screen.getByLabelText('Stock quantity'), '12')
    await user.selectOptions(screen.getByLabelText('Category'), '3')

    // Confirm NO text input labelled "Image URL"
    expect(screen.queryByLabelText(/Image URL/i)).not.toBeInTheDocument()

    // Upload an image
    const fileInput = screen.getByLabelText('Upload product image file')
    const validFile = new File(['mic-png-bytes'], 'mic.png', { type: 'image/png' })
    await user.upload(fileInput, validFile)
    expect(await screen.findByText('Image uploaded')).toBeInTheDocument()

    const previewImg = await screen.findByRole('img', { name: 'Studio Mic USB' })
    expect(previewImg).toHaveAttribute(
      'src',
      expect.stringMatching(/^http:\/\/localhost:5062\/api\/images\/\d+$/),
    )
    fireEvent.error(previewImg)
    expect(screen.queryByRole('img', { name: 'Studio Mic USB' })).not.toBeInTheDocument()

    let postPayload = null
    server.use(
      http.post(`${API_BASE}/admin/products`, async ({ request }) => {
        postPayload = await request.json()
        return HttpResponse.json(
          {
            id: 99,
            ...postPayload,
            slug: 'studio-mic-usb',
            rowVersion: 'AAAA',
          },
          { status: 201 },
        )
      }),
    )

    await user.click(screen.getByRole('button', { name: 'Create product' }))
    expect(await screen.findByText('Product saved')).toBeInTheDocument()
    expect(await screen.findByText('Created edit redirect')).toBeInTheDocument()
    expect(postPayload?.imageUrl).toMatch(/^http:\/\/localhost:5062\/api\/images\/\d+$/)
  })

  it('while upload is pending the Save button and upload buttons are disabled and aria-live status exists', async () => {
    let resolveUpload
    server.use(
      http.post(
        `${API_BASE}/admin/images`,
        () =>
          new Promise((resolve) => {
            resolveUpload = () =>
              resolve(
                HttpResponse.json(
                  { id: 42, url: 'http://localhost:5062/api/images/42' },
                  { status: 201 },
                ),
              )
          }),
        { once: true },
      ),
    )

    renderWithProviders(
      <Routes>
        <Route path="/admin/products/new" element={<ProductEdit />} />
      </Routes>,
      { route: '/admin/products/new', role: 'admin' },
    )

    expect(await screen.findByRole('heading', { name: 'Add product' })).toBeInTheDocument()

    const fileInput = screen.getByLabelText('Upload product image file')
    const file = new File(['png-data'], 'test.png', { type: 'image/png' })
    fireEvent.change(fileInput, { target: { files: [file] } })

    // Buttons should be disabled during upload
    const saveBtn = screen.getByRole('button', { name: 'Create product' })
    const uploadBtn = screen.getByRole('button', { name: 'Upload image' })
    await waitFor(() => expect(saveBtn).toBeDisabled())
    expect(uploadBtn).toBeDisabled()

    // Announce status in aria-live
    expect(await screen.findByText('Uploading image…')).toBeInTheDocument()

    // Resolve upload
    resolveUpload()
    expect(await screen.findByText('Image uploaded')).toBeInTheDocument()
    await waitFor(() => expect(saveBtn).not.toBeDisabled())
  })

  it('rejects non-image files (.txt or .gif) and files over 2 MB without sending a request', async () => {
    let imageRequestsCount = 0
    server.use(
      http.post(`${API_BASE}/admin/images`, () => {
        imageRequestsCount += 1
        return HttpResponse.json({ id: 1, url: 'http://localhost:5062/api/images/1' }, { status: 201 })
      }),
    )

    renderWithProviders(
      <Routes>
        <Route path="/admin/products/new" element={<ProductEdit />} />
      </Routes>,
      { route: '/admin/products/new', role: 'admin' },
    )

    expect(await screen.findByRole('heading', { name: 'Add product' })).toBeInTheDocument()
    const fileInput = screen.getByLabelText('Upload product image file')

    // Reject text file
    const textFile = new File(['hello'], 'document.txt', { type: 'text/plain' })
    fireEvent.change(fileInput, { target: { files: [textFile] } })
    expect(await screen.findByText('Please choose a JPEG, PNG or WebP image.')).toBeInTheDocument()
    expect(imageRequestsCount).toBe(0)

    // Reject gif file
    const gifFile = new File(['gifdata'], 'animation.gif', { type: 'image/gif' })
    fireEvent.change(fileInput, { target: { files: [gifFile] } })
    expect(await screen.findByText('Please choose a JPEG, PNG or WebP image.')).toBeInTheDocument()
    expect(imageRequestsCount).toBe(0)

    // Reject file > 2 MB
    const largeFile = new File([new Uint8Array(2.5 * 1024 * 1024)], 'huge.png', {
      type: 'image/png',
    })
    fireEvent.change(fileInput, { target: { files: [largeFile] } })
    expect(await screen.findByText('Image must be 2 MB or smaller.')).toBeInTheDocument()
    expect(imageRequestsCount).toBe(0)
  })

  it('shows friendly inline message for each server error and preserves previous image', async () => {
    const errorCases = [
      {
        response: { detail: 'Only JPEG, PNG or WebP images are allowed.', status: 400 },
        expectedText: 'Only JPEG, PNG or WebP images are allowed.',
      },
      {
        response: { detail: 'Image must be 2 MB or smaller.', status: 400 },
        expectedText: 'Image must be 2 MB or smaller.',
      },
      {
        response: { detail: 'The image file is empty.', status: 400 },
        expectedText: 'The selected file is empty.',
      },
      {
        response: { errors: { file: ['The file field is required.'] }, status: 400 },
        expectedText: 'Please choose an image file.',
      },
      {
        response: {
          errors: {
            '': [
              'Failed to read the request form. Request body too large. The max request body size is 10485760 bytes.',
            ],
          },
          status: 400,
        },
        expectedText: 'Image must be 2 MB or smaller.',
      },
      {
        response: { detail: 'Image not found.', status: 404 },
        expectedText: 'This image could not be found.',
      },
    ]

    for (const { response, expectedText } of errorCases) {
      server.use(
        http.post(
          `${API_BASE}/admin/images`,
          () =>
            HttpResponse.json(
              {
                type: 'https://tools.ietf.org/html/rfc9110#section-15.5.1',
                title: 'Error',
                ...response,
              },
              { status: response.status || 400 },
            ),
          { once: true },
        ),
      )

      const { unmount } = renderWithProviders(
        <Routes>
          <Route path="/admin/products/:id/edit" element={<ProductEdit />} />
        </Routes>,
        { route: '/admin/products/1/edit', role: 'admin' },
      )

      expect(await screen.findByRole('heading', { name: 'Edit product' })).toBeInTheDocument()
      const originalImg = screen.getByRole('img', { name: 'Wireless Earbuds Pro' })
      expect(originalImg).toBeInTheDocument()

      const fileInput = screen.getByLabelText('Upload product image file')
      const file = new File(['png-data'], 'new.png', { type: 'image/png' })
      fireEvent.change(fileInput, { target: { files: [file] } })

      expect(await screen.findByText(expectedText)).toBeInTheDocument()

      // Previous image is kept
      expect(screen.getByRole('img', { name: 'Wireless Earbuds Pro' })).toBeInTheDocument()

      unmount()
    }
  })

  it('clicking Remove then Save sends imageUrl: ""', async () => {
    const user = userEvent.setup()

    renderWithProviders(
      <Routes>
        <Route path="/admin/products/:id/edit" element={<ProductEdit />} />
        <Route path="/admin/products" element={<div>Back to products list</div>} />
      </Routes>,
      { route: '/admin/products/1/edit', role: 'admin' },
    )

    expect(await screen.findByRole('heading', { name: 'Edit product' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Change image' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Remove' })).toBeInTheDocument()

    // Click Remove
    await user.click(screen.getByRole('button', { name: 'Remove' }))
    expect(screen.queryByRole('button', { name: 'Remove' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Upload image' })).toBeInTheDocument()

    let putPayload = null
    server.use(
      http.put(`${API_BASE}/admin/products/:id`, async ({ request }) => {
        putPayload = await request.json()
        const prod = testBackend.getDb().products.find((p) => p.id === 1)
        return HttpResponse.json({ ...prod, ...putPayload, rowVersion: 'BBBB' })
      }),
    )

    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(await screen.findByText('Product saved')).toBeInTheDocument()
    expect(putPayload?.imageUrl).toBe('')
  })

  it('editing product without touching image sends existing imageUrl', async () => {
    const user = userEvent.setup()

    renderWithProviders(
      <Routes>
        <Route path="/admin/products/:id/edit" element={<ProductEdit />} />
        <Route path="/admin/products" element={<div>Back to products list</div>} />
      </Routes>,
      { route: '/admin/products/1/edit', role: 'admin' },
    )

    const nameInput = await screen.findByLabelText('Product name')
    await user.type(nameInput, ' Updated')

    let putPayload = null
    server.use(
      http.put(`${API_BASE}/admin/products/:id`, async ({ request }) => {
        putPayload = await request.json()
        const prod = testBackend.getDb().products.find((p) => p.id === 1)
        return HttpResponse.json({ ...prod, ...putPayload, rowVersion: 'CCCC' })
      }),
    )

    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(await screen.findByText('Product saved')).toBeInTheDocument()
    expect(putPayload?.imageUrl).toBe(
      'https://example.com/products/wireless-earbuds-pro.jpg',
    )
  })

  it('choosing the same file twice in a row works because input was reset', async () => {
    let uploadCount = 0
    server.use(
      http.post(`${API_BASE}/admin/images`, () => {
        uploadCount += 1
        return HttpResponse.json(
          { id: uploadCount, url: `http://localhost:5062/api/images/${uploadCount}` },
          { status: 201 },
        )
      }),
    )

    renderWithProviders(
      <Routes>
        <Route path="/admin/products/new" element={<ProductEdit />} />
      </Routes>,
      { route: '/admin/products/new', role: 'admin' },
    )

    expect(await screen.findByRole('heading', { name: 'Add product' })).toBeInTheDocument()
    const fileInput = screen.getByLabelText('Upload product image file')
    const file = new File(['pngdata'], 'same-photo.png', { type: 'image/png' })

    // First time
    fireEvent.change(fileInput, { target: { files: [file] } })
    expect(await screen.findByText('Image uploaded')).toBeInTheDocument()
    expect(uploadCount).toBe(1)

    // Second time with identical file object
    fireEvent.change(fileInput, { target: { files: [file] } })
    await waitFor(() => expect(uploadCount).toBe(2))
  })

  it('401 during upload triggers session redirect and toast', async () => {
    server.use(
      http.post(
        `${API_BASE}/admin/images`,
        () => new HttpResponse(null, { status: 401 }),
        { once: true },
      ),
    )

    renderWithProviders(
      <Routes>
        <Route path="/admin/products/new" element={<ProductEdit />} />
        <Route path="/login" element={<div>Login page redirect</div>} />
      </Routes>,
      { route: '/admin/products/new', role: 'admin' },
    )

    expect(await screen.findByRole('heading', { name: 'Add product' })).toBeInTheDocument()
    const fileInput = screen.getByLabelText('Upload product image file')
    const file = new File(['pngdata'], 'photo.png', { type: 'image/png' })
    fireEvent.change(fileInput, { target: { files: [file] } })

    expect(await screen.findByText('Login page redirect')).toBeInTheDocument()
  })

  it('shrinking: file < 500 KB bypasses canvas, file > 500 KB invokes shrinker and falls back if canvas fails', async () => {
    let uploadedFile = null
    server.use(
      http.post(`${API_BASE}/admin/images`, async ({ request }) => {
        const formData = await request.formData()
        uploadedFile = formData.get('file')
        return HttpResponse.json(
          { id: 99, url: 'http://localhost:5062/api/images/99' },
          { status: 201 },
        )
      }),
    )

    const createElementSpy = vi.spyOn(document, 'createElement')

    renderWithProviders(
      <Routes>
        <Route path="/admin/products/new" element={<ProductEdit />} />
      </Routes>,
      { route: '/admin/products/new', role: 'admin' },
    )

    expect(await screen.findByRole('heading', { name: 'Add product' })).toBeInTheDocument()
    const fileInput = screen.getByLabelText('Upload product image file')

    // File < 500 KB -> does not touch canvas
    const smallFile = new File(['small'], 'small.png', { type: 'image/png' })
    fireEvent.change(fileInput, { target: { files: [smallFile] } })
    expect(await screen.findByText('Image uploaded')).toBeInTheDocument()
    expect(createElementSpy).not.toHaveBeenCalledWith('canvas')

    // File > 500 KB but canvas getContext returns null -> falls back to uploading original file
    const largeFile = new File(['large-image-content'], 'large.png', { type: 'image/png' })
    Object.defineProperty(largeFile, 'size', { value: 800 * 1024 })
    fireEvent.change(fileInput, { target: { files: [largeFile] } })
    expect(await screen.findByText('Image uploaded')).toBeInTheDocument()
    expect(uploadedFile).toBeTruthy()

    createElementSpy.mockRestore()
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

  it('renders server error banner on failed save (400 validation error & 500 error)', async () => {
    const user = userEvent.setup()

    renderWithProviders(
      <Routes>
        <Route path="/admin/products/new" element={<ProductEdit />} />
      </Routes>,
      { route: '/admin/products/new', role: 'admin' },
    )

    expect(await screen.findByRole('heading', { name: 'Add product' })).toBeInTheDocument()
    await user.type(screen.getByLabelText('Product name'), 'Desk Stand')
    await user.type(screen.getByLabelText('Description'), 'Solid stand.')
    await user.type(screen.getByLabelText('Price (EGP)'), '499')
    await user.type(screen.getByLabelText('Stock quantity'), '5')
    await user.selectOptions(screen.getByLabelText('Category'), '3')

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
  })
})
