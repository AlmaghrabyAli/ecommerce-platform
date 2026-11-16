const EXACT_MESSAGES = {
  'Email is already registered.': 'An account with this email already exists.',
  'Invalid email or password.': 'Incorrect email or password.',
  'Product not found.': 'This product could not be found.',
  'This product is not available.': 'This product is no longer available.',
  'This product is out of stock.': 'This product is out of stock.',
  'Item not found in cart.': 'This item is no longer in your cart.',
  'Your cart is empty.': 'Your cart is empty. Add something before checking out.',
  'Stock changed while placing your order. Please review your cart and try again.':
    'Some items changed while you were checking out. Please review your cart and try again.',
  'Order not found.': "We couldn't find this order.",
  'The order was changed by someone else. Please try again.':
    'This order was just updated. Please try again.',
  'Category does not exist.': 'The selected category no longer exists.',
  'RowVersion is required to update a product.':
    'Something went wrong. Reload the product and try again.',
  'RowVersion is not valid.': 'Something went wrong. Reload the product and try again.',
  'This product was changed by someone else. Reload it and try again.':
    'This product was changed by someone else. Reload it and try again.',
  'Category not found.': 'This category could not be found.',
  'A category with this name already exists.': 'A category with this name already exists.',
  'Cannot delete a category that still has products.':
    "This category still has products (including inactive ones), so it can't be deleted.",
  'Only JPEG, PNG or WebP images are allowed.': 'Only JPEG, PNG or WebP images are allowed.',
  'Image must be 2 MB or smaller.': 'Image must be 2 MB or smaller.',
  'The image file is empty.': 'The selected file is empty.',
  'The file field is required.': 'Please choose an image file.',
  'Image not found.': 'This image could not be found.',
}

const PATTERN_MESSAGES = [
  {
    regex: /Request body too large/i,
    format: () => 'Image must be 2 MB or smaller.',
  },
  {
    regex: /^Only (\d+) item\(s\) in stock\.$/,
    format: (m) => `Only ${m[1]} left in stock.`,
  },
  {
    regex: /^'(.+)' is no longer available\. Please remove it from your cart\.$/,
    format: (m) => `${m[1]} is no longer available. Remove it from your cart to continue.`,
  },
  {
    regex: /^Only (\d+) item\(s\) left of '(.+)'\. Please update your cart\.$/,
    format: (m) => `Only ${m[1]} left of ${m[2]}. Update your cart to continue.`,
  },
  {
    regex: /^An order with status '(.+)' cannot be cancelled\.$/,
    format: () => 'This order can no longer be cancelled.',
  },
  {
    regex: /^Cannot change order status from '(.+)' to '(.+)'\.$/,
    format: () => "That status change isn't allowed for this order.",
  },
]

export const NETWORK_ERROR_MESSAGE =
  "We couldn't reach the server. Check your connection and try again."
export const SERVER_ERROR_MESSAGE = 'Something went wrong on our side. Please try again.'

export function translateServerMessage(raw, status) {
  if (!raw) {
    if (status >= 500) return SERVER_ERROR_MESSAGE
    return 'Something went wrong. Please try again.'
  }

  if (EXACT_MESSAGES[raw]) {
    return EXACT_MESSAGES[raw]
  }

  for (const entry of PATTERN_MESSAGES) {
    const match = raw.match(entry.regex)
    if (match) {
      return entry.format(match)
    }
  }

  if (status >= 500) {
    return SERVER_ERROR_MESSAGE
  }

  return raw
}
