import api from './client.js'

export async function getAdminStatsApi() {
  const { data } = await api.get('/admin/stats')
  return data
}

export async function getAdminProductsApi(params = {}) {
  const cleanParams = {}
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      cleanParams[key] = value
    }
  }
  const { data } = await api.get('/admin/products', { params: cleanParams })
  return data
}

export async function getAdminProductByIdApi(id) {
  const { data } = await api.get(`/admin/products/${id}`)
  return data
}

export async function createAdminProductApi(payload) {
  const { data } = await api.post('/admin/products', payload)
  return data
}

export async function updateAdminProductApi({ id, ...payload }) {
  const { data } = await api.put(`/admin/products/${id}`, payload)
  return data
}

export async function deleteAdminProductApi(id) {
  await api.delete(`/admin/products/${id}`)
}

export async function deactivateAdminProductApi(id) {
  await api.delete(`/admin/products/${id}`)
}

export async function createAdminCategoryApi(payload) {
  const { data } = await api.post('/admin/categories', payload)
  return data
}

export async function updateAdminCategoryApi({ id, ...payload }) {
  const { data } = await api.put(`/admin/categories/${id}`, payload)
  return data
}

export async function deleteAdminCategoryApi(id) {
  await api.delete(`/admin/categories/${id}`)
}

export async function getAdminOrdersApi(params = {}) {
  const cleanParams = {}
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      cleanParams[key] = value
    }
  }
  const { data } = await api.get('/admin/orders', { params: cleanParams })
  return data
}

export async function getAdminOrderByIdApi(id) {
  const { data } = await api.get(`/admin/orders/${id}`)
  return data
}

export async function updateAdminOrderStatusApi({ id, status }) {
  const { data } = await api.put(`/admin/orders/${id}/status`, { status })
  return data
}

export async function uploadProductImage(file) {
  const formData = new FormData()
  formData.append('file', file)
  const { data } = await api.post('/admin/images', formData)
  return data
}

export const uploadProductImageApi = uploadProductImage

