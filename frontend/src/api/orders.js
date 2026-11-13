import api from './client.js'

export async function placeOrderApi(payload) {
  const { data } = await api.post('/orders', payload)
  return data
}

export async function getOrdersApi() {
  const { data } = await api.get('/orders')
  return data
}

export async function getOrderByIdApi(id) {
  const { data } = await api.get(`/orders/${id}`)
  return data
}

export async function cancelOrderApi(id) {
  const { data } = await api.post(`/orders/${id}/cancel`)
  return data
}
