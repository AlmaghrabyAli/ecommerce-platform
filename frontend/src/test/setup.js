import '@testing-library/jest-dom/vitest'
import * as axeMatchers from 'vitest-axe/matchers'
import { cleanup } from '@testing-library/react'
import toast from 'react-hot-toast'
import { resetUnauthorizedGuard } from '../api/client.js'
import { testBackend } from './handlers.js'
import { server } from './server.js'

expect.extend(axeMatchers)

let consoleErrorSpy

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

if (typeof window !== 'undefined') {
  window.scrollTo = vi.fn()
  if (!window.ResizeObserver) {
    window.ResizeObserver = ResizeObserverStub
  }
  if (!window.matchMedia) {
    window.matchMedia = (query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })
  }
  if (!URL.createObjectURL) {
    URL.createObjectURL = vi.fn(() => 'blob:http://localhost:5173/test-preview')
  }
  if (!URL.revokeObjectURL) {
    URL.revokeObjectURL = vi.fn()
  }
}

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' })
})

beforeEach(() => {
  testBackend.reset()
  window.localStorage.clear()
  resetUnauthorizedGuard()
  toast.dismiss()
  consoleErrorSpy = vi.spyOn(console, 'error')
})

afterEach(() => {
  cleanup()
  server.resetHandlers()
  vi.useRealTimers()
  const calls = consoleErrorSpy?.mock?.calls || []
  consoleErrorSpy?.mockRestore()
  if (calls.length > 0) {
    const formatted = calls.map((args) => args.map(String).join(' ')).join('\n')
    throw new Error(`Unexpected console.error during test:\n${formatted}`)
  }
})

afterAll(() => {
  server.close()
})
