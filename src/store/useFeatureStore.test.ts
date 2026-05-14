import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useFeatureStore } from './useFeatureStore'

const reset = () =>
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

beforeEach(() => {
  reset()
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useFeatureStore', () => {
  it('setTool updates the tool and clears any draft', () => {
    useFeatureStore.setState({
      draftFeature: {
        type: 'Feature',
        properties: {},
        geometry: { type: 'Point', coordinates: [0, 0] },
      },
    })
    useFeatureStore.getState().setTool('point')
    expect(useFeatureStore.getState().tool).toBe('point')
    expect(useFeatureStore.getState().draftFeature).toBeNull()
  })

  it('setSelected updates the selected id', () => {
    useFeatureStore.getState().setSelected('abc')
    expect(useFeatureStore.getState().selectedId).toBe('abc')
  })

  it('addFeature adds a feature, selects it, and returns its id', () => {
    const id = useFeatureStore.getState().addFeature({ type: 'Point', coordinates: [0, 1] })
    const state = useFeatureStore.getState()
    expect(state.features.features).toHaveLength(1)
    expect(state.selectedId).toBe(id)
    expect(state.lastEditSource).toBe('map')
  })

  it('addFeature defaults properties to an empty object', () => {
    const id = useFeatureStore.getState().addFeature({ type: 'Point', coordinates: [0, 0] })
    const f = useFeatureStore.getState().features.features.find((x) => x.id === id)
    expect(f?.properties).toEqual({})
  })

  it('updateFeatureGeometry replaces the geometry of a feature', () => {
    const id = useFeatureStore.getState().addFeature({ type: 'Point', coordinates: [0, 0] })
    useFeatureStore.getState().updateFeatureGeometry(id, { type: 'Point', coordinates: [1, 1] })
    const f = useFeatureStore.getState().features.features.find((x) => x.id === id)
    expect(f?.geometry).toEqual({ type: 'Point', coordinates: [1, 1] })
  })

  it('updateFeatureGeometry skips features that do not match the id', () => {
    const id = useFeatureStore.getState().addFeature({ type: 'Point', coordinates: [0, 0] })
    useFeatureStore
      .getState()
      .updateFeatureGeometry('other', { type: 'Point', coordinates: [1, 1] })
    const f = useFeatureStore.getState().features.features.find((x) => x.id === id)
    expect(f?.geometry).toEqual({ type: 'Point', coordinates: [0, 0] })
  })

  it('deleteFeature removes a feature and clears selection if it was selected', () => {
    const id = useFeatureStore.getState().addFeature({ type: 'Point', coordinates: [0, 0] })
    useFeatureStore.getState().deleteFeature(id)
    expect(useFeatureStore.getState().features.features).toHaveLength(0)
    expect(useFeatureStore.getState().selectedId).toBeNull()
  })

  it('deleteFeature keeps selection intact when removing a different feature', () => {
    const a = useFeatureStore.getState().addFeature({ type: 'Point', coordinates: [0, 0] })
    const b = useFeatureStore.getState().addFeature({ type: 'Point', coordinates: [1, 1] })
    useFeatureStore.getState().setSelected(a)
    useFeatureStore.getState().deleteFeature(b)
    expect(useFeatureStore.getState().selectedId).toBe(a)
  })

  it('clearAll resets all collections', () => {
    useFeatureStore.getState().addFeature({ type: 'Point', coordinates: [0, 0] })
    useFeatureStore.getState().toggleHidden('whatever')
    useFeatureStore.getState().clearAll()
    const state = useFeatureStore.getState()
    expect(state.features.features).toHaveLength(0)
    expect(state.selectedId).toBeNull()
    expect(state.draftFeature).toBeNull()
    expect(state.hiddenIds.size).toBe(0)
    expect(state.tool).toBe('hand')
  })

  it('replaceAll ensures every feature has an id and resets selection', () => {
    useFeatureStore.getState().replaceAll({
      type: 'FeatureCollection',
      features: [
        { type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [0, 0] } },
      ],
    })
    const state = useFeatureStore.getState()
    expect(state.features.features[0].id).toBeDefined()
    expect(state.lastEditSource).toBe('editor')
  })

  it('replaceAll keeps existing ids', () => {
    useFeatureStore.getState().replaceAll({
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          id: 'keep-me',
          properties: {},
          geometry: { type: 'Point', coordinates: [0, 0] },
        },
      ],
    })
    expect(useFeatureStore.getState().features.features[0].id).toBe('keep-me')
  })

  it('replaceAll accepts a custom source', () => {
    useFeatureStore.getState().replaceAll({ type: 'FeatureCollection', features: [] }, 'import')
    expect(useFeatureStore.getState().lastEditSource).toBe('import')
  })

  it('replaceAll falls back to an empty features array when the input has none', () => {
    useFeatureStore.getState().replaceAll({ type: 'FeatureCollection' } as never, 'editor')
    expect(useFeatureStore.getState().features.features).toEqual([])
  })

  it('setDraft updates the draft feature', () => {
    const draft = {
      type: 'Feature' as const,
      properties: {},
      geometry: { type: 'Point' as const, coordinates: [1, 2] },
    }
    useFeatureStore.getState().setDraft(draft)
    expect(useFeatureStore.getState().draftFeature).toEqual(draft)
  })

  it('pushToast adds a toast and auto-dismisses it after 4 seconds', () => {
    useFeatureStore.getState().pushToast('info', 'hi')
    expect(useFeatureStore.getState().toasts).toHaveLength(1)
    vi.advanceTimersByTime(4000)
    expect(useFeatureStore.getState().toasts).toHaveLength(0)
  })

  it('dismissToast removes a toast immediately', () => {
    useFeatureStore.getState().pushToast('error', 'bad')
    const id = useFeatureStore.getState().toasts[0].id
    useFeatureStore.getState().dismissToast(id)
    expect(useFeatureStore.getState().toasts).toHaveLength(0)
  })

  it('toggleHidden adds and removes ids from the hidden set', () => {
    useFeatureStore.getState().toggleHidden('a')
    expect(useFeatureStore.getState().hiddenIds.has('a')).toBe(true)
    useFeatureStore.getState().toggleHidden('a')
    expect(useFeatureStore.getState().hiddenIds.has('a')).toBe(false)
  })

  it('flyTo sets both flyToId and selectedId', () => {
    useFeatureStore.getState().flyTo('x')
    expect(useFeatureStore.getState().flyToId).toBe('x')
    expect(useFeatureStore.getState().selectedId).toBe('x')
  })

  it('clearFlyTo resets flyToId without touching selection', () => {
    useFeatureStore.getState().flyTo('y')
    useFeatureStore.getState().clearFlyTo()
    expect(useFeatureStore.getState().flyToId).toBeNull()
    expect(useFeatureStore.getState().selectedId).toBe('y')
  })

  it('setDrawingCloseHover updates the flag', () => {
    useFeatureStore.getState().setDrawingCloseHover(true)
    expect(useFeatureStore.getState().drawingCloseHover).toBe(true)
    useFeatureStore.getState().setDrawingCloseHover(false)
    expect(useFeatureStore.getState().drawingCloseHover).toBe(false)
  })

  it('setDraft clears drawingCloseHover when the draft is removed', () => {
    useFeatureStore.setState({ drawingCloseHover: true })
    useFeatureStore.getState().setDraft(null)
    expect(useFeatureStore.getState().drawingCloseHover).toBe(false)
  })

  it('setDraft preserves drawingCloseHover when the draft is non-null', () => {
    useFeatureStore.setState({ drawingCloseHover: true })
    useFeatureStore.getState().setDraft({
      type: 'Feature',
      properties: {},
      geometry: { type: 'Point', coordinates: [0, 0] },
    })
    expect(useFeatureStore.getState().drawingCloseHover).toBe(true)
  })

  it('setTool clears drawingCloseHover', () => {
    useFeatureStore.setState({ drawingCloseHover: true })
    useFeatureStore.getState().setTool('point')
    expect(useFeatureStore.getState().drawingCloseHover).toBe(false)
  })

  it('clearAll clears drawingCloseHover', () => {
    useFeatureStore.setState({ drawingCloseHover: true })
    useFeatureStore.getState().clearAll()
    expect(useFeatureStore.getState().drawingCloseHover).toBe(false)
  })

  it('replaceAll clears drawingCloseHover', () => {
    useFeatureStore.setState({ drawingCloseHover: true })
    useFeatureStore.getState().replaceAll({ type: 'FeatureCollection', features: [] })
    expect(useFeatureStore.getState().drawingCloseHover).toBe(false)
  })
})
