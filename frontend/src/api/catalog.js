import api from './client.js'

export async function getCategoriesApi() {
  const { data } = await api.get('/categories')
  return data
}

export async function getProductsApi(params = {}) {
  const cleanParams = {}
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      cleanParams[key] = value
    }
  }
  const { data } = await api.get('/products', { params: cleanParams })
  return data
}

export async function getProductBySlugApi(slug) {
  const { data } = await api.get(`/products/${encodeURIComponent(slug)}`)
  return data
}
