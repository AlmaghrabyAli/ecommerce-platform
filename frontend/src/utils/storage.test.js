import {
  clearSession,
  getExpiresAt,
  getToken,
  getUser,
  isSessionExpired,
  setSession,
} from './storage.js'

describe('storage helpers', () => {
  it('stores, reads, and clears session data in localStorage', () => {
    const user = { id: 2, fullName: 'Demo Customer', email: 'customer@shop.test', role: 'Customer' }
    setSession({ token: 'tok-123', user, expiresAtUtc: '2099-01-01T00:00:00Z' })

    expect(getToken()).toBe('tok-123')
    expect(getUser()).toEqual(user)
    expect(getExpiresAt()).toBe('2099-01-01T00:00:00Z')

    clearSession()
    expect(getToken()).toBeNull()
    expect(getUser()).toBeNull()
    expect(getExpiresAt()).toBeNull()
  })

  it('detects expired, missing, and valid expiration timestamps', () => {
    expect(isSessionExpired(null)).toBe(true)
    expect(isSessionExpired('invalid')).toBe(true)
    expect(isSessionExpired('2020-01-01T00:00:00Z')).toBe(true)
    expect(isSessionExpired('2099-01-01T00:00:00')).toBe(false)
  })

  it('falls back to in-memory storage when localStorage throws', () => {
    const getSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError')
    })
    const setSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })
    const removeSpy = vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('SecurityError')
    })

    const user = { id: 3, fullName: 'Sara Ali', role: 'Customer' }
    setSession({ token: 'mem-token', user, expiresAtUtc: '2099-01-01T00:00:00Z' })
    expect(getToken()).toBe('mem-token')
    expect(getUser()).toEqual(user)

    clearSession()
    expect(getToken()).toBeNull()

    getSpy.mockRestore()
    setSpy.mockRestore()
    removeSpy.mockRestore()
  })
})
