import {
  NETWORK_ERROR_MESSAGE,
  SERVER_ERROR_MESSAGE,
  translateServerMessage,
} from './messages.js'

describe('messages translation table', () => {
  const exactCases = [
    ['Email is already registered.', 'An account with this email already exists.'],
    ['Invalid email or password.', 'Incorrect email or password.'],
    ['Product not found.', 'This product could not be found.'],
    ['This product is not available.', 'This product is no longer available.'],
    ['This product is out of stock.', 'This product is out of stock.'],
    ['Item not found in cart.', 'This item is no longer in your cart.'],
    ['Your cart is empty.', 'Your cart is empty. Add something before checking out.'],
    [
      'Stock changed while placing your order. Please review your cart and try again.',
      'Some items changed while you were checking out. Please review your cart and try again.',
    ],
    ['Order not found.', "We couldn't find this order."],
    [
      'The order was changed by someone else. Please try again.',
      'This order was just updated. Please try again.',
    ],
    ['Category does not exist.', 'The selected category no longer exists.'],
    [
      'RowVersion is required to update a product.',
      'Something went wrong. Reload the product and try again.',
    ],
    [
      'RowVersion is not valid.',
      'Something went wrong. Reload the product and try again.',
    ],
    [
      'This product was changed by someone else. Reload it and try again.',
      'This product was changed by someone else. Reload it and try again.',
    ],
    ['Category not found.', 'This category could not be found.'],
    ['A category with this name already exists.', 'A category with this name already exists.'],
    [
      'Cannot delete a category that still has products.',
      "This category still has products (including inactive ones), so it can't be deleted.",
    ],
    ['Only JPEG, PNG or WebP images are allowed.', 'Only JPEG, PNG or WebP images are allowed.'],
    ['Image must be 2 MB or smaller.', 'Image must be 2 MB or smaller.'],
    ['The image file is empty.', 'The selected file is empty.'],
    ['The file field is required.', 'Please choose an image file.'],
    ['Image not found.', 'This image could not be found.'],
  ]

  it.each(exactCases)('translates "%s"', (raw, expected) => {
    expect(translateServerMessage(raw, 400)).toBe(expected)
  })

  it('translates "Request body too large…" pattern to 2 MB friendly message', () => {
    expect(
      translateServerMessage(
        'Failed to read the request form. Request body too large. The max request body size is 10485760 bytes.',
        400,
      ),
    ).toBe('Image must be 2 MB or smaller.')
  })

  it('translates "Only {n} item(s) in stock."', () => {
    expect(translateServerMessage('Only 3 item(s) in stock.', 400)).toBe('Only 3 left in stock.')
  })

  it('translates unavailable cart product pattern with {name}', () => {
    expect(
      translateServerMessage(
        "'Wireless Mouse' is no longer available. Please remove it from your cart.",
        400,
      ),
    ).toBe('Wireless Mouse is no longer available. Remove it from your cart to continue.')
  })

  it('translates low stock cart pattern with {n} and {name}', () => {
    expect(
      translateServerMessage(
        "Only 2 item(s) left of 'Air Fryer 5L'. Please update your cart.",
        400,
      ),
    ).toBe('Only 2 left of Air Fryer 5L. Update your cart to continue.')
  })

  it('translates non-cancellable order status pattern with {status}', () => {
    expect(
      translateServerMessage("An order with status 'Shipped' cannot be cancelled.", 400),
    ).toBe('This order can no longer be cancelled.')
  })

  it('translates disallowed status transition pattern with {from} and {to}', () => {
    expect(
      translateServerMessage("Cannot change order status from 'Pending' to 'Delivered'.", 400),
    ).toBe("That status change isn't allowed for this order.")
  })

  it('handles network, 5xx, empty, and unknown messages safely', () => {
    expect(NETWORK_ERROR_MESSAGE).toBe(
      "We couldn't reach the server. Check your connection and try again.",
    )
    expect(translateServerMessage('', 500)).toBe(SERVER_ERROR_MESSAGE)
    expect(translateServerMessage('Internal stack trace leak', 503)).toBe(SERVER_ERROR_MESSAGE)
    expect(translateServerMessage('Custom 400 reason', 400)).toBe('Custom 400 reason')
    expect(translateServerMessage('', 400)).toBe('Something went wrong. Please try again.')
  })
})
