import axios from 'axios'
import { getToken } from '../utils/storage.js'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5062/api',
})

let unauthorizedHandler = null
let forbiddenHandler = null
let handlingUnauthorized = false

export function registerAuthCallbacks({ onUnauthorized, onForbidden }) {
  unauthorizedHandler = onUnauthorized
  forbiddenHandler = onForbidden
}

export function resetUnauthorizedGuard() {
  handlingUnauthorized = false
}

api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers = config.headers || {}
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status
    const url = error?.config?.url || ''
    const isAuthAttempt = url.includes('/auth/login') || url.includes('/auth/register')

    if (status === 401 && !isAuthAttempt && !error?.config?._silentAuthCheck) {
      if (!handlingUnauthorized) {
        handlingUnauthorized = true
        if (unauthorizedHandler) {
          unauthorizedHandler()
        }
        setTimeout(() => {
          handlingUnauthorized = false
        }, 1500)
      }
    } else if (status === 403) {
      if (forbiddenHandler) {
        forbiddenHandler()
      }
    }

    return Promise.reject(error)
  },
)

export default api
