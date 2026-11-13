export const API_BASE = 'http://localhost:5062/api'

export const SEED_CATEGORIES = [
  {
    id: 8,
    name: 'Books & Stationery',
    slug: 'books-stationery',
    description: 'Books, notebooks, and office supplies.',
  },
  {
    id: 4,
    name: 'Computers & Accessories',
    slug: 'computers-accessories',
    description: 'Laptops, peripherals, and storage.',
  },
  {
    id: 3,
    name: 'Electronics',
    slug: 'electronics',
    description: 'Phones, audio, and smart gadgets.',
  },
  {
    id: 6,
    name: 'Fashion',
    slug: 'fashion',
    description: 'Clothing, bags, and accessories.',
  },
  {
    id: 5,
    name: 'Home & Kitchen',
    slug: 'home-kitchen',
    description: 'Appliances and everyday home essentials.',
  },
  {
    id: 7,
    name: 'Sports & Outdoors',
    slug: 'sports-outdoors',
    description: 'Gear for training and the outdoors.',
  },
]

const SEED_PRODUCT_DEFS = [
  ['Wireless Earbuds Pro', 3, 1299, 40, 'Bluetooth 5.3 earbuds with noise reduction and a 24-hour charging case.'],
  ['Smart Watch Active', 3, 2499, 25, 'AMOLED fitness smartwatch with heart rate and sleep tracking.'],
  ['Portable Bluetooth Speaker', 3, 899, 60, 'Compact waterproof speaker with 12-hour battery life.'],
  ['Power Bank 20000mAh', 3, 649, 0, 'High-capacity USB-C fast charging portable power bank.'],
  ['Mechanical Keyboard RGB', 4, 1599, 30, 'Tactile mechanical keyboard with customizable RGB backlighting.'],
  ['Wireless Mouse Ergonomic', 4, 449, 80, 'Silent ergonomic mouse with adjustable DPI.'],
  ['USB-C Hub 7-in-1', 4, 799, 45, 'Multiport aluminum USB-C adapter with HDMI and SD card slots.'],
  ['External SSD 1TB', 4, 3299, 15, 'High-speed portable solid state drive with USB 3.2 Gen 2.'],
  ['Air Fryer 5L', 5, 2199, 20, 'Digital 5-liter oil-free air fryer with non-stick basket.'],
  ['Electric Kettle 1.7L', 5, 549, 50, 'Stainless steel cordless kettle with automatic shut-off.'],
  ['Non-Stick Cookware Set', 5, 1899, 12, 'Durable 7-piece aluminum cookware set with glass lids.'],
  ['Vacuum Storage Bags (10 pack)', 5, 199, 150, 'Space-saving reusable vacuum seal bags for clothes and bedding.'],
  ['Classic Cotton T-Shirt', 6, 299, 200, 'Breathable 100% combed cotton crewneck everyday t-shirt.'],
  ['Slim Fit Jeans', 6, 749, 70, 'Stretch-denim slim fit jeans built for all-day comfort.'],
  ['Leather Wallet', 6, 399, 55, 'Slim genuine leather bifold wallet with RFID protection.'],
  ['Canvas Backpack', 6, 899, 35, 'Water-resistant daily backpack with padded 15.6-inch laptop sleeve.'],
  ['Yoga Mat 6mm', 7, 349, 90, 'High-density non-slip exercise mat with carrying strap.'],
  ['Adjustable Dumbbell Set', 7, 2799, 10, 'Space-efficient adjustable weights for full-body home workouts.'],
  ['Insulated Water Bottle 1L', 7, 279, 120, 'Double-wall stainless steel bottle keeps drinks cold for 24 hours.'],
  ['Camping Tent 3-Person', 7, 2399, 8, 'Weather-resistant dome tent with quick two-pole setup.'],
  ['Hardcover Notebook A5', 8, 129, 300, 'Ruled 192-page acid-free hardcover journal with ribbon bookmark.'],
  ['Gel Pens Set (12 colors)', 8, 99, 250, 'Smooth quick-dry 0.5mm gel ink pens in 12 vibrant colors.'],
  ['Desk Organizer Wooden', 8, 349, 40, 'Minimal solid wood caddy for stationery, notes, and gadgets.'],
  ['Programming Fundamentals Book', 8, 459, 3, 'Clear hands-on guide to algorithms, data structures, and clean code.'],
]

export function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function encodeRowVersion(num) {
  const bytes = [0, 0, 0, 0, 0, 0, (num >> 8) & 0xff, num & 0xff]
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary)
}

export function makeUser(overrides = {}) {
  return {
    id: 2,
    fullName: 'Demo Customer',
    email: 'customer@shop.test',
    role: 'Customer',
    ...overrides,
  }
}

export function makeCategory(overrides = {}) {
  const name = overrides.name || 'Electronics'
  return {
    id: 3,
    name,
    slug: overrides.slug || slugify(name),
    description: 'Phones, audio, and smart gadgets.',
    ...overrides,
  }
}

export function makeProduct(overrides = {}) {
  const id = overrides.id ?? 1
  const name = overrides.name || 'Wireless Earbuds Pro'
  const categoryId = overrides.categoryId ?? 3
  const cat = SEED_CATEGORIES.find((c) => c.id === categoryId)
  return {
    id,
    name,
    slug: overrides.slug || slugify(name),
    description: 'Bluetooth 5.3 earbuds with noise reduction and a 24-hour charging case.',
    price: 1299,
    stockQuantity: 40,
    imageUrl: 'https://example.com/images/earbuds.jpg',
    isActive: true,
    categoryId,
    categoryName: overrides.categoryName ?? (cat ? cat.name : 'Electronics'),
    createdAt: '2026-11-10T19:56:05.993',
    rowVersion: encodeRowVersion(id * 100 + 1),
    ...overrides,
  }
}

export const SEED_PRODUCTS = SEED_PRODUCT_DEFS.map(([name, categoryId, price, stockQuantity, description], idx) => {
  const id = idx + 1
  const day = String(1 + Math.floor(idx / 3)).padStart(2, '0')
  const hour = String((8 + idx) % 24).padStart(2, '0')
  return makeProduct({
    id,
    name,
    slug: slugify(name),
    description,
    price,
    stockQuantity,
    imageUrl: `https://example.com/products/${slugify(name)}.jpg`,
    categoryId,
    createdAt: `2026-11-${day}T${hour}:15:00.000`,
    rowVersion: encodeRowVersion(id * 100 + 1),
  })
})

export function makeCartItem(overrides = {}) {
  const unitPrice = overrides.unitPrice ?? 449
  const quantity = overrides.quantity ?? 2
  return {
    productId: 6,
    name: 'Wireless Mouse Ergonomic',
    slug: 'wireless-mouse-ergonomic',
    imageUrl: 'https://example.com/products/wireless-mouse-ergonomic.jpg',
    unitPrice,
    quantity,
    lineTotal: Number((unitPrice * quantity).toFixed(2)),
    stockQuantity: 80,
    isAvailable: true,
    ...overrides,
  }
}

export function makeCart(items = [makeCartItem()], overrides = {}) {
  const itemCount = items.reduce((sum, it) => sum + it.quantity, 0)
  const subtotal = Number(items.reduce((sum, it) => sum + it.lineTotal, 0).toFixed(2))
  return {
    items,
    itemCount,
    subtotal,
    ...overrides,
  }
}

export function makeOrder(overrides = {}) {
  const items = overrides.items || [
    {
      productId: 6,
      productName: 'Wireless Mouse Ergonomic',
      unitPrice: 449,
      quantity: 2,
      lineTotal: 898,
    },
  ]
  const subtotal =
    overrides.subtotal ?? Number(items.reduce((sum, it) => sum + it.lineTotal, 0).toFixed(2))
  const shippingFee = overrides.shippingFee ?? (subtotal < 1000 ? 50 : 0)
  const total = overrides.total ?? Number((subtotal + shippingFee).toFixed(2))

  return {
    id: 7,
    orderNumber: 'ORD-20261112-7LZ7NT',
    status: 'Pending',
    paymentMethod: 'CashOnDelivery',
    paymentStatus: 'Pending',
    subtotal,
    shippingFee,
    total,
    fullName: 'Demo Customer',
    phone: '01012345678',
    addressLine: '14 Tahrir Square',
    city: 'Cairo',
    postalCode: '11511',
    notes: 'Call before delivery',
    createdAt: '2026-11-12T08:05:00.123',
    updatedAt: '2026-11-12T08:05:00.123',
    ...overrides,
    items,
  }
}

export function makeOrderSummary(order = makeOrder()) {
  const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0)
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    paymentMethod: order.paymentMethod,
    total: order.total,
    itemCount,
    createdAt: order.createdAt,
  }
}

export function makeAdminOrder(overrides = {}) {
  const order = makeOrder(overrides.order || {})
  return {
    customerName: 'Demo Customer',
    customerEmail: 'customer@shop.test',
    ...overrides,
    order,
  }
}

export function makeAdminOrderSummary(order = makeOrder(), customer = makeUser()) {
  const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0)
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    total: order.total,
    itemCount,
    createdAt: order.createdAt,
    customerName: customer.fullName,
    customerEmail: customer.email,
  }
}

export function makeStats(overrides = {}) {
  return {
    totalOrders: 6,
    revenue: 3746,
    ordersByStatus: {
      Pending: 1,
      Confirmed: 1,
      Shipped: 1,
      Delivered: 2,
      Cancelled: 1,
    },
    lowStockProducts: [
      { id: 4, name: 'Power Bank 20000mAh', slug: 'power-bank-20000mah', stockQuantity: 0 },
      {
        id: 24,
        name: 'Programming Fundamentals Book',
        slug: 'programming-fundamentals-book',
        stockQuantity: 3,
      },
    ],
    topProducts: [
      { productId: 6, productName: 'Wireless Mouse Ergonomic', quantitySold: 2, revenue: 898 },
      { productId: 1, productName: 'Wireless Earbuds Pro', quantitySold: 1, revenue: 1299 },
    ],
    ...overrides,
  }
}

export function makePagedResult(items, overrides = {}) {
  const pageSize = overrides.pageSize ?? 12
  const totalCount = overrides.totalCount ?? items.length
  return {
    items,
    page: 1,
    pageSize,
    totalCount,
    totalPages: Math.ceil(totalCount / pageSize),
    ...overrides,
  }
}
