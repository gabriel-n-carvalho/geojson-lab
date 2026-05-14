import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Toolbar } from './Toolbar'
import { useFeatureStore } from '../store/useFeatureStore'
import { sampleFC } from '../test/sample-geojson'

const resetStore = () =>
  useFeatureStore.setState({
    features: { type: 'FeatureCollection', features: [] },
    selectedId: null,
    tool: 'hand',
    draftFeature: null,
    toasts: [],
    lastEditSource: 'init',
    hiddenIds: new Set<string>(),
    flyToId: null,
  })

beforeEach(() => {
  resetStore()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('Toolbar', () => {
  it('renders all four drawing tools', () => {
    render(<Toolbar />)
    for (const label of ['Hand', 'Point', 'Line', 'Polygon']) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument()
    }
  })

  it('marks the hand tool as pressed by default', () => {
    render(<Toolbar />)
    expect(screen.getByRole('button', { name: 'Hand' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('updates the store when a tool is clicked', async () => {
    const user = userEvent.setup()
    render(<Toolbar />)
    await user.click(screen.getByRole('button', { name: 'Point' }))
    expect(useFeatureStore.getState().tool).toBe('point')
  })

  it('reset button is disabled when there are no features', () => {
    render(<Toolbar />)
    const reset = screen.getByRole('button', { name: 'Reset playground' })
    expect(reset).toBeDisabled()
  })

  it('clears the map after confirming reset', async () => {
    const user = userEvent.setup()
    useFeatureStore.setState({ features: sampleFC })
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<Toolbar />)
    await user.click(screen.getByRole('button', { name: 'Reset playground' }))
    expect(useFeatureStore.getState().features.features).toHaveLength(0)
    expect(useFeatureStore.getState().toasts.some((t) => t.message === 'Map cleared')).toBe(true)
  })

  it('does not clear the map when the user cancels the confirm', async () => {
    const user = userEvent.setup()
    useFeatureStore.setState({ features: sampleFC })
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    render(<Toolbar />)
    await user.click(screen.getByRole('button', { name: 'Reset playground' }))
    expect(useFeatureStore.getState().features.features).toHaveLength(3)
  })

  it('reset button does nothing when collection is empty', async () => {
    const user = userEvent.setup()
    const confirmSpy = vi.spyOn(window, 'confirm')
    render(<Toolbar />)
    const btn = screen.getByRole('button', { name: 'Reset playground' })
    // Fire the click directly to bypass the disabled guard so we hit the
    // early-return branch in handleClear.
    await user.click(btn).catch(() => undefined)
    fireEvent.click(btn)
    expect(confirmSpy).not.toHaveBeenCalled()
  })

  it('opens a file via the Import button and imports it', async () => {
    const user = userEvent.setup()
    useFeatureStore.setState({ features: sampleFC })
    render(<Toolbar />)
    await user.click(screen.getByRole('button', { name: /Import GeoJSON/i }))
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File([JSON.stringify(sampleFC)], 'm.geojson', { type: 'application/geo+json' })
    await user.upload(input, file)
    await waitFor(() =>
      expect(useFeatureStore.getState().toasts.some((t) => t.kind === 'success')).toBe(true),
    )
  })

  it('shows an error toast when the file is not valid GeoJSON', async () => {
    const user = userEvent.setup()
    render(<Toolbar />)
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File([JSON.stringify({ foo: 'bar' })], 'bad.geojson')
    await user.upload(input, file)
    await waitFor(() =>
      expect(useFeatureStore.getState().toasts.some((t) => t.kind === 'error')).toBe(true),
    )
  })

  it('shows an error toast when reading the file throws', async () => {
    const user = userEvent.setup()
    render(<Toolbar />)
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['x'], 'broken.geojson')
    vi.spyOn(file, 'text').mockRejectedValueOnce(new Error('disk on fire'))
    await user.upload(input, file)
    await waitFor(() =>
      expect(
        useFeatureStore.getState().toasts.some((t) => t.message.includes('disk on fire')),
      ).toBe(true),
    )
  })

  it('ignores empty file input changes', async () => {
    render(<Toolbar />)
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(input, { target: { files: null } })
    expect(useFeatureStore.getState().toasts).toHaveLength(0)
  })

  it('downloads the GeoJSON when the Download button is clicked', async () => {
    const user = userEvent.setup()
    useFeatureStore.setState({ features: sampleFC })
    render(<Toolbar />)
    const clickSpy = vi.fn()
    const original = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = original(tag)
      if (tag === 'a') (el as HTMLAnchorElement).click = clickSpy
      return el
    })
    await user.click(screen.getByRole('button', { name: /Download GeoJSON/i }))
    expect(clickSpy).toHaveBeenCalled()
    expect(useFeatureStore.getState().toasts.some((t) => t.message.includes('Downloaded'))).toBe(
      true,
    )
  })

  it('Download button is disabled when there are no features', () => {
    render(<Toolbar />)
    expect(screen.getByRole('button', { name: /Download GeoJSON/i })).toBeDisabled()
  })
})
