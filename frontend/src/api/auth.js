import api from './client.js'

export async function loginApi(payload) {
  const { data } = await api.post('/auth/login', payload)
  return data
}

export async function registerApi(payload) {
  const { data } = await api.post('/auth/register', payload)
  return data
}

export async function getMeApi(config = {}) {
  const { data } = await api.get('/auth/me', config)
  return data
}
