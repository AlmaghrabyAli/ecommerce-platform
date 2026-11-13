import api from './client.js'

export async function getCartApi() {
  const { data } = await api.get('/cart')
  return data
}

export async function addToCartApi({ productId, quantity }) {
  const { data } = await api.post('/cart/items', { productId, quantity })
  return data
}

export async function updateCartItemApi({ productId, quantity }) {
  const { data } = await api.put(`/cart/items/${productId}`, { quantity })
  return data
}

export async function removeCartItemApi(productId) {
  const { data } = await api.delete(`/cart/items/${productId}`)
  return data
}

export async function clearCartApi() {
  await api.delete('/cart')
}
