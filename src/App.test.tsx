import { describe, expect, it, vi } from 'vitest'
import { render } from '@testing-library/react'

vi.mock('./components/MapCanvas', () => ({ MapCanvas: () => <div data-testid="map-canvas" /> }))
vi.mock('./components/Sidebar', () => ({ Sidebar: () => <div data-testid="sidebar" /> }))
vi.mock('./components/Toolbar', () => ({ Toolbar: () => <div data-testid="toolbar" /> }))
vi.mock('./components/ToastHost', () => ({ ToastHost: () => <div data-testid="toasts" /> }))
vi.mock('./hooks/useKeyboardShortcuts', () => ({ useKeyboardShortcuts: () => undefined }))

describe('App', () => {
  it('renders Toolbar, MapCanvas, Sidebar, and ToastHost', async () => {
    const App = (await import('./App')).default
    const { getByTestId } = render(<App />)
    expect(getByTestId('toolbar')).toBeInTheDocument()
    expect(getByTestId('map-canvas')).toBeInTheDocument()
    expect(getByTestId('sidebar')).toBeInTheDocument()
    expect(getByTestId('toasts')).toBeInTheDocument()
  })
})
