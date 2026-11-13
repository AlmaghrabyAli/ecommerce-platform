import { createContext, startTransition, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { getMeApi, loginApi, registerApi } from '../api/auth.js'
import { registerAuthCallbacks, resetUnauthorizedGuard } from '../api/client.js'
import {
  clearSession,
  getExpiresAt,
  getToken,
  getUser,
  isSessionExpired,
  setSession,
} from '../utils/storage.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const token = getToken()
    const expiresAt = getExpiresAt()
    if (token && !isSessionExpired(expiresAt)) {
      return getUser()
    }
    return null
  })
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()

  useEffect(() => {
    registerAuthCallbacks({
      onUnauthorized: () => {
        clearSession()
        setUser(null)
        queryClient.clear()
        toast.error('Your session expired. Please sign in again.', {
          id: 'session-expired',
          duration: 6000,
        })
        if (location.pathname !== '/login' && location.pathname !== '/register') {
          navigate('/login', {
            replace: true,
            state: { from: `${location.pathname}${location.search}` },
          })
        }
      },
      onForbidden: () => {
        if (location.pathname !== '/forbidden') {
          navigate('/forbidden')
        }
      },
    })
  }, [location.pathname, location.search, navigate, queryClient])

  useEffect(() => {
    let active = true

    async function restoreSession() {
      const token = getToken()
      const expiresAt = getExpiresAt()

      if (!token || isSessionExpired(expiresAt)) {
        clearSession()
        if (active) {
          setUser(null)
          setLoading(false)
        }
        return
      }

      try {
        const me = await getMeApi({ _silentAuthCheck: true })
        if (!active) return
        setUser(me)
        setSession({ user: me })
      } catch (err) {
        if (!active) return
        if (err?.response?.status === 401) {
          clearSession()
          setUser(null)
          queryClient.clear()
        } else {
          setUser(getUser())
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    restoreSession()
    return () => {
      active = false
    }
  }, [queryClient])

  const login = useCallback(async (credentials) => {
    const authData = await loginApi(credentials)
    resetUnauthorizedGuard()
    setSession(authData)
    setUser(authData.user)
    return authData
  }, [])

  const register = useCallback(async (payload) => {
    const authData = await registerApi(payload)
    resetUnauthorizedGuard()
    setSession(authData)
    setUser(authData.user)
    return authData
  }, [])

  const logout = useCallback(() => {
    clearSession()
    navigate('/', { replace: true })
    startTransition(() => {
      setUser(null)
      queryClient.clear()
    })
  }, [navigate, queryClient])

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: Boolean(user),
      isAdmin: user?.role === 'Admin',
      login,
      register,
      logout,
    }),
    [user, loading, login, register, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components -- useAuth hook is intentionally co-located with AuthProvider
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}
