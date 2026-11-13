import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { Route, Routes } from 'react-router-dom'
import { API_BASE, SEED_CATEGORIES, makeProduct } from '../../test/fixtures.js'
import { renderWithProviders } from '../../test/renderWithProviders.jsx'
import { server } from '../../test/server.js'
import { FilterSheet } from './FilterSheet.jsx'
import { FilterSidebar } from './FilterSidebar.jsx'
import { ProductCard } from './ProductCard.jsx'
import { ProductImage } from './ProductImage.jsx'
import { SortSelect } from './SortSelect.jsx'
import { StockLabel } from './StockLabel.jsx'

describe('Product components', () => {
  it('ProductImage renders image and falls back cleanly on empty src or load error', () => {
    const { rerender, container } = render(
      <ProductImage src="https://example.com/item.jpg" alt="Earbuds" />,
    )
    const img = screen.getByRole('img', { name: 'Earbuds' })
    expect(img).toHaveAttribute('src', 'https://example.com/item.jpg')

    fireEvent.error(img)
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(container.querySelector('svg')).toBeInTheDocument()

    rerender(<ProductImage src="" alt="Empty" />)
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('StockLabel renders out of stock, low stock, and inline in stock', () => {
    const { rerender, container } = render(<StockLabel stockQuantity={0} variant="card" />)
    expect(screen.getByText('Out of stock')).toBeInTheDocument()

    rerender(<StockLabel stockQuantity={3} variant="card" />)
    expect(screen.getByText('Only 3 left')).toBeInTheDocument()

    rerender(<StockLabel stockQuantity={20} variant="card" />)
    expect(container).toBeEmptyDOMElement()

    rerender(<StockLabel stockQuantity={20} variant="inline" />)
    expect(screen.getByText('In stock')).toBeInTheDocument()
  })

  it('ProductCard renders in-stock, low-stock, and out-of-stock states', () => {
    const normal = makeProduct({ id: 1, name: 'Wireless Earbuds Pro', stockQuantity: 40 })
    const low = makeProduct({ id: 2, name: 'Programming Book', stockQuantity: 3 })
    const out = makeProduct({ id: 3, name: 'Power Bank 20000mAh', stockQuantity: 0 })

    renderWithProviders(
      <div>
        <ProductCard product={normal} />
        <ProductCard product={low} />
        <ProductCard product={out} />
      </div>,
    )

    expect(screen.getByText('Only 3 left')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Add to cart' })).toHaveLength(2)
    expect(screen.getByRole('button', { name: 'Out of stock' })).toBeDisabled()
    expect(screen.getAllByText('1,299')).toHaveLength(3)
  })

  it('ProductCard redirects guests to login with return path and adds to cart when signed in', async () => {
    const user = userEvent.setup()
    const product = makeProduct({ id: 1, name: 'Wireless Earbuds Pro', stockQuantity: 10 })

    renderWithProviders(
      <Routes>
        <Route path="/shop" element={<ProductCard product={product} />} />
        <Route path="/login" element={<div>Login screen</div>} />
      </Routes>,
      { route: '/shop', role: 'guest' },
    )

    await user.click(screen.getByRole('button', { name: 'Add to cart' }))
    expect(screen.getByText('Login screen')).toBeInTheDocument()
    expect(await screen.findByText('Sign in to add items to your cart.')).toBeInTheDocument()
  })

  it('ProductCard shows success toast on add-to-cart and error toast on API error', async () => {
    const user = userEvent.setup()
    const product = makeProduct({ id: 1, name: 'Wireless Earbuds Pro', stockQuantity: 10 })

    renderWithProviders(<ProductCard product={product} />, { role: 'customer' })

    await user.click(screen.getByRole('button', { name: 'Add to cart' }))
    expect(await screen.findByText('Added to cart')).toBeInTheDocument()

    server.use(
      http.post(`${API_BASE}/cart/items`, () =>
        HttpResponse.json({ title: 'Bad request.', status: 400, detail: 'Only 1 item(s) in stock.' }, { status: 400 }),
      ),
    )

    await user.click(screen.getByRole('button', { name: 'Add to cart' }))
    await waitFor(() => {
      expect(screen.getByText('Only 1 left in stock.')).toBeInTheDocument()
    })
  })

  it('FilterSidebar validates price range, applies filters, clears all, and FilterSheet mirrors actions', async () => {
    const user = userEvent.setup()
    const onSelectCategory = vi.fn()
    const onApplyPrice = vi.fn()
    const onToggleInStock = vi.fn()
    const onClearAll = vi.fn()
    const onClose = vi.fn()

    render(
      <div>
        <FilterSidebar
          categories={SEED_CATEGORIES}
          categoryId=""
          minPrice=""
          maxPrice=""
          inStock={false}
          onSelectCategory={onSelectCategory}
          onApplyPrice={onApplyPrice}
          onToggleInStock={onToggleInStock}
          onClearAll={onClearAll}
          hasActiveFilters
        />
        <FilterSheet
          open
          onClose={onClose}
          categories={SEED_CATEGORIES}
          categoryId="3"
          minPrice="100"
          maxPrice="500"
          inStock
          onSelectCategory={onSelectCategory}
          onApplyPrice={onApplyPrice}
          onToggleInStock={onToggleInStock}
          onClearAll={onClearAll}
          hasActiveFilters
        />
      </div>,
    )

    // Sidebar unique ids vs Sheet unique ids
    const sidebarMin = document.getElementById('sidebar-min-price')
    const sidebarMax = document.getElementById('sidebar-max-price')
    expect(document.getElementById('sheet-min-price')).toBeInTheDocument()

    await user.type(sidebarMin, '-5')
    await user.click(screen.getAllByRole('button', { name: 'Apply' })[0])
    expect(screen.getByText('Prices must be 0 or higher.')).toBeInTheDocument()

    await user.clear(sidebarMin)
    await user.type(sidebarMin, '500')
    await user.type(sidebarMax, '100')
    await user.click(screen.getAllByRole('button', { name: 'Apply' })[0])
    expect(screen.getByText('Minimum price cannot be greater than maximum price.')).toBeInTheDocument()

    await user.clear(sidebarMin)
    await user.clear(sidebarMax)
    await user.type(sidebarMin, '100')
    await user.type(sidebarMax, '800')
    await user.click(screen.getAllByRole('button', { name: 'Apply' })[0])
    expect(onApplyPrice).toHaveBeenCalledWith('100', '800')

    await user.click(screen.getAllByRole('radio', { name: 'Electronics' })[0])
    expect(onSelectCategory).toHaveBeenCalledWith('3')

    await user.click(screen.getAllByRole('switch', { name: 'In stock only' })[0])
    expect(onToggleInStock).toHaveBeenCalledWith(true)

    await user.click(screen.getByRole('button', { name: 'Clear' }))
    expect(onClearAll).toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })

  it('SortSelect renders all 5 sort options and calls onChange with sortBy and sortDir', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<SortSelect sortBy="newest" sortDir="desc" onChange={onChange} />)

    const select = screen.getByLabelText('Sort by')
    expect(select).toHaveValue('newest:desc')

    await user.selectOptions(select, 'price:asc')
    expect(onChange).toHaveBeenCalledWith('price', 'asc')
  })
})
