import { vi } from 'vitest'
import type { MapKitNamespace } from '../mapkit/types'

type Listener = (e: unknown) => void

class MockMap {
  element: HTMLElement
  private _region: unknown = null
  setRegionCalls: unknown[] = []
  center = { latitude: 0, longitude: 0 }
  mapType = 'standard'
  colorScheme = 'light'
  annotations: unknown[] = []
  overlays: unknown[] = []
  private listeners = new Map<string, Set<Listener>>()
  destroyImpl: () => void = () => undefined
  showItemsImpl: (items: unknown[]) => unknown[] = (items) => items

  constructor(element: HTMLElement, _options?: unknown) {
    this.element = element
    this.region = (_options as { region?: unknown })?.region ?? null
    setTimeout(() => this.fire('configuration-change', { status: 'Initialized' }), 0)
  }

  get region(): unknown {
    return this._region
  }
  set region(r: unknown) {
    this._region = r
    this.setRegionCalls.push(r)
  }

  fire(name: string, event: unknown) {
    this.listeners.get(name)?.forEach((l) => l(event))
  }
  addAnnotation = (a: unknown) => {
    this.annotations.push(a)
    return a
  }
  addAnnotations = (items: unknown[]) => {
    this.annotations.push(...items)
    return items
  }
  removeAnnotation = (a: unknown) => {
    this.annotations = this.annotations.filter((x) => x !== a)
    return a
  }
  removeAnnotations = (items: unknown[]) => {
    this.annotations = this.annotations.filter((x) => !items.includes(x))
    return items
  }
  addOverlay = (o: unknown) => {
    this.overlays.push(o)
    return o
  }
  addOverlays = (items: unknown[]) => {
    this.overlays.push(...items)
    return items
  }
  removeOverlay = (o: unknown) => {
    this.overlays = this.overlays.filter((x) => x !== o)
    return o
  }
  removeOverlays = (items: unknown[]) => {
    this.overlays = this.overlays.filter((x) => !items.includes(x))
    return items
  }
  convertPointOnPageToCoordinate = (p: { x: number; y: number }) => ({
    latitude: p.y,
    longitude: p.x,
  })
  convertCoordinateToPointOnPage = (c: { latitude: number; longitude: number }) => ({
    x: c.longitude,
    y: c.latitude,
  })
  showItems = (items: unknown[]) => this.showItemsImpl(items)
  addEventListener = (name: string, handler: Listener) => {
    if (!this.listeners.has(name)) this.listeners.set(name, new Set())
    this.listeners.get(name)!.add(handler)
  }
  removeEventListener = (name: string, handler: Listener) => {
    this.listeners.get(name)?.delete(handler)
  }
  destroy = () => this.destroyImpl()
}

class MockMarkerAnnotation {
  coordinate: { latitude: number; longitude: number }
  title = ''
  subtitle = ''
  data?: Record<string, unknown>
  selected = false
  private listeners = new Map<string, Set<Listener>>()

  constructor(
    coordinate: { latitude: number; longitude: number },
    options?: { color?: string; data?: Record<string, unknown>; selected?: boolean },
  ) {
    this.coordinate = coordinate
    this.data = options?.data
    this.selected = options?.selected ?? false
  }
  addEventListener = (name: string, handler: Listener) => {
    if (!this.listeners.has(name)) this.listeners.set(name, new Set())
    this.listeners.get(name)!.add(handler)
  }
  removeEventListener = (name: string, handler: Listener) => {
    this.listeners.get(name)?.delete(handler)
  }
  fire(name: string, event: unknown) {
    this.listeners.get(name)?.forEach((l) => l(event))
  }
}

class MockAnnotation {
  coordinate: { latitude: number; longitude: number }
  factory: (c: unknown, o: unknown) => HTMLElement
  data?: Record<string, unknown>
  title = ''
  subtitle = ''
  selected = false
  private listeners = new Map<string, Set<Listener>>()

  constructor(
    coordinate: { latitude: number; longitude: number },
    factory: (c: unknown, o: unknown) => HTMLElement,
    options?: { data?: Record<string, unknown>; selected?: boolean },
  ) {
    this.coordinate = coordinate
    this.factory = factory
    this.data = options?.data
    this.selected = options?.selected ?? false
  }
  addEventListener = (name: string, handler: Listener) => {
    if (!this.listeners.has(name)) this.listeners.set(name, new Set())
    this.listeners.get(name)!.add(handler)
  }
  removeEventListener = (name: string, handler: Listener) => {
    this.listeners.get(name)?.delete(handler)
  }
  fire(name: string, event: unknown) {
    this.listeners.get(name)?.forEach((l) => l(event))
  }
}

class MockOverlay {
  points: unknown
  style?: unknown
  data?: Record<string, unknown>
  selected = false
  private listeners = new Map<string, Set<Listener>>()

  constructor(points: unknown, options?: { style?: unknown; data?: Record<string, unknown> }) {
    this.points = points
    this.style = options?.style
    this.data = options?.data
  }
  addEventListener = (name: string, handler: Listener) => {
    if (!this.listeners.has(name)) this.listeners.set(name, new Set())
    this.listeners.get(name)!.add(handler)
  }
  removeEventListener = (name: string, handler: Listener) => {
    this.listeners.get(name)?.delete(handler)
  }
  fire(name: string, event: unknown) {
    this.listeners.get(name)?.forEach((l) => l(event))
  }
}

class MockPolylineOverlay extends MockOverlay {}
class MockPolygonOverlay extends MockOverlay {}

class MockCoordinate {
  latitude: number
  longitude: number
  constructor(latitude: number, longitude: number) {
    this.latitude = latitude
    this.longitude = longitude
  }
}

class MockCoordinateSpan {
  latitudeDelta: number
  longitudeDelta: number
  constructor(latitudeDelta: number, longitudeDelta: number) {
    this.latitudeDelta = latitudeDelta
    this.longitudeDelta = longitudeDelta
  }
}

class MockCoordinateRegion {
  center: unknown
  span: unknown
  constructor(center: unknown, span: unknown) {
    this.center = center
    this.span = span
  }
}

class MockStyle {
  lineWidth?: number
  strokeColor?: string
  strokeOpacity?: number
  fillColor?: string
  fillOpacity?: number
  lineDash?: number[]
  constructor(options?: Record<string, unknown>) {
    Object.assign(this, options ?? {})
  }
}

export function buildMapKitMock(): MapKitNamespace {
  return {
    init: vi.fn(),
    Map: MockMap as never,
    Coordinate: MockCoordinate as never,
    CoordinateSpan: MockCoordinateSpan as never,
    CoordinateRegion: MockCoordinateRegion as never,
    Annotation: MockAnnotation as never,
    MarkerAnnotation: MockMarkerAnnotation as never,
    PolylineOverlay: MockPolylineOverlay as never,
    PolygonOverlay: MockPolygonOverlay as never,
    Style: MockStyle as never,
    MapType: {
      Standard: 'standard',
      Hybrid: 'hybrid',
      Satellite: 'satellite',
      MutedStandard: 'mutedStandard',
    },
    FeatureVisibility: { Adaptive: 'adaptive', Hidden: 'hidden', Visible: 'visible' },
  }
}

export function installMapKitMock(): MapKitNamespace {
  const mock = buildMapKitMock()
  ;(window as unknown as { mapkit: MapKitNamespace }).mapkit = mock
  return mock
}

export function uninstallMapKitMock() {
  delete (window as unknown as { mapkit?: MapKitNamespace }).mapkit
  delete (window as unknown as { initMapKit?: () => void }).initMapKit
}

export {
  MockMap,
  MockMarkerAnnotation,
  MockAnnotation,
  MockOverlay,
  MockPolylineOverlay,
  MockPolygonOverlay,
}
