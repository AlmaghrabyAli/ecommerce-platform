import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ToasterSetup } from '../components/ui/ToasterSetup.jsx'
import { AuthProvider } from '../context/AuthContext.jsx'
import { AppRoutes } from '../routes/index.jsx'
import { setSession } from '../utils/storage.js'
import { makeUser } from './fixtures.js'

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  })
}

export function renderWithProviders(
  ui,
  {
    route = '/',
    role = 'guest',
    user: customUser,
    token: customToken,
    expiresAtUtc = '2099-01-01T00:00:00Z',
    queryClient = createTestQueryClient(),
    withRoutes = false,
  } = {},
) {
  if (role === 'customer' || role === 'admin') {
    const defaultUser =
      role === 'admin'
        ? makeUser({ id: 1, fullName: 'Store Admin', email: 'admin@shop.test', role: 'Admin' })
        : makeUser({ id: 2, fullName: 'Demo Customer', email: 'customer@shop.test', role: 'Customer' })
    const user = customUser || defaultUser
    const token = customToken || (role === 'admin' ? 'test-token-admin' : 'test-token-customer')
    setSession({ token, user, expiresAtUtc })
  } else if (customToken) {
    setSession({ token: customToken, user: customUser || makeUser(), expiresAtUtc })
  }

  const content = withRoutes ? <AppRoutes /> : ui

  const result = render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[route]}>
        <AuthProvider>
          {content}
          <ToasterSetup />
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  )

  return {
    ...result,
    queryClient,
  }
}
