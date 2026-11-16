import { HttpResponse, http } from 'msw'
import {
  API_BASE,
  SEED_CATEGORIES,
  SEED_PRODUCTS,
  encodeRowVersion,
  makeAdminOrderSummary,
  makeOrder,
  makeOrderSummary,
  makeUser,
  slugify,
} from './fixtures.js'

const ORDER_STATUS_LIST = ['Pending', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled']
const ALLOWED_TRANSITIONS = {
  Pending: ['Confirmed', 'Cancelled'],
  Confirmed: ['Shipped', 'Cancelled'],
  Shipped: ['Delivered'],
  Delivered: [],
  Cancelled: [],
}

function businessProblem(status, detail) {
  const titleMap = {
    400: 'Bad request.',
    404: 'Resource not found.',
    409: 'Conflict.',
  }
  return HttpResponse.json(
    {
      title: titleMap[status] || 'Error.',
      status,
      detail,
    },
    { status },
  )
}

function validationProblem(errors) {
  return HttpResponse.json(
    {
      type: 'https://tools.ietf.org/html/rfc9110#section-15.5.1',
      title: 'One or more validation errors occurred.',
      status: 400,
      errors,
    },
    { status: 400 },
  )
}

function authProblem(status, title) {
  return HttpResponse.json(
    {
      title,
      status,
    },
    { status },
  )
}

function formatUtcNoZ(date) {
  return date.toISOString().replace(/Z$/, '')
}

function cloneInitialState() {
  const users = [
    makeUser({ id: 1, fullName: 'Store Admin', email: 'admin@shop.test', role: 'Admin' }),
    makeUser({ id: 2, fullName: 'Demo Customer', email: 'customer@shop.test', role: 'Customer' }),
    makeUser({ id: 3, fullName: 'Sara Ali', email: 'sara@example.com', role: 'Customer' }),
  ]

  const passwords = new Map([
    [1, 'Admin@12345'],
    [2, 'Customer@12345'],
    [3, 'Password@123'],
  ])

  const categories = SEED_CATEGORIES.map((c) => ({ ...c }))
  const products = SEED_PRODUCTS.map((p, i) => ({
    ...p,
    versionCounter: 1,
    rowVersion: encodeRowVersion((i + 1) * 100 + 1),
  }))

  const orders = [
    {
      ...makeOrder({
        id: 1,
        orderNumber: 'ORD-20261108-A4K9MP',
        status: 'Delivered',
        paymentMethod: 'CashOnDelivery',
        paymentStatus: 'Paid',
        subtotal: 1299,
        shippingFee: 0,
        total: 1299,
        createdAt: '2026-11-08T11:20:00.120',
        updatedAt: '2026-11-10T15:40:00.450',
        items: [
          {
            productId: 1,
            productName: 'Wireless Earbuds Pro',
            unitPrice: 1299,
            quantity: 1,
            lineTotal: 1299,
          },
        ],
      }),
      userId: 2,
    },
    {
      ...makeOrder({
        id: 2,
        orderNumber: 'ORD-20261110-B7N2QR',
        status: 'Shipped',
        paymentMethod: 'MockCard',
        paymentStatus: 'Paid',
        subtotal: 898,
        shippingFee: 50,
        total: 948,
        createdAt: '2026-11-10T14:10:00.250',
        updatedAt: '2026-11-11T09:15:00.100',
        items: [
          {
            productId: 6,
            productName: 'Wireless Mouse Ergonomic',
            unitPrice: 449,
            quantity: 2,
            lineTotal: 898,
          },
        ],
      }),
      userId: 2,
    },
    {
      ...makeOrder({
        id: 3,
        orderNumber: 'ORD-20261111-C8W3TV',
        status: 'Pending',
        paymentMethod: 'CashOnDelivery',
        paymentStatus: 'Pending',
        subtotal: 549,
        shippingFee: 50,
        total: 599,
        createdAt: '2026-11-11T16:30:00.510',
        updatedAt: '2026-11-11T16:30:00.510',
        items: [
          {
            productId: 10,
            productName: 'Electric Kettle 1.7L',
            unitPrice: 549,
            quantity: 1,
            lineTotal: 549,
          },
        ],
      }),
      userId: 2,
    },
    {
      ...makeOrder({
        id: 4,
        orderNumber: 'ORD-20261111-D2X5YZ',
        status: 'Confirmed',
        paymentMethod: 'MockCard',
        paymentStatus: 'Paid',
        fullName: 'Sara Ali',
        phone: '01098765432',
        addressLine: '12 El Nasr Street',
        city: 'Shibin El Kom',
        postalCode: '32511',
        subtotal: 1599,
        shippingFee: 0,
        total: 1599,
        createdAt: '2026-11-11T18:05:00.000',
        updatedAt: '2026-11-12T08:00:00.000',
        items: [
          {
            productId: 5,
            productName: 'Mechanical Keyboard RGB',
            unitPrice: 1599,
            quantity: 1,
            lineTotal: 1599,
          },
        ],
      }),
      userId: 3,
    },
    {
      ...makeOrder({
        id: 5,
        orderNumber: 'ORD-20261109-E9P6KL',
        status: 'Cancelled',
        paymentMethod: 'CashOnDelivery',
        paymentStatus: 'Pending',
        fullName: 'Sara Ali',
        phone: '01098765432',
        addressLine: '12 El Nasr Street',
        city: 'Shibin El Kom',
        subtotal: 749,
        shippingFee: 50,
        total: 799,
        createdAt: '2026-11-09T10:00:00.000',
        updatedAt: '2026-11-09T12:00:00.000',
        items: [
          {
            productId: 14,
            productName: 'Slim Fit Jeans',
            unitPrice: 749,
            quantity: 1,
            lineTotal: 749,
          },
        ],
      }),
      userId: 3,
    },
  ]

  return {
    users,
    passwords,
    categories,
    products,
    orders,
    carts: new Map(),
    invalidatedTokens: new Set(),
    forceCheckoutConflict: false,
    images: [],
    nextUserId: 4,
    nextCategoryId: 9,
    nextProductId: 25,
    nextOrderId: 6,
    nextImageId: 1,
  }
}

let db = cloneInitialState()

export const testBackend = {
  reset() {
    db = cloneInitialState()
  },
  getDb() {
    return db
  },
  forceConflictOnNextCheckout() {
    db.forceCheckoutConflict = true
  },
  expireToken(token) {
    db.invalidatedTokens.add(token)
  },
  setStock(productId, quantity) {
    const p = db.products.find((item) => item.id === Number(productId))
    if (!p) return
    p.stockQuantity = Math.max(0, Number(quantity))
    p.versionCounter += 1
    p.rowVersion = encodeRowVersion(p.id * 100 + p.versionCounter)
  },
  bumpProductVersion(productId) {
    const p = db.products.find((item) => item.id === Number(productId))
    if (!p) return
    p.versionCounter += 1
    p.rowVersion = encodeRowVersion(p.id * 100 + p.versionCounter)
  },
}

function tokenForUser(user) {
  return `test-token-user-${user.id}`
}

function getCurrentUser(request) {
  const header = request.headers.get('authorization') || ''
  if (!header.startsWith('Bearer ')) return null
  const token = header.slice(7).trim()
  if (!token || db.invalidatedTokens.has(token)) return null
  if (token === 'test-token-admin') return db.users.find((u) => u.role === 'Admin') || null
  if (token === 'test-token-customer') return db.users.find((u) => u.id === 2) || null
  const match = token.match(/^test-token-user-(\d+)$/)
  if (!match) return null
  return db.users.find((u) => u.id === Number(match[1])) || null
}

function serializeProduct(p) {
  const cat = db.categories.find((c) => c.id === p.categoryId)
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    description: p.description,
    price: Number(p.price),
    stockQuantity: p.stockQuantity,
    imageUrl: p.imageUrl || '',
    isActive: p.isActive,
    categoryId: p.categoryId,
    categoryName: cat ? cat.name : '',
    createdAt: p.createdAt,
    rowVersion: p.rowVersion,
  }
}

function serializeCart(userId) {
  const rows = db.carts.get(userId) || []
  let itemCount = 0
  let subtotal = 0
  const items = rows
    .map((row) => {
      const product = db.products.find((p) => p.id === row.productId)
      if (!product) return null
      const lineTotal = Number((product.price * row.quantity).toFixed(2))
      itemCount += row.quantity
      subtotal += lineTotal
      return {
        productId: product.id,
        name: product.name,
        slug: product.slug,
        imageUrl: product.imageUrl || '',
        unitPrice: Number(product.price),
        quantity: row.quantity,
        lineTotal,
        stockQuantity: product.stockQuantity,
        isAvailable: Boolean(product.isActive && product.stockQuantity >= row.quantity),
      }
    })
    .filter(Boolean)

  return {
    items,
    itemCount,
    subtotal: Number(subtotal.toFixed(2)),
  }
}

function publicOrder(order) {
  const { userId: _userId, ...rest } = order
  return {
    ...rest,
    items: rest.items.map((it) => ({ ...it })),
  }
}

function queryProducts(url, includeInactive) {
  const sp = url.searchParams
  const search = sp.get('search') || ''
  const categoryId = sp.get('categoryId') || ''
  const minPrice = sp.get('minPrice') || ''
  const maxPrice = sp.get('maxPrice') || ''
  const inStock = sp.get('inStock') || ''
  const rawSortBy = (sp.get('sortBy') || '').toLowerCase()
  const sortBy = rawSortBy === 'price' || rawSortBy === 'name' ? rawSortBy : 'newest'
  const rawSortDir = (sp.get('sortDir') || '').toLowerCase()
  const sortDir =
    rawSortDir === 'asc' || rawSortDir === 'desc'
      ? rawSortDir
      : sortBy === 'newest'
        ? 'desc'
        : 'asc'

  if (minPrice && Number.isNaN(Number(minPrice))) {
    return validationProblem({ MinPrice: [`The value '${minPrice}' is not valid for MinPrice.`] })
  }
  if (maxPrice && Number.isNaN(Number(maxPrice))) {
    return validationProblem({ MaxPrice: [`The value '${maxPrice}' is not valid for MaxPrice.`] })
  }

  let list = db.products.filter((p) => (includeInactive ? true : p.isActive))
  if (search.trim()) {
    const q = search.trim().toLowerCase()
    list = list.filter((p) => p.name.toLowerCase().includes(q))
  }
  if (categoryId) {
    list = list.filter((p) => p.categoryId === Number(categoryId))
  }
  if (minPrice) {
    list = list.filter((p) => p.price >= Number(minPrice))
  }
  if (maxPrice) {
    list = list.filter((p) => p.price <= Number(maxPrice))
  }
  if (inStock.toLowerCase() === 'true') {
    list = list.filter((p) => p.stockQuantity > 0)
  }

  const mult = sortDir === 'asc' ? 1 : -1
  list.sort((a, b) => {
    let cmp = 0
    if (sortBy === 'price') cmp = a.price - b.price
    else if (sortBy === 'name') cmp = a.name.localeCompare(b.name)
    else cmp = a.createdAt.localeCompare(b.createdAt)
    if (cmp !== 0) return cmp * mult
    return a.id - b.id
  })

  let page = Number.parseInt(sp.get('page') || '1', 10)
  if (Number.isNaN(page) || page < 1) page = 1
  let pageSize = Number.parseInt(sp.get('pageSize') || '12', 10)
  if (Number.isNaN(pageSize)) pageSize = 12
  pageSize = Math.max(1, Math.min(50, pageSize))

  const totalCount = list.length
  const totalPages = Math.ceil(totalCount / pageSize)
  const start = (page - 1) * pageSize
  const items = list.slice(start, start + pageSize).map(serializeProduct)

  return HttpResponse.json({
    items,
    page,
    pageSize,
    totalCount,
    totalPages,
  })
}

export const handlers = [
  // Auth
  http.post(`${API_BASE}/auth/login`, async ({ request }) => {
    const body = await request.json()
    const email = String(body?.email || '').trim().toLowerCase()
    const password = String(body?.password || '')

    if (!email || !email.includes('@')) {
      return validationProblem({ Email: ['The Email field is not a valid e-mail address.'] })
    }
    if (!password) {
      return validationProblem({ Password: ['The Password field is required.'] })
    }

    const user = db.users.find((u) => u.email.toLowerCase() === email)
    if (!user || db.passwords.get(user.id) !== password) {
      return authProblem(401, 'Invalid email or password.')
    }

    return HttpResponse.json({
      token: tokenForUser(user),
      expiresAtUtc: '2099-01-01T00:00:00Z',
      user: { ...user },
    })
  }),

  http.post(`${API_BASE}/auth/register`, async ({ request }) => {
    const body = await request.json()
    const fullName = String(body?.fullName || '').trim()
    const email = String(body?.email || '').trim().toLowerCase()
    const password = String(body?.password || '')
    const errors = {}

    if (fullName.length < 2 || fullName.length > 100) {
      errors.FullName = [
        'The field FullName must be a string with a minimum length of 2 and a maximum length of 100.',
      ]
    }
    if (!email || !email.includes('@')) {
      errors.Email = ['The Email field is not a valid e-mail address.']
    }
    if (password.length < 8 || password.length > 100) {
      errors.Password = [
        'The field Password must be a string with a minimum length of 8 and a maximum length of 100.',
      ]
    }
    if (Object.keys(errors).length > 0) return validationProblem(errors)

    if (db.users.some((u) => u.email.toLowerCase() === email)) {
      return authProblem(409, 'Email is already registered.')
    }

    const user = {
      id: db.nextUserId++,
      fullName,
      email,
      role: 'Customer',
    }
    db.users.push(user)
    db.passwords.set(user.id, password)

    return HttpResponse.json({
      token: tokenForUser(user),
      expiresAtUtc: '2099-01-01T00:00:00Z',
      user,
    })
  }),

  http.get(`${API_BASE}/auth/me`, ({ request }) => {
    const user = getCurrentUser(request)
    if (!user) return new HttpResponse(null, { status: 401 })
    return HttpResponse.json(user)
  }),

  // Public Catalog
  http.get(`${API_BASE}/categories`, () => {
    const sorted = [...db.categories].sort((a, b) => a.name.localeCompare(b.name))
    return HttpResponse.json(sorted)
  }),

  http.get(`${API_BASE}/products`, ({ request }) => {
    return queryProducts(new URL(request.url), false)
  }),

  http.get(`${API_BASE}/products/:slug`, ({ params }) => {
    const product = db.products.find((p) => p.slug === params.slug && p.isActive)
    if (!product) return businessProblem(404, 'Product not found.')
    return HttpResponse.json(serializeProduct(product))
  }),

  // Cart
  http.get(`${API_BASE}/cart`, ({ request }) => {
    const user = getCurrentUser(request)
    if (!user) return new HttpResponse(null, { status: 401 })
    return HttpResponse.json(serializeCart(user.id))
  }),

  http.post(`${API_BASE}/cart/items`, async ({ request }) => {
    const user = getCurrentUser(request)
    if (!user) return new HttpResponse(null, { status: 401 })
    const body = await request.json()
    const productId = Number(body?.productId)
    const quantity = Number(body?.quantity)
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 1000) {
      return validationProblem({ Quantity: ['The field Quantity must be between 1 and 1000.'] })
    }
    const product = db.products.find((p) => p.id === productId)
    if (!product) return businessProblem(404, 'Product not found.')
    if (!product.isActive) return businessProblem(400, 'This product is not available.')
    if (product.stockQuantity === 0) return businessProblem(400, 'This product is out of stock.')

    const rows = db.carts.get(user.id) || []
    const existing = rows.find((r) => r.productId === productId)
    const nextQty = (existing ? existing.quantity : 0) + quantity
    if (nextQty > product.stockQuantity) {
      return businessProblem(400, `Only ${product.stockQuantity} item(s) in stock.`)
    }
    if (existing) existing.quantity = nextQty
    else rows.push({ productId, quantity })
    db.carts.set(user.id, rows)
    return HttpResponse.json(serializeCart(user.id))
  }),

  http.put(`${API_BASE}/cart/items/:productId`, async ({ request, params }) => {
    const user = getCurrentUser(request)
    if (!user) return new HttpResponse(null, { status: 401 })
    const productId = Number(params.productId)
    const body = await request.json()
    const quantity = Number(body?.quantity)
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 1000) {
      return validationProblem({ Quantity: ['The field Quantity must be between 1 and 1000.'] })
    }

    const rows = db.carts.get(user.id) || []
    const existing = rows.find((r) => r.productId === productId)
    if (!existing) return businessProblem(404, 'Item not found in cart.')
    const product = db.products.find((p) => p.id === productId)
    if (!product || !product.isActive) {
      return businessProblem(400, 'This product is not available.')
    }
    if (quantity > product.stockQuantity) {
      return businessProblem(400, `Only ${product.stockQuantity} item(s) in stock.`)
    }
    existing.quantity = quantity
    return HttpResponse.json(serializeCart(user.id))
  }),

  http.delete(`${API_BASE}/cart/items/:productId`, ({ request, params }) => {
    const user = getCurrentUser(request)
    if (!user) return new HttpResponse(null, { status: 401 })
    const productId = Number(params.productId)
    const rows = db.carts.get(user.id) || []
    const idx = rows.findIndex((r) => r.productId === productId)
    if (idx === -1) return businessProblem(404, 'Item not found in cart.')
    rows.splice(idx, 1)
    return HttpResponse.json(serializeCart(user.id))
  }),

  http.delete(`${API_BASE}/cart`, ({ request }) => {
    const user = getCurrentUser(request)
    if (!user) return new HttpResponse(null, { status: 401 })
    db.carts.set(user.id, [])
    return new HttpResponse(null, { status: 204 })
  }),

  // Orders
  http.post(`${API_BASE}/orders`, async ({ request }) => {
    const user = getCurrentUser(request)
    if (!user) return new HttpResponse(null, { status: 401 })

    if (db.forceCheckoutConflict) {
      db.forceCheckoutConflict = false
      return businessProblem(
        409,
        'Stock changed while placing your order. Please review your cart and try again.',
      )
    }

    const body = await request.json()
    const fullName = String(body?.fullName || '').trim()
    const phone = String(body?.phone || '').trim()
    const addressLine = String(body?.addressLine || '').trim()
    const city = String(body?.city || '').trim()

    const errors = {}
    if (!fullName) errors.FullName = ['The FullName field is required.']
    if (!phone || phone.length < 7 || phone.length > 20) {
      errors.Phone = ['The field Phone must be a string with a minimum length of 7 and a maximum length of 20.']
    }
    if (!addressLine || addressLine.length < 5) {
      errors.AddressLine = [
        'The field AddressLine must be a string with a minimum length of 5 and a maximum length of 200.',
      ]
    }
    if (!city || city.length < 2) {
      errors.City = [
        'The field City must be a string with a minimum length of 2 and a maximum length of 100.',
      ]
    }
    if (Object.keys(errors).length > 0) return validationProblem(errors)

    const rows = db.carts.get(user.id) || []
    if (rows.length === 0) return businessProblem(400, 'Your cart is empty.')

    for (const row of rows) {
      const product = db.products.find((p) => p.id === row.productId)
      if (!product || !product.isActive) {
        return businessProblem(
          400,
          `'${product?.name || 'Item'}' is no longer available. Please remove it from your cart.`,
        )
      }
      if (product.stockQuantity < row.quantity) {
        return businessProblem(
          400,
          `Only ${product.stockQuantity} item(s) left of '${product.name}'. Please update your cart.`,
        )
      }
    }

    let subtotal = 0
    const items = rows.map((row) => {
      const product = db.products.find((p) => p.id === row.productId)
      product.stockQuantity -= row.quantity
      product.versionCounter += 1
      product.rowVersion = encodeRowVersion(product.id * 100 + product.versionCounter)
      const lineTotal = Number((product.price * row.quantity).toFixed(2))
      subtotal += lineTotal
      return {
        productId: product.id,
        productName: product.name,
        unitPrice: product.price,
        quantity: row.quantity,
        lineTotal,
      }
    })

    subtotal = Number(subtotal.toFixed(2))
    const shippingFee = subtotal < 1000 ? 50 : 0
    const total = Number((subtotal + shippingFee).toFixed(2))
    const paymentMethod = body.paymentMethod === 'MockCard' ? 'MockCard' : 'CashOnDelivery'
    const paymentStatus = paymentMethod === 'MockCard' ? 'Paid' : 'Pending'
    const now = formatUtcNoZ(new Date())

    const id = db.nextOrderId++
    const order = {
      id,
      userId: user.id,
      orderNumber: `ORD-20261113-${String(id).padStart(6, 'A')}`,
      status: 'Pending',
      paymentMethod,
      paymentStatus,
      subtotal,
      shippingFee,
      total,
      fullName,
      phone,
      addressLine,
      city,
      postalCode: body?.postalCode?.trim() || null,
      notes: body?.notes?.trim() || null,
      createdAt: now,
      updatedAt: now,
      items,
    }

    db.orders.push(order)
    db.carts.set(user.id, [])
    return HttpResponse.json(publicOrder(order), { status: 201 })
  }),

  http.get(`${API_BASE}/orders`, ({ request }) => {
    const user = getCurrentUser(request)
    if (!user) return new HttpResponse(null, { status: 401 })
    const own = db.orders
      .filter((o) => o.userId === user.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id - a.id)
      .map(makeOrderSummary)
    return HttpResponse.json(own)
  }),

  http.get(`${API_BASE}/orders/:id`, ({ request, params }) => {
    const user = getCurrentUser(request)
    if (!user) return new HttpResponse(null, { status: 401 })
    const order = db.orders.find((o) => o.id === Number(params.id) && o.userId === user.id)
    if (!order) return businessProblem(404, 'Order not found.')
    return HttpResponse.json(publicOrder(order))
  }),

  http.post(`${API_BASE}/orders/:id/cancel`, ({ request, params }) => {
    const user = getCurrentUser(request)
    if (!user) return new HttpResponse(null, { status: 401 })
    const order = db.orders.find((o) => o.id === Number(params.id) && o.userId === user.id)
    if (!order) return businessProblem(404, 'Order not found.')
    if (order.status !== 'Pending' && order.status !== 'Confirmed') {
      return businessProblem(400, `An order with status '${order.status}' cannot be cancelled.`)
    }
    order.status = 'Cancelled'
    order.updatedAt = formatUtcNoZ(new Date())
    for (const item of order.items) {
      const product = db.products.find((p) => p.id === item.productId)
      if (product) {
        product.stockQuantity += item.quantity
        product.versionCounter += 1
        product.rowVersion = encodeRowVersion(product.id * 100 + product.versionCounter)
      }
    }
    return HttpResponse.json(publicOrder(order))
  }),

  // Admin Products
  http.get(`${API_BASE}/admin/products`, ({ request }) => {
    const user = getCurrentUser(request)
    if (!user) return new HttpResponse(null, { status: 401 })
    if (user.role !== 'Admin') return new HttpResponse(null, { status: 403 })
    return queryProducts(new URL(request.url), true)
  }),

  http.get(`${API_BASE}/admin/products/:id`, ({ request, params }) => {
    const user = getCurrentUser(request)
    if (!user) return new HttpResponse(null, { status: 401 })
    if (user.role !== 'Admin') return new HttpResponse(null, { status: 403 })
    const product = db.products.find((p) => p.id === Number(params.id))
    if (!product) return businessProblem(404, 'Product not found.')
    return HttpResponse.json(serializeProduct(product))
  }),

  http.post(`${API_BASE}/admin/products`, async ({ request }) => {
    const user = getCurrentUser(request)
    if (!user) return new HttpResponse(null, { status: 401 })
    if (user.role !== 'Admin') return new HttpResponse(null, { status: 403 })

    const body = await request.json()
    const catId = Number(body?.categoryId)
    if (!db.categories.some((c) => c.id === catId)) {
      return businessProblem(400, 'Category does not exist.')
    }

    const baseSlug = slugify(body.name) || 'product'
    let slug = baseSlug
    let suffix = 2
    while (db.products.some((p) => p.slug === slug)) {
      slug = `${baseSlug}-${suffix++}`
    }

    const id = db.nextProductId++
    const product = {
      id,
      name: String(body.name).trim(),
      slug,
      description: String(body.description).trim(),
      price: Number(body.price),
      stockQuantity: Number(body.stockQuantity),
      imageUrl: body.imageUrl?.trim() || '',
      isActive: body.isActive ?? true,
      categoryId: catId,
      createdAt: formatUtcNoZ(new Date()),
      versionCounter: 1,
      rowVersion: encodeRowVersion(id * 100 + 1),
    }
    db.products.push(product)
    return HttpResponse.json(serializeProduct(product), { status: 201 })
  }),

  http.put(`${API_BASE}/admin/products/:id`, async ({ request, params }) => {
    const user = getCurrentUser(request)
    if (!user) return new HttpResponse(null, { status: 401 })
    if (user.role !== 'Admin') return new HttpResponse(null, { status: 403 })

    const product = db.products.find((p) => p.id === Number(params.id))
    if (!product) return businessProblem(404, 'Product not found.')

    const body = await request.json()
    if (!body?.rowVersion) {
      return businessProblem(400, 'RowVersion is required to update a product.')
    }
    if (body.rowVersion !== product.rowVersion) {
      return businessProblem(409, 'This product was changed by someone else. Reload it and try again.')
    }

    const catId = Number(body.categoryId)
    if (!db.categories.some((c) => c.id === catId)) {
      return businessProblem(400, 'Category does not exist.')
    }

    product.name = String(body.name).trim()
    product.description = String(body.description).trim()
    product.price = Number(body.price)
    product.stockQuantity = Number(body.stockQuantity)
    product.imageUrl = body.imageUrl?.trim() || ''
    product.categoryId = catId
    product.isActive = Boolean(body.isActive)
    product.versionCounter += 1
    product.rowVersion = encodeRowVersion(product.id * 100 + product.versionCounter)
    return HttpResponse.json(serializeProduct(product))
  }),

  http.delete(`${API_BASE}/admin/products/:id`, ({ request, params }) => {
    const user = getCurrentUser(request)
    if (!user) return new HttpResponse(null, { status: 401 })
    if (user.role !== 'Admin') return new HttpResponse(null, { status: 403 })
    const productIndex = db.products.findIndex((p) => p.id === Number(params.id))
    if (productIndex === -1) return businessProblem(404, 'Product not found.')
    const product = db.products[productIndex]

    const hasActiveOrders = db.orders.some((o) =>
      o.status !== 'Cancelled' && o.items.some((item) => item.productId === product.id),
    )
    if (hasActiveOrders) {
      return businessProblem(
        409,
        'Cannot delete a product that has active orders. Cancel the orders first or deactivate it.',
      )
    }

    // Clean up items from cancelled orders
    for (const order of db.orders) {
      if (order.status === 'Cancelled') {
        order.items = order.items.filter((item) => item.productId !== product.id)
      }
    }

    db.products.splice(productIndex, 1)
    return new HttpResponse(null, { status: 204 })
  }),

  // Admin Categories
  http.post(`${API_BASE}/admin/categories`, async ({ request }) => {
    const user = getCurrentUser(request)
    if (!user) return new HttpResponse(null, { status: 401 })
    if (user.role !== 'Admin') return new HttpResponse(null, { status: 403 })
    const body = await request.json()
    const name = String(body?.name || '').trim()
    if (db.categories.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
      return businessProblem(409, 'A category with this name already exists.')
    }
    const category = {
      id: db.nextCategoryId++,
      name,
      slug: slugify(name),
      description: body?.description?.trim() || null,
    }
    db.categories.push(category)
    return HttpResponse.json(category, { status: 201 })
  }),

  http.put(`${API_BASE}/admin/categories/:id`, async ({ request, params }) => {
    const user = getCurrentUser(request)
    if (!user) return new HttpResponse(null, { status: 401 })
    if (user.role !== 'Admin') return new HttpResponse(null, { status: 403 })
    const id = Number(params.id)
    const category = db.categories.find((c) => c.id === id)
    if (!category) return businessProblem(404, 'Category not found.')
    const body = await request.json()
    const name = String(body?.name || '').trim()
    if (db.categories.some((c) => c.id !== id && c.name.toLowerCase() === name.toLowerCase())) {
      return businessProblem(409, 'A category with this name already exists.')
    }
    category.name = name
    category.description = body?.description?.trim() || null
    return HttpResponse.json(category)
  }),

  http.delete(`${API_BASE}/admin/categories/:id`, ({ request, params }) => {
    const user = getCurrentUser(request)
    if (!user) return new HttpResponse(null, { status: 401 })
    if (user.role !== 'Admin') return new HttpResponse(null, { status: 403 })
    const id = Number(params.id)
    const idx = db.categories.findIndex((c) => c.id === id)
    if (idx === -1) return businessProblem(404, 'Category not found.')
    if (db.products.some((p) => p.categoryId === id)) {
      return businessProblem(409, 'Cannot delete a category that still has products.')
    }
    db.categories.splice(idx, 1)
    return new HttpResponse(null, { status: 204 })
  }),

  // Admin Orders
  http.get(`${API_BASE}/admin/orders`, ({ request }) => {
    const user = getCurrentUser(request)
    if (!user) return new HttpResponse(null, { status: 401 })
    if (user.role !== 'Admin') return new HttpResponse(null, { status: 403 })

    const url = new URL(request.url)
    const status = url.searchParams.get('status') || ''
    let list = [...db.orders]
    if (status) {
      const matched = ORDER_STATUS_LIST.find((s) => s.toLowerCase() === status.toLowerCase())
      if (!matched) {
        return validationProblem({ status: [`The value '${status}' is not valid.`] })
      }
      list = list.filter((o) => o.status === matched)
    }

    list.sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id - a.id)
    let page = Number.parseInt(url.searchParams.get('page') || '1', 10)
    if (Number.isNaN(page) || page < 1) page = 1
    let pageSize = Number.parseInt(url.searchParams.get('pageSize') || '20', 10)
    if (Number.isNaN(pageSize)) pageSize = 20
    pageSize = Math.max(1, Math.min(50, pageSize))

    const totalCount = list.length
    const totalPages = Math.ceil(totalCount / pageSize)
    const start = (page - 1) * pageSize
    const items = list.slice(start, start + pageSize).map((o) => {
      const cust = db.users.find((u) => u.id === o.userId) || {
        fullName: o.fullName,
        email: '',
      }
      return makeAdminOrderSummary(o, cust)
    })

    return HttpResponse.json({
      items,
      page,
      pageSize,
      totalCount,
      totalPages,
    })
  }),

  http.get(`${API_BASE}/admin/orders/:id`, ({ request, params }) => {
    const user = getCurrentUser(request)
    if (!user) return new HttpResponse(null, { status: 401 })
    if (user.role !== 'Admin') return new HttpResponse(null, { status: 403 })

    const order = db.orders.find((o) => o.id === Number(params.id))
    if (!order) return businessProblem(404, 'Order not found.')
    const cust = db.users.find((u) => u.id === order.userId)
    return HttpResponse.json({
      customerName: cust ? cust.fullName : order.fullName,
      customerEmail: cust ? cust.email : '',
      order: publicOrder(order),
    })
  }),

  http.put(`${API_BASE}/admin/orders/:id/status`, async ({ request, params }) => {
    const user = getCurrentUser(request)
    if (!user) return new HttpResponse(null, { status: 401 })
    if (user.role !== 'Admin') return new HttpResponse(null, { status: 403 })

    const order = db.orders.find((o) => o.id === Number(params.id))
    if (!order) return businessProblem(404, 'Order not found.')

    const body = await request.json()
    const targetRaw = body?.status
    const targetStatus = ORDER_STATUS_LIST.find(
      (s) => s.toLowerCase() === String(targetRaw || '').toLowerCase(),
    )
    if (!targetStatus) {
      return validationProblem({ status: [`The value '${targetRaw || ''}' is not valid.`] })
    }
    if (targetStatus === 'Cancelled' && order.status !== 'Pending' && order.status !== 'Confirmed') {
      return businessProblem(400, `An order with status '${order.status}' cannot be cancelled.`)
    }
    const allowed = ALLOWED_TRANSITIONS[order.status] || []
    if (!allowed.includes(targetStatus)) {
      return businessProblem(
        400,
        `Cannot change order status from '${order.status}' to '${targetStatus}'.`,
      )
    }

    order.status = targetStatus
    order.updatedAt = formatUtcNoZ(new Date())
    if (targetStatus === 'Delivered' && order.paymentMethod === 'CashOnDelivery') {
      order.paymentStatus = 'Paid'
    }
    if (targetStatus === 'Cancelled') {
      for (const item of order.items) {
        const product = db.products.find((p) => p.id === item.productId)
        if (product) {
          product.stockQuantity += item.quantity
          product.versionCounter += 1
          product.rowVersion = encodeRowVersion(product.id * 100 + product.versionCounter)
        }
      }
    }

    const cust = db.users.find((u) => u.id === order.userId)
    return HttpResponse.json({
      customerName: cust ? cust.fullName : order.fullName,
      customerEmail: cust ? cust.email : '',
      order: publicOrder(order),
    })
  }),

  // Admin Stats
  http.get(`${API_BASE}/admin/stats`, ({ request }) => {
    const user = getCurrentUser(request)
    if (!user) return new HttpResponse(null, { status: 401 })
    if (user.role !== 'Admin') return new HttpResponse(null, { status: 403 })

    const ordersByStatus = {
      Pending: 0,
      Confirmed: 0,
      Shipped: 0,
      Delivered: 0,
      Cancelled: 0,
    }
    let revenue = 0
    const agg = new Map()

    for (const order of db.orders) {
      if (ordersByStatus[order.status] !== undefined) {
        ordersByStatus[order.status] += 1
      }
      if (order.status !== 'Cancelled') {
        revenue += order.total
        for (const item of order.items) {
          const existing = agg.get(item.productId) || {
            productId: item.productId,
            productName: item.productName,
            quantitySold: 0,
            revenue: 0,
          }
          existing.quantitySold += item.quantity
          existing.revenue += item.lineTotal
          agg.set(item.productId, existing)
        }
      }
    }

    const lowStockProducts = db.products
      .filter((p) => p.isActive && p.stockQuantity <= 5)
      .sort((a, b) => a.stockQuantity - b.stockQuantity || a.id - b.id)
      .slice(0, 10)
      .map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        stockQuantity: p.stockQuantity,
      }))

    const topProducts = Array.from(agg.values())
      .sort((a, b) => b.quantitySold - a.quantitySold || b.revenue - a.revenue)
      .slice(0, 5)
      .map((p) => ({
        ...p,
        revenue: Number(p.revenue.toFixed(2)),
      }))

    return HttpResponse.json({
      totalOrders: db.orders.length,
      revenue: Number(revenue.toFixed(2)),
      ordersByStatus,
      lowStockProducts,
      topProducts,
    })
  }),

  // Admin Image Upload
  http.post(`${API_BASE}/admin/images`, async ({ request }) => {
    const user = getCurrentUser(request)
    if (!user) return new HttpResponse(null, { status: 401 })
    if (user.role !== 'Admin') return new HttpResponse(null, { status: 403 })

    let formData
    try {
      formData = await request.formData()
    } catch {
      return validationProblem({
        '': [
          'Failed to read the request form. Request body too large. The max request body size is 10485760 bytes.',
        ],
      })
    }

    const file = formData.get('file')
    if (!file || typeof file === 'string') {
      return validationProblem({ file: ['The file field is required.'] })
    }

    if (file.size === 0) {
      return businessProblem(400, 'The image file is empty.')
    }

    const type = file.type || ''
    const validTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!validTypes.includes(type)) {
      return businessProblem(400, 'Only JPEG, PNG or WebP images are allowed.')
    }

    if (file.size > 2 * 1024 * 1024) {
      return businessProblem(400, 'Image must be 2 MB or smaller.')
    }

    const id = db.nextImageId++
    db.images.push({ id, file })
    return HttpResponse.json(
      {
        id,
        url: `http://localhost:5062/api/images/${id}`,
      },
      { status: 201 },
    )
  }),

  // Public Image Retrieval
  http.get(`${API_BASE}/images/:id`, ({ params }) => {
    const id = Number(params.id)
    const img = db.images?.find((i) => i.id === id)
    if (!img) return businessProblem(404, 'Image not found.')
    return new HttpResponse(new Uint8Array([1, 2, 3]), {
      status: 200,
      headers: {
        'Content-Type': img.file?.type || 'image/png',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  }),
]
