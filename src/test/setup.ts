import '@testing-library/jest-dom/vitest'
import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

if (!globalThis.URL.createObjectURL) {
  Object.defineProperty(globalThis.URL, 'createObjectURL', {
    writable: true,
    value: () => 'blob:mock',
  })
}
if (!globalThis.URL.revokeObjectURL) {
  Object.defineProperty(globalThis.URL, 'revokeObjectURL', {
    writable: true,
    value: () => undefined,
  })
}

if (!window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    }),
  })
}

if (!navigator.clipboard) {
  Object.defineProperty(navigator, 'clipboard', {
    writable: true,
    configurable: true,
    value: { writeText: vi.fn(async () => undefined) },
  })
}

if (typeof window.confirm !== 'function') {
  window.confirm = () => true
}
