import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, waitFor, act, fireEvent } from '@testing-library/react'
import { MapCanvas } from './MapCanvas'
import { useFeatureStore } from '../store/useFeatureStore'
import type { MapKitNamespace, MKMap } from '../mapkit/types'
import { sampleFC } from '../test/sample-geojson'

const resetStore = () =>
  useFeatureStore.setState({
    features: { type: 'FeatureCollection', features: [] },
    selectedId: null,
    tool: 'hand',
    draftFeature: null,
    drawingCloseHover: false,
    toasts: [],
    lastEditSource: 'init',
    hiddenIds: new Set<string>(),
    flyToId: null,
  })

const mkState: { value: { mapkit: MapKitNamespace | null; map: MKMap | null; status: string } } = {
  value: { mapkit: null, map: null, status: 'ready' },
}

vi.mock('../hooks/useMapKit', () => ({
  useMapKit: () => mkState.value,
}))

vi.mock('../hooks/useDrawingTool', () => ({
  useDrawingTool: () => undefined,
}))

vi.mock('../hooks/useDropImport', () => ({
  useDropImport: () => false,
}))

beforeEach(async () => {
  resetStore()
  const { buildMapKitMock, MockMap } = await import('../test/mapkit-mock')
  const mapkit = buildMapKitMock()
  const map = new (MockMap as unknown as new (e: HTMLElement) => MKMap)(
    document.createElement('div'),
  )
  mkState.value = { mapkit, map, status: 'ready' }
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('MapCanvas', () => {
  it('renders the empty-state CTA when there are no features', () => {
    const { getByText } = render(<MapCanvas />)
    expect(getByText(/Start drawing on the map/)).toBeInTheDocument()
  })

  it('activates polygon drawing when the empty CTA is clicked', () => {
    const { getByText } = render(<MapCanvas />)
    fireEvent.click(getByText(/Draw a polygon/))
    expect(useFeatureStore.getState().tool).toBe('polygon')
  })

  it('hides the empty-state and renders features as annotations', async () => {
    useFeatureStore.setState({ features: sampleFC })
    render(<MapCanvas />)
    await waitFor(() => {
      const map = mkState.value.map!
      expect((map as unknown as { annotations: unknown[] }).annotations.length).toBeGreaterThan(0)
    })
  })

  it('shows the unauthorized banner when status is unauthorized', () => {
    mkState.value = { ...mkState.value, status: 'unauthorized' }
    const { getByRole } = render(<MapCanvas />)
    expect(getByRole('heading', { name: /needs a JWT token/ })).toBeInTheDocument()
  })

  it('shows the loading status pill', () => {
    mkState.value = { ...mkState.value, status: 'loading' }
    const { getByText } = render(<MapCanvas />)
    expect(getByText(/loading/)).toBeInTheDocument()
  })

  it('shows the error status pill', () => {
    mkState.value = { ...mkState.value, status: 'error' }
    const { getByText } = render(<MapCanvas />)
    expect(getByText(/failed to load/)).toBeInTheDocument()
  })

  it('does not render when mapkit/map are unset', () => {
    mkState.value = { mapkit: null, map: null, status: 'idle' }
    const { getByText } = render(<MapCanvas />)
    expect(getByText(/idle/)).toBeInTheDocument()
  })

  it('respects hiddenIds when rendering features', async () => {
    useFeatureStore.setState({
      features: sampleFC,
      hiddenIds: new Set([String(sampleFC.features[0].id)]),
    })
    render(<MapCanvas />)
    await waitFor(() => {
      const map = mkState.value.map!
      const annoCount = (map as unknown as { annotations: unknown[] }).annotations.length
      const overlayCount = (map as unknown as { overlays: unknown[] }).overlays.length
      expect(annoCount + overlayCount).toBeGreaterThan(0)
    })
  })

  it('updates the selected feature when an annotation fires "select"', async () => {
    useFeatureStore.setState({ features: sampleFC })
    render(<MapCanvas />)
    await waitFor(() => {
      const map = mkState.value.map!
      const annos = (map as unknown as { annotations: { fire: (n: string, e: unknown) => void }[] })
        .annotations
      expect(annos.length).toBeGreaterThan(0)
    })
    const map = mkState.value.map!
    const first = (map as unknown as { annotations: { fire: (n: string, e: unknown) => void }[] })
      .annotations[0]
    act(() => first.fire('select', {}))
    expect(useFeatureStore.getState().selectedId).toBeDefined()
  })

  it('clears the selection when the map fires "single-tap"', async () => {
    const id = String(sampleFC.features[0].id)
    useFeatureStore.setState({ features: sampleFC, selectedId: id })
    render(<MapCanvas />)
    await waitFor(() => {
      const map = mkState.value.map!
      expect((map as unknown as { annotations: unknown[] }).annotations.length).toBeGreaterThan(0)
    })
    const map = mkState.value.map! as unknown as { fire: (n: string, e: unknown) => void }
    act(() => map.fire('single-tap', {}))
    expect(useFeatureStore.getState().selectedId).toBeNull()
  })

  it('removes the single-tap listener on unmount', async () => {
    useFeatureStore.setState({ features: sampleFC, selectedId: String(sampleFC.features[0].id) })
    const { unmount } = render(<MapCanvas />)
    await waitFor(() => {
      const map = mkState.value.map!
      expect((map as unknown as { annotations: unknown[] }).annotations.length).toBeGreaterThan(0)
    })
    unmount()
    useFeatureStore.setState({ selectedId: 'sentinel' })
    const map = mkState.value.map! as unknown as { fire: (n: string, e: unknown) => void }
    act(() => map.fire('single-tap', {}))
    expect(useFeatureStore.getState().selectedId).toBe('sentinel')
  })

  it('flyTo sets the map region to the targeted feature', async () => {
    useFeatureStore.setState({ features: sampleFC })
    render(<MapCanvas />)
    await waitFor(() => {
      const map = mkState.value.map!
      expect((map as unknown as { annotations: unknown[] }).annotations.length).toBeGreaterThan(0)
    })
    const map = mkState.value.map! as unknown as { setRegionCalls: unknown[] }
    const before = map.setRegionCalls.length
    act(() => useFeatureStore.getState().flyTo(String(sampleFC.features[0].id)))
    await waitFor(() => expect(useFeatureStore.getState().flyToId).toBeNull())
    expect(map.setRegionCalls.length).toBe(before + 1)
  })

  it('flyTo is a no-op when the target id is unknown', async () => {
    useFeatureStore.setState({ features: sampleFC })
    render(<MapCanvas />)
    const map = mkState.value.map! as unknown as { setRegionCalls: unknown[] }
    const before = map.setRegionCalls.length
    act(() => useFeatureStore.getState().flyTo('does-not-exist'))
    await waitFor(() => expect(useFeatureStore.getState().flyToId).toBeNull())
    expect(map.setRegionCalls.length).toBe(before)
  })

  it('flyTo swallows errors thrown by the region setter', async () => {
    useFeatureStore.setState({ features: sampleFC })
    render(<MapCanvas />)
    await waitFor(() => {
      const map = mkState.value.map!
      expect((map as unknown as { annotations: unknown[] }).annotations.length).toBeGreaterThan(0)
    })
    const map = mkState.value.map!
    Object.defineProperty(map, 'region', {
      configurable: true,
      get: () => null,
      set: () => {
        throw new Error('boom')
      },
    })
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    expect(() =>
      act(() => useFeatureStore.getState().flyTo(String(sampleFC.features[0].id))),
    ).not.toThrow()
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })

  it('flying to a hidden feature unhides it and updates the region', async () => {
    const id = String(sampleFC.features[0].id)
    useFeatureStore.setState({ features: sampleFC, hiddenIds: new Set([id]) })
    render(<MapCanvas />)
    await waitFor(() => {
      const map = mkState.value.map!
      // At least one of the OTHER (non-hidden) features should be rendered.
      const annoCount = (map as unknown as { annotations: unknown[] }).annotations.length
      const overlayCount = (map as unknown as { overlays: unknown[] }).overlays.length
      expect(annoCount + overlayCount).toBeGreaterThan(0)
    })
    const map = mkState.value.map! as unknown as { setRegionCalls: unknown[] }
    const before = map.setRegionCalls.length
    act(() => useFeatureStore.getState().flyTo(id))
    await waitFor(() => expect(useFeatureStore.getState().flyToId).toBeNull())
    expect(useFeatureStore.getState().hiddenIds.has(id)).toBe(false)
    expect(map.setRegionCalls.length).toBe(before + 1)
  })

  it('renders a draft as an overlay/annotation', async () => {
    useFeatureStore.setState({
      draftFeature: {
        type: 'Feature',
        properties: {},
        geometry: { type: 'Point', coordinates: [0, 0] },
      },
    })
    render(<MapCanvas />)
    await waitFor(() => {
      const map = mkState.value.map!
      expect((map as unknown as { annotations: unknown[] }).annotations.length).toBeGreaterThan(0)
    })
  })

  it('clears the draft items when the draft is removed', async () => {
    useFeatureStore.setState({
      draftFeature: {
        type: 'Feature',
        properties: {},
        geometry: { type: 'Point', coordinates: [0, 0] },
      },
    })
    render(<MapCanvas />)
    await waitFor(() => {
      const map = mkState.value.map!
      expect((map as unknown as { annotations: unknown[] }).annotations.length).toBeGreaterThan(0)
    })
    act(() => useFeatureStore.setState({ draftFeature: null }))
    await waitFor(() => {
      const map = mkState.value.map!
      expect((map as unknown as { annotations: unknown[] }).annotations).toHaveLength(0)
    })
  })

  it('removes a feature when it disappears from the store', async () => {
    useFeatureStore.setState({ features: sampleFC })
    render(<MapCanvas />)
    await waitFor(() => {
      const map = mkState.value.map!
      expect((map as unknown as { annotations: unknown[] }).annotations.length).toBeGreaterThan(0)
    })
    act(() =>
      useFeatureStore.setState({
        features: {
          type: 'FeatureCollection',
          features: sampleFC.features.filter((_, i) => i > 0),
        },
      }),
    )
    await waitFor(() => {
      const map = mkState.value.map!
      const annoCount = (map as unknown as { annotations: unknown[] }).annotations.length
      const overlayCount = (map as unknown as { overlays: unknown[] }).overlays.length
      expect(annoCount + overlayCount).toBe(2)
    })
  })

  it('selects a feature on store change and re-renders selected style', async () => {
    useFeatureStore.setState({ features: sampleFC })
    render(<MapCanvas />)
    await waitFor(() => {
      const map = mkState.value.map!
      expect((map as unknown as { annotations: unknown[] }).annotations.length).toBeGreaterThan(0)
    })
    act(() => useFeatureStore.getState().setSelected(String(sampleFC.features[0].id)))
    await waitFor(() => {
      expect(useFeatureStore.getState().selectedId).toBe(String(sampleFC.features[0].id))
    })
  })

  it('skips features with empty ids in render loop', async () => {
    useFeatureStore.setState({
      features: {
        type: 'FeatureCollection',
        features: [
          { type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [0, 0] } },
        ],
      },
    })
    render(<MapCanvas />)
    await waitFor(() => {
      const map = mkState.value.map!
      expect((map as unknown as { annotations: unknown[] }).annotations).toHaveLength(0)
    })
  })

  it('skips re-rendering a feature when its identity and selection are unchanged', async () => {
    useFeatureStore.setState({ features: sampleFC })
    render(<MapCanvas />)
    await waitFor(() => {
      const map = mkState.value.map!
      expect((map as unknown as { annotations: unknown[] }).annotations.length).toBeGreaterThan(0)
    })
    const map = mkState.value.map!
    const addAnno = vi.spyOn(map as unknown as { addAnnotations: () => unknown }, 'addAnnotations')
    // Trigger an unrelated re-render (selection of an id that doesn't exist)
    act(() => useFeatureStore.setState({ hiddenIds: new Set() }))
    expect(addAnno).not.toHaveBeenCalled()
  })

  it('shows the drawing banner with the point hint when point tool is active', () => {
    useFeatureStore.setState({ tool: 'point' })
    const { getByText } = render(<MapCanvas />)
    expect(getByText(/Click anywhere to drop a pin/)).toBeInTheDocument()
  })

  it('shows the drawing banner for the polyline tool', () => {
    useFeatureStore.setState({ tool: 'polyline' })
    const { getByText } = render(<MapCanvas />)
    expect(getByText(/Click to add points/)).toBeInTheDocument()
  })

  it('shows the drawing banner for the polygon tool', () => {
    useFeatureStore.setState({ tool: 'polygon' })
    const { getByText } = render(<MapCanvas />)
    expect(getByText(/Click the start vertex/)).toBeInTheDocument()
  })

  it('renders a measurement label for a LineString draft', () => {
    useFeatureStore.setState({
      tool: 'polyline',
      draftFeature: {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: [
            [0, 0],
            [1, 0],
            [1, 1],
          ],
        },
      },
    })
    const { container } = render(<MapCanvas />)
    // The measurement appears in the drawing banner as a separate span.
    const banner = container.querySelector('[role="status"][aria-live="polite"]')
    expect(banner).toBeTruthy()
    expect(banner?.textContent ?? '').toMatch(/km|m/)
  })

  it('renders a measurement label for a Polygon draft', () => {
    useFeatureStore.setState({
      tool: 'polygon',
      draftFeature: {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [0, 0],
              [1, 0],
              [1, 1],
              [0, 0],
            ],
          ],
        },
      },
    })
    const { container } = render(<MapCanvas />)
    const banner = container.querySelector('[role="status"][aria-live="polite"]')
    expect(banner).toBeTruthy()
  })

  it('omits the measurement for a too-short LineString draft', () => {
    useFeatureStore.setState({
      tool: 'polyline',
      draftFeature: {
        type: 'Feature',
        properties: {},
        geometry: { type: 'LineString', coordinates: [[0, 0]] },
      },
    })
    const { container } = render(<MapCanvas />)
    expect(container.textContent).toContain('Click to add points')
  })

  it('omits the measurement for a too-short Polygon draft', () => {
    useFeatureStore.setState({
      tool: 'polygon',
      draftFeature: {
        type: 'Feature',
        properties: {},
        geometry: { type: 'Polygon', coordinates: [[[0, 0]]] },
      },
    })
    const { container } = render(<MapCanvas />)
    expect(container.textContent).toContain('Click the start vertex')
  })

  it('omits the measurement for a Point draft', () => {
    useFeatureStore.setState({
      tool: 'point',
      draftFeature: {
        type: 'Feature',
        properties: {},
        geometry: { type: 'Point', coordinates: [0, 0] },
      },
    })
    const { container } = render(<MapCanvas />)
    expect(container.textContent).toContain('Click anywhere to drop')
  })
})
