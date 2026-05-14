import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useRef } from 'react'
import { renderHook, act } from '@testing-library/react'
import { useDrawingTool } from './useDrawingTool'
import { useFeatureStore } from '../store/useFeatureStore'
import type { MapKitNamespace, MKMap } from '../mapkit/types'

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

const fakeMap = (): MKMap =>
  ({
    convertPointOnPageToCoordinate: (p: DOMPoint) => ({ latitude: p.y, longitude: p.x }),
    convertCoordinateToPointOnPage: (c: { latitude: number; longitude: number }) => ({
      x: c.longitude,
      y: c.latitude,
    }),
  }) as unknown as MKMap

const fakeMapKit = (): MapKitNamespace =>
  ({
    Coordinate: class {
      latitude: number
      longitude: number
      constructor(latitude: number, longitude: number) {
        this.latitude = latitude
        this.longitude = longitude
      }
    },
  }) as unknown as MapKitNamespace

const mountSurface = () => {
  const el = document.createElement('div')
  document.body.appendChild(el)
  return el
}

const dispatchMouse = (
  el: HTMLElement,
  type: string,
  opts: { clientX?: number; clientY?: number } = {},
) => {
  const ev = new MouseEvent(type, {
    clientX: opts.clientX ?? 0,
    clientY: opts.clientY ?? 0,
    bubbles: true,
    cancelable: true,
  })
  el.dispatchEvent(ev)
  return ev
}

const dispatchKey = (key: string) => {
  const ev = new KeyboardEvent('keydown', { key, cancelable: true })
  window.dispatchEvent(ev)
  return ev
}

beforeEach(() => resetStore())
afterEach(() => {
  document.body.innerHTML = ''
})

const setupHook = (map: MKMap | null, surface: HTMLElement | null) => {
  const mapkit = map ? fakeMapKit() : null
  return renderHook(() => {
    const ref = useRef<HTMLElement | null>(surface)
    useDrawingTool({ mapkit, map, surfaceRef: ref })
  })
}

describe('useDrawingTool', () => {
  it('does nothing when the map is missing', () => {
    setupHook(null, mountSurface())
    expect(true).toBe(true)
  })

  it('does nothing when the surface is missing', () => {
    setupHook(fakeMap(), null)
    expect(true).toBe(true)
  })

  it('does nothing while the hand tool is active', () => {
    const surface = mountSurface()
    setupHook(fakeMap(), surface)
    dispatchMouse(surface, 'click', { clientX: 1, clientY: 2 })
    expect(useFeatureStore.getState().features.features).toHaveLength(0)
  })

  it('point tool: a click adds a Point feature and stays in point', () => {
    const surface = mountSurface()
    act(() => useFeatureStore.getState().setTool('point'))
    setupHook(fakeMap(), surface)
    act(() => {
      dispatchMouse(surface, 'click', { clientX: 1, clientY: 2 })
    })
    const state = useFeatureStore.getState()
    expect(state.features.features).toHaveLength(1)
    expect(state.features.features[0].geometry.type).toBe('Point')
    expect(state.tool).toBe('point')
  })

  it('polyline tool: first click starts a draft with a preview point', () => {
    const surface = mountSurface()
    act(() => useFeatureStore.getState().setTool('polyline'))
    setupHook(fakeMap(), surface)
    act(() => {
      dispatchMouse(surface, 'click', { clientX: 0, clientY: 0 })
    })
    const draft = useFeatureStore.getState().draftFeature
    expect(draft?.geometry.type).toBe('LineString')
  })

  it('polyline tool: subsequent clicks extend the draft', () => {
    const surface = mountSurface()
    act(() => useFeatureStore.getState().setTool('polyline'))
    setupHook(fakeMap(), surface)
    act(() => {
      dispatchMouse(surface, 'click', { clientX: 0, clientY: 0 })
    })
    act(() => {
      dispatchMouse(surface, 'click', { clientX: 1, clientY: 1 })
    })
    const draft = useFeatureStore.getState().draftFeature
    if (draft && draft.geometry.type === 'LineString') {
      expect(draft.geometry.coordinates).toHaveLength(3)
    } else {
      throw new Error('expected line draft')
    }
  })

  it('polyline tool: mousemove updates the live preview point', () => {
    const surface = mountSurface()
    act(() => useFeatureStore.getState().setTool('polyline'))
    setupHook(fakeMap(), surface)
    act(() => {
      dispatchMouse(surface, 'click', { clientX: 0, clientY: 0 })
    })
    act(() => {
      dispatchMouse(surface, 'mousemove', { clientX: 5, clientY: 5 })
    })
    const draft = useFeatureStore.getState().draftFeature
    if (draft && draft.geometry.type === 'LineString') {
      const last = draft.geometry.coordinates.at(-1)
      expect(last).toEqual([5, 5])
    } else {
      throw new Error('expected line draft')
    }
  })

  it('polyline tool: mousemove without a draft is a no-op', () => {
    const surface = mountSurface()
    act(() => useFeatureStore.getState().setTool('polyline'))
    setupHook(fakeMap(), surface)
    act(() => {
      dispatchMouse(surface, 'mousemove', { clientX: 5, clientY: 5 })
    })
    expect(useFeatureStore.getState().draftFeature).toBeNull()
  })

  it('polyline tool: dblclick commits a line', () => {
    const surface = mountSurface()
    act(() => useFeatureStore.getState().setTool('polyline'))
    setupHook(fakeMap(), surface)
    // Dblclick in the real browser is preceded by 2 click events; in jsdom we
    // dispatch them manually so the draft has enough committed vertices.
    for (let i = 0; i < 4; i++) {
      act(() => {
        dispatchMouse(surface, 'click', { clientX: i, clientY: i })
      })
    }
    act(() => {
      dispatchMouse(surface, 'dblclick', { clientX: 5, clientY: 5 })
    })
    expect(useFeatureStore.getState().features.features[0]?.geometry.type).toBe('LineString')
  })

  it('polyline tool: dblclick before enough points cancels the draft', () => {
    const surface = mountSurface()
    act(() => useFeatureStore.getState().setTool('polyline'))
    setupHook(fakeMap(), surface)
    act(() => {
      dispatchMouse(surface, 'click', { clientX: 0, clientY: 0 })
    })
    act(() => {
      dispatchMouse(surface, 'dblclick', { clientX: 1, clientY: 1 })
    })
    expect(useFeatureStore.getState().features.features).toHaveLength(0)
    expect(useFeatureStore.getState().draftFeature).toBeNull()
  })

  it('polyline tool: dblclick with no draft is a no-op', () => {
    const surface = mountSurface()
    act(() => useFeatureStore.getState().setTool('polyline'))
    setupHook(fakeMap(), surface)
    act(() => {
      dispatchMouse(surface, 'dblclick', { clientX: 1, clientY: 1 })
    })
    expect(useFeatureStore.getState().features.features).toHaveLength(0)
  })

  it('polygon tool: clicks build a polygon ring', () => {
    const surface = mountSurface()
    act(() => useFeatureStore.getState().setTool('polygon'))
    setupHook(fakeMap(), surface)
    act(() => {
      dispatchMouse(surface, 'click', { clientX: 0, clientY: 0 })
    })
    act(() => {
      dispatchMouse(surface, 'click', { clientX: 1, clientY: 0 })
    })
    const draft = useFeatureStore.getState().draftFeature
    if (draft && draft.geometry.type === 'Polygon') {
      expect(draft.geometry.coordinates[0].length).toBeGreaterThan(2)
    } else {
      throw new Error('expected polygon draft')
    }
  })

  it('polygon tool: mousemove updates the polygon preview', () => {
    const surface = mountSurface()
    act(() => useFeatureStore.getState().setTool('polygon'))
    setupHook(fakeMap(), surface)
    act(() => {
      dispatchMouse(surface, 'click', { clientX: 0, clientY: 0 })
    })
    act(() => {
      dispatchMouse(surface, 'mousemove', { clientX: 4, clientY: 5 })
    })
    const draft = useFeatureStore.getState().draftFeature
    if (draft && draft.geometry.type === 'Polygon') {
      expect(draft.geometry.coordinates[0].at(-1)).toEqual([4, 5])
    } else {
      throw new Error('expected polygon draft')
    }
  })

  it('polygon tool: mousemove without a draft is a no-op', () => {
    const surface = mountSurface()
    act(() => useFeatureStore.getState().setTool('polygon'))
    setupHook(fakeMap(), surface)
    act(() => {
      dispatchMouse(surface, 'mousemove', { clientX: 1, clientY: 2 })
    })
    expect(useFeatureStore.getState().draftFeature).toBeNull()
  })

  it('polygon tool: dblclick closes the polygon', () => {
    const surface = mountSurface()
    act(() => useFeatureStore.getState().setTool('polygon'))
    setupHook(fakeMap(), surface)
    const coords = [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
      [0.5, 0.5],
    ]
    for (const [x, y] of coords) {
      act(() => {
        dispatchMouse(surface, 'click', { clientX: x, clientY: y })
      })
    }
    act(() => {
      dispatchMouse(surface, 'dblclick', { clientX: 0.5, clientY: 0.5 })
    })
    expect(useFeatureStore.getState().features.features[0]?.geometry.type).toBe('Polygon')
  })

  it('polygon tool: dblclick before enough points cancels the draft', () => {
    const surface = mountSurface()
    act(() => useFeatureStore.getState().setTool('polygon'))
    setupHook(fakeMap(), surface)
    act(() => {
      dispatchMouse(surface, 'click', { clientX: 0, clientY: 0 })
    })
    act(() => {
      dispatchMouse(surface, 'dblclick', { clientX: 0, clientY: 0 })
    })
    expect(useFeatureStore.getState().features.features).toHaveLength(0)
  })

  it('Escape cancels an in-progress draft and stays in the active tool', () => {
    const surface = mountSurface()
    act(() => useFeatureStore.getState().setTool('polyline'))
    setupHook(fakeMap(), surface)
    act(() => {
      dispatchMouse(surface, 'click', { clientX: 0, clientY: 0 })
    })
    act(() => {
      dispatchKey('Escape')
    })
    expect(useFeatureStore.getState().draftFeature).toBeNull()
    expect(useFeatureStore.getState().tool).toBe('polyline')
  })

  it('Escape with no draft switches a drawing tool back to hand', () => {
    const surface = mountSurface()
    act(() => useFeatureStore.getState().setTool('polygon'))
    setupHook(fakeMap(), surface)
    expect(useFeatureStore.getState().draftFeature).toBeNull()
    act(() => {
      dispatchKey('Escape')
    })
    expect(useFeatureStore.getState().tool).toBe('hand')
  })

  it('Enter commits a polyline draft when it has enough points', () => {
    const surface = mountSurface()
    act(() => useFeatureStore.getState().setTool('polyline'))
    setupHook(fakeMap(), surface)
    act(() => {
      dispatchMouse(surface, 'click', { clientX: 0, clientY: 0 })
    })
    act(() => {
      dispatchMouse(surface, 'click', { clientX: 1, clientY: 1 })
    })
    act(() => {
      dispatchKey('Enter')
    })
    expect(useFeatureStore.getState().features.features[0]?.geometry.type).toBe('LineString')
  })

  it('Enter does nothing for a too-short polyline draft', () => {
    const surface = mountSurface()
    act(() => useFeatureStore.getState().setTool('polyline'))
    setupHook(fakeMap(), surface)
    act(() => {
      dispatchMouse(surface, 'click', { clientX: 0, clientY: 0 })
    })
    act(() => {
      dispatchKey('Enter')
    })
    expect(useFeatureStore.getState().features.features).toHaveLength(0)
  })

  it('Enter does nothing when there is no draft at all', () => {
    const surface = mountSurface()
    act(() => useFeatureStore.getState().setTool('polyline'))
    setupHook(fakeMap(), surface)
    act(() => {
      dispatchKey('Enter')
    })
    expect(useFeatureStore.getState().features.features).toHaveLength(0)
  })

  it('Enter commits a polygon draft when ring has enough points', () => {
    const surface = mountSurface()
    act(() => useFeatureStore.getState().setTool('polygon'))
    setupHook(fakeMap(), surface)
    act(() => {
      dispatchMouse(surface, 'click', { clientX: 0, clientY: 0 })
    })
    act(() => {
      dispatchMouse(surface, 'click', { clientX: 1, clientY: 0 })
    })
    act(() => {
      dispatchMouse(surface, 'click', { clientX: 1, clientY: 1 })
    })
    act(() => {
      dispatchKey('Enter')
    })
    expect(useFeatureStore.getState().features.features[0]?.geometry.type).toBe('Polygon')
  })

  it('Enter does nothing for a too-short polygon draft', () => {
    const surface = mountSurface()
    act(() => useFeatureStore.getState().setTool('polygon'))
    setupHook(fakeMap(), surface)
    act(() => {
      dispatchMouse(surface, 'click', { clientX: 0, clientY: 0 })
    })
    act(() => {
      dispatchKey('Enter')
    })
    expect(useFeatureStore.getState().features.features).toHaveLength(0)
  })

  it('Enter is a no-op when the active tool does not support it', () => {
    const surface = mountSurface()
    act(() => useFeatureStore.getState().setTool('point'))
    setupHook(fakeMap(), surface)
    act(() => {
      dispatchKey('Enter')
    })
    expect(useFeatureStore.getState().features.features).toHaveLength(0)
  })

  it('other keys are ignored', () => {
    const surface = mountSurface()
    act(() => useFeatureStore.getState().setTool('polyline'))
    setupHook(fakeMap(), surface)
    act(() => {
      dispatchKey('x')
    })
    expect(useFeatureStore.getState().tool).toBe('polyline')
  })

  it('removes listeners on unmount', () => {
    const surface = mountSurface()
    const removeSpy = vi.spyOn(surface, 'removeEventListener')
    act(() => useFeatureStore.getState().setTool('polyline'))
    const hook = setupHook(fakeMap(), surface)
    hook.unmount()
    expect(removeSpy).toHaveBeenCalled()
  })

  it('polygon tool: hovering the start vertex sets drawingCloseHover', () => {
    const surface = mountSurface()
    act(() => useFeatureStore.getState().setTool('polygon'))
    setupHook(fakeMap(), surface)
    // Place 3 real vertices, then preview at the start.
    for (const [x, y] of [
      [0, 0],
      [10, 0],
      [10, 10],
    ]) {
      act(() => {
        dispatchMouse(surface, 'click', { clientX: x, clientY: y })
      })
    }
    act(() => {
      dispatchMouse(surface, 'mousemove', { clientX: 0, clientY: 0 })
    })
    expect(useFeatureStore.getState().drawingCloseHover).toBe(true)
  })

  it('polygon tool: clicking the start vertex commits when close-hover is on', () => {
    const surface = mountSurface()
    act(() => useFeatureStore.getState().setTool('polygon'))
    setupHook(fakeMap(), surface)
    for (const [x, y] of [
      [0, 0],
      [10, 0],
      [10, 10],
    ]) {
      act(() => {
        dispatchMouse(surface, 'click', { clientX: x, clientY: y })
      })
    }
    act(() => {
      dispatchMouse(surface, 'mousemove', { clientX: 0, clientY: 0 })
    })
    act(() => {
      dispatchMouse(surface, 'click', { clientX: 0, clientY: 0 })
    })
    expect(useFeatureStore.getState().features.features[0]?.geometry.type).toBe('Polygon')
    expect(useFeatureStore.getState().tool).toBe('polygon')
  })

  it('polygon tool: clicking the start vertex commits even when no mousemove preceded the click', () => {
    const surface = mountSurface()
    act(() => useFeatureStore.getState().setTool('polygon'))
    setupHook(fakeMap(), surface)
    for (const [x, y] of [
      [0, 0],
      [10, 0],
      [10, 10],
    ]) {
      act(() => {
        dispatchMouse(surface, 'click', { clientX: x, clientY: y })
      })
    }
    expect(useFeatureStore.getState().drawingCloseHover).toBe(false)
    act(() => {
      dispatchMouse(surface, 'click', { clientX: 0, clientY: 0 })
    })
    const state = useFeatureStore.getState()
    expect(state.features.features[0]?.geometry.type).toBe('Polygon')
    expect(state.draftFeature).toBeNull()
    expect(state.tool).toBe('polygon')
  })

  it('polygon tool: a click far from v1 appends, even if drawingCloseHover is stale-true', () => {
    const surface = mountSurface()
    act(() => useFeatureStore.getState().setTool('polygon'))
    setupHook(fakeMap(), surface)
    for (const [x, y] of [
      [0, 0],
      [10, 0],
      [10, 10],
    ]) {
      act(() => {
        dispatchMouse(surface, 'click', { clientX: x, clientY: y })
      })
    }
    act(() => {
      dispatchMouse(surface, 'mousemove', { clientX: 0, clientY: 0 })
    })
    expect(useFeatureStore.getState().drawingCloseHover).toBe(true)
    act(() => {
      dispatchMouse(surface, 'click', { clientX: 100, clientY: 100 })
    })
    const state = useFeatureStore.getState()
    expect(state.features.features).toHaveLength(0)
    expect(state.draftFeature?.geometry.type).toBe('Polygon')
  })

  it('polygon tool: hover far from the start clears drawingCloseHover', () => {
    const surface = mountSurface()
    act(() => useFeatureStore.getState().setTool('polygon'))
    setupHook(fakeMap(), surface)
    for (const [x, y] of [
      [0, 0],
      [10, 0],
      [10, 10],
    ]) {
      act(() => {
        dispatchMouse(surface, 'click', { clientX: x, clientY: y })
      })
    }
    act(() => {
      dispatchMouse(surface, 'mousemove', { clientX: 100, clientY: 100 })
    })
    expect(useFeatureStore.getState().drawingCloseHover).toBe(false)
  })

  it('polygon tool: close-hover stays false until the ring has 3 real vertices', () => {
    const surface = mountSurface()
    act(() => useFeatureStore.getState().setTool('polygon'))
    setupHook(fakeMap(), surface)
    for (const [x, y] of [
      [0, 0],
      [10, 0],
    ]) {
      act(() => {
        dispatchMouse(surface, 'click', { clientX: x, clientY: y })
      })
    }
    act(() => {
      dispatchMouse(surface, 'mousemove', { clientX: 0, clientY: 0 })
    })
    expect(useFeatureStore.getState().drawingCloseHover).toBe(false)
  })

  it('polyline tool: Backspace removes the last real vertex', () => {
    const surface = mountSurface()
    act(() => useFeatureStore.getState().setTool('polyline'))
    setupHook(fakeMap(), surface)
    for (const [x, y] of [
      [0, 0],
      [1, 0],
      [2, 0],
    ]) {
      act(() => {
        dispatchMouse(surface, 'click', { clientX: x, clientY: y })
      })
    }
    act(() => {
      dispatchKey('Backspace')
    })
    const draft = useFeatureStore.getState().draftFeature
    if (draft && draft.geometry.type === 'LineString') {
      expect(draft.geometry.coordinates.length).toBeLessThan(4)
    } else {
      throw new Error('expected line draft')
    }
  })

  it('polyline tool: Backspace cancels when only one real vertex is left', () => {
    const surface = mountSurface()
    act(() => useFeatureStore.getState().setTool('polyline'))
    setupHook(fakeMap(), surface)
    act(() => {
      dispatchMouse(surface, 'click', { clientX: 0, clientY: 0 })
    })
    act(() => {
      dispatchKey('Backspace')
    })
    expect(useFeatureStore.getState().draftFeature).toBeNull()
  })

  it('polyline tool: Backspace with no draft is a no-op', () => {
    const surface = mountSurface()
    act(() => useFeatureStore.getState().setTool('polyline'))
    setupHook(fakeMap(), surface)
    act(() => {
      dispatchKey('Backspace')
    })
    expect(useFeatureStore.getState().draftFeature).toBeNull()
  })

  it('polyline tool: Delete behaves like Backspace', () => {
    const surface = mountSurface()
    act(() => useFeatureStore.getState().setTool('polyline'))
    setupHook(fakeMap(), surface)
    act(() => {
      dispatchMouse(surface, 'click', { clientX: 0, clientY: 0 })
    })
    act(() => {
      dispatchKey('Delete')
    })
    expect(useFeatureStore.getState().draftFeature).toBeNull()
  })

  it('polygon tool: Backspace removes the last real vertex', () => {
    const surface = mountSurface()
    act(() => useFeatureStore.getState().setTool('polygon'))
    setupHook(fakeMap(), surface)
    for (const [x, y] of [
      [0, 0],
      [50, 0],
      [50, 50],
      [0, 50],
    ]) {
      act(() => {
        dispatchMouse(surface, 'click', { clientX: x, clientY: y })
      })
    }
    act(() => {
      dispatchKey('Backspace')
    })
    expect(useFeatureStore.getState().draftFeature?.geometry.type).toBe('Polygon')
  })

  it('polygon tool: Backspace cancels when only one real vertex is left', () => {
    const surface = mountSurface()
    act(() => useFeatureStore.getState().setTool('polygon'))
    setupHook(fakeMap(), surface)
    act(() => {
      dispatchMouse(surface, 'click', { clientX: 0, clientY: 0 })
    })
    act(() => {
      dispatchKey('Backspace')
    })
    expect(useFeatureStore.getState().draftFeature).toBeNull()
  })

  it('polygon tool: Backspace clears close-hover when ring drops below 3 vertices', () => {
    const surface = mountSurface()
    act(() => useFeatureStore.getState().setTool('polygon'))
    setupHook(fakeMap(), surface)
    for (const [x, y] of [
      [0, 0],
      [10, 0],
      [10, 10],
    ]) {
      act(() => {
        dispatchMouse(surface, 'click', { clientX: x, clientY: y })
      })
    }
    act(() => {
      dispatchMouse(surface, 'mousemove', { clientX: 0, clientY: 0 })
    })
    expect(useFeatureStore.getState().drawingCloseHover).toBe(true)
    act(() => {
      dispatchKey('Backspace')
    })
    expect(useFeatureStore.getState().drawingCloseHover).toBe(false)
  })

  it('Backspace is a no-op outside of polyline/polygon tools', () => {
    const surface = mountSurface()
    act(() => useFeatureStore.getState().setTool('point'))
    setupHook(fakeMap(), surface)
    act(() => {
      dispatchKey('Backspace')
    })
    expect(useFeatureStore.getState().features.features).toHaveLength(0)
  })

  it('point tool: successive clicks add multiple points without re-selecting the tool', () => {
    const surface = mountSurface()
    act(() => useFeatureStore.getState().setTool('point'))
    setupHook(fakeMap(), surface)
    act(() => {
      dispatchMouse(surface, 'click', { clientX: 0, clientY: 0 })
    })
    act(() => {
      dispatchMouse(surface, 'click', { clientX: 5, clientY: 5 })
    })
    const state = useFeatureStore.getState()
    expect(state.features.features).toHaveLength(2)
    expect(state.features.features[0].geometry.type).toBe('Point')
    expect(state.features.features[1].geometry.type).toBe('Point')
    expect(state.tool).toBe('point')
  })

  it('polygon tool: dblclick commit keeps the tool active and a new click starts a fresh draft', () => {
    const surface = mountSurface()
    act(() => useFeatureStore.getState().setTool('polygon'))
    setupHook(fakeMap(), surface)
    for (const [x, y] of [
      [0, 0],
      [10, 0],
      [10, 10],
      [5, 5],
    ]) {
      act(() => {
        dispatchMouse(surface, 'click', { clientX: x, clientY: y })
      })
    }
    act(() => {
      dispatchMouse(surface, 'dblclick', { clientX: 5, clientY: 5 })
    })
    let state = useFeatureStore.getState()
    expect(state.features.features).toHaveLength(1)
    expect(state.tool).toBe('polygon')
    expect(state.draftFeature).toBeNull()
    act(() => {
      dispatchMouse(surface, 'click', { clientX: 20, clientY: 20 })
    })
    state = useFeatureStore.getState()
    expect(state.draftFeature?.geometry.type).toBe('Polygon')
    expect(state.tool).toBe('polygon')
  })

  it('polyline tool: Enter commit keeps the tool active and a new click starts a fresh draft', () => {
    const surface = mountSurface()
    act(() => useFeatureStore.getState().setTool('polyline'))
    setupHook(fakeMap(), surface)
    act(() => {
      dispatchMouse(surface, 'click', { clientX: 0, clientY: 0 })
    })
    act(() => {
      dispatchMouse(surface, 'click', { clientX: 5, clientY: 5 })
    })
    act(() => {
      dispatchKey('Enter')
    })
    let state = useFeatureStore.getState()
    expect(state.features.features).toHaveLength(1)
    expect(state.features.features[0].geometry.type).toBe('LineString')
    expect(state.tool).toBe('polyline')
    expect(state.draftFeature).toBeNull()
    act(() => {
      dispatchMouse(surface, 'click', { clientX: 20, clientY: 20 })
    })
    state = useFeatureStore.getState()
    expect(state.draftFeature?.geometry.type).toBe('LineString')
    expect(state.tool).toBe('polyline')
  })
})
