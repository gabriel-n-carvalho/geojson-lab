import { create } from 'zustand'
import type { Feature, FeatureCollection, Geometry } from 'geojson'
import { nanoid } from 'nanoid'

export type ToolMode = 'hand' | 'point' | 'polyline' | 'polygon'

export type ToastKind = 'info' | 'error' | 'success'
export type Toast = { id: string; kind: ToastKind; message: string }

const emptyFC = (): FeatureCollection => ({ type: 'FeatureCollection', features: [] })

type State = {
  features: FeatureCollection
  selectedId: string | null
  tool: ToolMode
  draftFeature: Feature | null
  drawingCloseHover: boolean
  toasts: Toast[]
  lastEditSource: 'editor' | 'map' | 'import' | 'init'
  hiddenIds: Set<string>
  flyToId: string | null
}

type Actions = {
  setTool: (tool: ToolMode) => void
  setSelected: (id: string | null) => void
  addFeature: (geom: Geometry, properties?: Record<string, unknown>) => string
  updateFeatureGeometry: (id: string, geom: Geometry) => void
  deleteFeature: (id: string) => void
  clearAll: () => void
  replaceAll: (fc: FeatureCollection, source?: State['lastEditSource']) => void
  setDraft: (f: Feature | null) => void
  setDrawingCloseHover: (hover: boolean) => void
  pushToast: (kind: ToastKind, message: string) => void
  dismissToast: (id: string) => void
  toggleHidden: (id: string) => void
  flyTo: (id: string) => void
  clearFlyTo: () => void
}

const ensureId = (f: Feature): Feature => {
  if (f.id != null) return f
  return { ...f, id: nanoid(8) }
}

export const useFeatureStore = create<State & Actions>((set, get) => ({
  features: emptyFC(),
  selectedId: null,
  tool: 'hand',
  draftFeature: null,
  drawingCloseHover: false,
  toasts: [],
  lastEditSource: 'init',
  hiddenIds: new Set<string>(),
  flyToId: null,

  setTool: (tool) => set({ tool, draftFeature: null, drawingCloseHover: false }),

  setSelected: (selectedId) => set({ selectedId }),

  addFeature: (geometry, properties = {}) => {
    const id = nanoid(8)
    const feature: Feature = { type: 'Feature', id, geometry, properties }
    set((s) => ({
      features: { ...s.features, features: [...s.features.features, feature] },
      lastEditSource: 'map',
      selectedId: id,
    }))
    return id
  },

  updateFeatureGeometry: (id, geometry) =>
    set((s) => ({
      features: {
        ...s.features,
        features: s.features.features.map((f) => (f.id === id ? { ...f, geometry } : f)),
      },
      lastEditSource: 'map',
    })),

  deleteFeature: (id) =>
    set((s) => ({
      features: {
        ...s.features,
        features: s.features.features.filter((f) => f.id !== id),
      },
      selectedId: s.selectedId === id ? null : s.selectedId,
      lastEditSource: 'map',
    })),

  clearAll: () =>
    set({
      features: emptyFC(),
      selectedId: null,
      draftFeature: null,
      drawingCloseHover: false,
      hiddenIds: new Set<string>(),
      tool: 'hand',
      lastEditSource: 'map',
    }),

  replaceAll: (fc, source = 'editor') => {
    const features = (fc.features || []).map(ensureId)
    set({
      features: { type: 'FeatureCollection', features },
      selectedId: null,
      draftFeature: null,
      drawingCloseHover: false,
      lastEditSource: source,
    })
  },

  setDraft: (draftFeature) =>
    set((s) => ({
      draftFeature,
      drawingCloseHover: draftFeature ? s.drawingCloseHover : false,
    })),

  setDrawingCloseHover: (drawingCloseHover) => set({ drawingCloseHover }),

  pushToast: (kind, message) => {
    const id = nanoid(6)
    set((s) => ({ toasts: [...s.toasts, { id, kind, message }] }))
    setTimeout(() => get().dismissToast(id), 4000)
  },

  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  toggleHidden: (id) =>
    set((s) => {
      const next = new Set(s.hiddenIds)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return { hiddenIds: next }
    }),

  flyTo: (id) => set({ flyToId: id, selectedId: id }),

  clearFlyTo: () => set({ flyToId: null }),
}))
