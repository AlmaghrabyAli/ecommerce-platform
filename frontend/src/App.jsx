import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ToasterSetup } from './components/ui/ToasterSetup.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { AppRoutes } from './routes/index.jsx'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      retry: (failureCount, error) => {
        const status = error?.response?.status
        if (status >= 400 && status < 500) return false
        return failureCount < 1
      },
    },
  },
})

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
          <ToasterSetup />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
