import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { useState } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import api from '../api/client.js'
import { API_BASE, makeUser } from '../test/fixtures.js'
import { testBackend } from '../test/handlers.js'
import { renderWithProviders } from '../test/renderWithProviders.jsx'
import { server } from '../test/server.js'
import { getToken, getUser } from '../utils/storage.js'
import { useAuth } from './AuthContext.jsx'

function AuthProbe() {
  const { user, loading, isAuthenticated, isAdmin, login, register, logout } = useAuth()
  const [statusMsg, setStatusMsg] = useState('')
  const location = useLocation()

  async function handleProtectedPair() {
    await Promise.allSettled([api.get('/cart'), api.get('/orders')])
  }

  return (
    <div>
      <div data-testid="loading">{String(loading)}</div>
      <div data-testid="authenticated">{String(isAuthenticated)}</div>
      <div data-testid="admin">{String(isAdmin)}</div>
      <div data-testid="user-name">{user?.fullName || 'none'}</div>
      <div data-testid="path">{`${location.pathname}|${location.state?.from || ''}`}</div>
      <div data-testid="status-msg">{statusMsg}</div>

      <button
        type="button"
        onClick={async () => {
          try {
            await login({ email: 'customer@shop.test', password: 'WrongPassword' })
          } catch (e) {
            setStatusMsg(`login-err-${e?.response?.status}`)
          }
        }}
      >
        Bad login
      </button>

      <button
        type="button"
        onClick={async () => {
          await login({ email: 'customer@shop.test', password: 'Customer@12345' })
        }}
      >
        Good login
      </button>

      <button
        type="button"
        onClick={async () => {
          try {
            await register({
              fullName: 'Demo Customer',
              email: 'customer@shop.test',
              password: 'Password@123',
            })
          } catch (e) {
            setStatusMsg(`register-err-${e?.response?.status}`)
          }
        }}
      >
        Conflict register
      </button>

      <button type="button" onClick={handleProtectedPair}>
        Fire concurrent protected requests
      </button>

      <button
        type="button"
        onClick={async () => {
          try {
            await api.get('/admin/stats')
          } catch {
            // handled by interceptor
          }
        }}
      >
        Trigger 403
      </button>

      <button type="button" onClick={logout}>
        Logout
      </button>
    </div>
  )
}

describe('AuthContext & API client interceptors', () => {
  it('attaches Bearer header only when token exists and skips it for guests', async () => {
    const authHeaders = []
    server.use(
      http.get(`${API_BASE}/categories`, ({ request }) => {
        authHeaders.push(request.headers.get('authorization'))
        return HttpResponse.json([])
      }),
    )

    await api.get('/categories')
    expect(authHeaders[0]).toBeNull()

    window.localStorage.setItem('bazaaro_token', 'test-token-customer')
    await api.get('/categories')
    expect(authHeaders[1]).toBe('Bearer test-token-customer')
  })

  it('restores valid session via /auth/me and updates stored user', async () => {
    renderWithProviders(<AuthProbe />, {
      role: 'customer',
      user: makeUser({ id: 2, fullName: 'Stale Name', role: 'Customer' }),
    })

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false')
    })
    expect(screen.getByTestId('authenticated')).toHaveTextContent('true')
    expect(screen.getByTestId('user-name')).toHaveTextContent('Demo Customer')
  })

  it('clears session silently when /auth/me returns 401 or stored token is expired', async () => {
    renderWithProviders(<AuthProbe />, {
      role: 'customer',
      expiresAtUtc: '2020-01-01T00:00:00Z',
    })

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false')
    })
    expect(screen.getByTestId('authenticated')).toHaveTextContent('false')
    expect(getToken()).toBeNull()
    expect(screen.queryByText('Your session expired. Please sign in again.')).not.toBeInTheDocument()

    testBackend.expireToken('test-token-customer')
    renderWithProviders(<AuthProbe />, { role: 'customer', token: 'test-token-customer' })
    await waitFor(() => {
      expect(screen.getAllByTestId('loading')[1]).toHaveTextContent('false')
    })
    expect(getToken()).toBeNull()
    expect(screen.queryByText('Your session expired. Please sign in again.')).not.toBeInTheDocument()
  })

  it('handles login 401 without clearing or redirecting, register 409, and logout cache clear', async () => {
    const user = userEvent.setup()
    const { queryClient } = renderWithProviders(<AuthProbe />, { role: 'guest' })
    queryClient.setQueryData(['cart'], { items: [], itemCount: 0, subtotal: 0 })

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false')
    })

    await user.click(screen.getByRole('button', { name: 'Bad login' }))
    await waitFor(() => {
      expect(screen.getByTestId('status-msg')).toHaveTextContent('login-err-401')
    })
    expect(screen.getByTestId('path')).toHaveTextContent('/|')

    await user.click(screen.getByRole('button', { name: 'Conflict register' }))
    await waitFor(() => {
      expect(screen.getByTestId('status-msg')).toHaveTextContent('register-err-409')
    })

    await user.click(screen.getByRole('button', { name: 'Good login' }))
    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toHaveTextContent('true')
    })
    expect(getUser()?.email).toBe('customer@shop.test')

    await user.click(screen.getByRole('button', { name: 'Logout' }))
    expect(screen.getByTestId('authenticated')).toHaveTextContent('false')
    expect(getToken()).toBeNull()
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0)
  })

  it('debounces concurrent 401s into a single toast + redirect and routes 403 to /forbidden without logout', async () => {
    const user = userEvent.setup()

    renderWithProviders(
      <Routes>
        <Route path="/checkout" element={<AuthProbe />} />
        <Route path="/login" element={<AuthProbe />} />
        <Route path="/forbidden" element={<AuthProbe />} />
      </Routes>,
      { route: '/checkout', role: 'customer' },
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false')
    })

    // 403 -> /forbidden while keeping session
    await user.click(screen.getByRole('button', { name: 'Trigger 403' }))
    await waitFor(() => {
      expect(screen.getByTestId('path')).toHaveTextContent('/forbidden|')
    })
    expect(screen.getByTestId('authenticated')).toHaveTextContent('true')

    // Expire token and trigger concurrent protected 401s
    testBackend.expireToken('test-token-customer')
    await user.click(screen.getByRole('button', { name: 'Fire concurrent protected requests' }))

    await waitFor(() => {
      expect(screen.getByTestId('path')).toHaveTextContent('/login|/forbidden')
    })
    expect(screen.getAllByText('Your session expired. Please sign in again.')).toHaveLength(1)
  })
})
