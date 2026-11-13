import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { makeCartItem } from '../../test/fixtures.js'
import { CartRow } from './CartRow.jsx'
import { OrderSummary } from './OrderSummary.jsx'

describe('Cart components', () => {
  it('CartRow renders normal item, stepper updates, remove action, and unavailable warnings', async () => {
    const user = userEvent.setup()
    const onUpdateQuantity = vi.fn()
    const onRemove = vi.fn()

    const normal = makeCartItem({
      productId: 6,
      name: 'Wireless Mouse Ergonomic',
      unitPrice: 449,
      quantity: 2,
      lineTotal: 898,
      stockQuantity: 10,
      isAvailable: true,
    })

    const lowWarning = makeCartItem({
      productId: 10,
      name: 'Electric Kettle 1.7L',
      unitPrice: 549,
      quantity: 5,
      lineTotal: 2745,
      stockQuantity: 2,
      isAvailable: false,
    })

    const deactivated = makeCartItem({
      productId: 4,
      name: 'Power Bank 20000mAh',
      unitPrice: 649,
      quantity: 1,
      lineTotal: 649,
      stockQuantity: 0,
      isAvailable: false,
    })

    render(
      <MemoryRouter>
        <CartRow item={normal} onUpdateQuantity={onUpdateQuantity} onRemove={onRemove} />
        <CartRow item={lowWarning} onUpdateQuantity={onUpdateQuantity} onRemove={onRemove} />
        <CartRow item={deactivated} onUpdateQuantity={onUpdateQuantity} onRemove={onRemove} />
      </MemoryRouter>,
    )

    expect(screen.getByText('EGP 449 each')).toBeInTheDocument()
    expect(screen.getByText('EGP 898')).toBeInTheDocument()
    expect(
      screen.getByText('Only 2 left in stock. Please update the quantity.'),
    ).toBeInTheDocument()
    expect(screen.getByText('This product is no longer available.')).toBeInTheDocument()

    await user.click(screen.getAllByRole('button', { name: 'Increase quantity' })[0])
    expect(onUpdateQuantity).toHaveBeenCalledWith(6, 3)

    await user.click(screen.getByRole('button', { name: 'Remove Wireless Mouse Ergonomic' }))
    expect(onRemove).toHaveBeenCalledWith(6)
  })

  it('OrderSummary renders subtotal, shipping hint, disables checkout when unavailable or empty', async () => {
    const user = userEvent.setup()
    const onCheckout = vi.fn()
    const { rerender } = render(
      <MemoryRouter>
        <OrderSummary subtotal={898} hasUnavailable={false} onCheckout={onCheckout} />
      </MemoryRouter>,
    )

    expect(screen.getByText('EGP 898')).toBeInTheDocument()
    expect(screen.getByText(/EGP 50.*EGP 1,000/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Proceed to checkout' }))
    expect(onCheckout).toHaveBeenCalledTimes(1)

    rerender(
      <MemoryRouter>
        <OrderSummary subtotal={898} hasUnavailable={true} onCheckout={onCheckout} />
      </MemoryRouter>,
    )
    expect(screen.getByRole('button', { name: 'Proceed to checkout' })).toBeDisabled()
    expect(
      screen.getByText('Update or remove unavailable items before checking out.'),
    ).toBeInTheDocument()
  })
})
