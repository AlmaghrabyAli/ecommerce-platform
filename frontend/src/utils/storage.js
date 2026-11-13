const TOKEN_KEY = 'bazaaro_token'
const USER_KEY = 'bazaaro_user'
const EXPIRES_KEY = 'bazaaro_expires'

const memoryFallback = new Map()

function safeGet(key) {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return memoryFallback.get(key) ?? null
  }
}

function safeSet(key, value) {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    memoryFallback.set(key, value)
  }
}

function safeRemove(key) {
  try {
    window.localStorage.removeItem(key)
  } catch {
    memoryFallback.delete(key)
  }
}

export function getToken() {
  return safeGet(TOKEN_KEY)
}

export function getExpiresAt() {
  return safeGet(EXPIRES_KEY)
}

export function getUser() {
  const raw = safeGet(USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function isSessionExpired(expiresAtUtc) {
  if (!expiresAtUtc) return true
  const hasZone = /Z$|[+-]\d{2}:\d{2}$/.test(expiresAtUtc)
  const expTime = new Date(hasZone ? expiresAtUtc : `${expiresAtUtc}Z`).getTime()
  if (Number.isNaN(expTime)) return true
  return Date.now() >= expTime
}

export function setSession({ token, user, expiresAtUtc }) {
  if (token) safeSet(TOKEN_KEY, token)
  if (user) safeSet(USER_KEY, JSON.stringify(user))
  if (expiresAtUtc) safeSet(EXPIRES_KEY, expiresAtUtc)
}

export function clearSession() {
  safeRemove(TOKEN_KEY)
  safeRemove(USER_KEY)
  safeRemove(EXPIRES_KEY)
}
