// Hand-rolled, minimal MapKit JS types covering only the surface this app uses.
// Reference: https://developer.apple.com/documentation/mapkitjs/

export {}

declare global {
  interface Window {
    mapkit: MapKitNamespace
    initMapKit?: () => void
  }
}

export interface MapKitNamespace {
  init(options: {
    authorizationCallback: (done: (token: string) => void) => void
    language?: string
  }): void

  Map: MapConstructor

  Coordinate: { new (latitude: number, longitude: number): MKCoordinate }
  CoordinateSpan: { new (latitudeDelta: number, longitudeDelta: number): MKCoordinateSpan }
  CoordinateRegion: {
    new (center: MKCoordinate, span: MKCoordinateSpan): MKCoordinateRegion
  }

  MarkerAnnotation: MarkerAnnotationConstructor
  Annotation: AnnotationConstructor
  PolylineOverlay: PolylineOverlayConstructor
  PolygonOverlay: PolygonOverlayConstructor
  Style: StyleConstructor

  MapType: {
    Standard: MKMapType
    Hybrid: MKMapType
    Satellite: MKMapType
    MutedStandard: MKMapType
  }

  FeatureVisibility: {
    Adaptive: MKFeatureVisibility
    Hidden: MKFeatureVisibility
    Visible: MKFeatureVisibility
  }

  importGeoJSON?: (
    data: string | object,
    callback?: {
      itemForFeature?: unknown
      geoJSONDidComplete?: (items: unknown[]) => void
      geoJSONDidError?: (err: Error) => void
    },
  ) => void
}

export type MKMapType = string
export type MKFeatureVisibility = string

export interface MKCoordinate {
  latitude: number
  longitude: number
}

export interface MKCoordinateSpan {
  latitudeDelta: number
  longitudeDelta: number
}

export interface MKCoordinateRegion {
  center: MKCoordinate
  span: MKCoordinateSpan
}

export interface StyleOptions {
  lineWidth?: number
  strokeColor?: string
  strokeOpacity?: number
  fillColor?: string
  fillOpacity?: number
  lineDash?: number[]
}

export interface StyleConstructor {
  new (options?: StyleOptions): MKStyle
}

export type MKStyle = StyleOptions

export interface MarkerAnnotationOptions {
  title?: string
  subtitle?: string
  color?: string
  selected?: boolean
  data?: Record<string, unknown>
}

export interface MarkerAnnotationConstructor {
  new (coordinate: MKCoordinate, options?: MarkerAnnotationOptions): MKAnnotation
}

export interface AnnotationOptions {
  data?: Record<string, unknown>
  anchorOffset?: DOMPoint
  appearanceAnimation?: string
  draggable?: boolean
  selected?: boolean
  title?: string
  subtitle?: string
}

export type AnnotationFactory = (
  coordinate: MKCoordinate,
  options: AnnotationOptions,
) => HTMLElement

export interface AnnotationConstructor {
  new (
    coordinate: MKCoordinate,
    factory: AnnotationFactory,
    options?: AnnotationOptions,
  ): MKAnnotation
}

export interface MKAnnotation {
  coordinate: MKCoordinate
  title: string
  subtitle: string
  data?: Record<string, unknown>
  selected: boolean
  addEventListener(name: string, handler: (e: unknown) => void): void
  removeEventListener(name: string, handler: (e: unknown) => void): void
}

export interface PolylineOverlayConstructor {
  new (
    points: MKCoordinate[],
    options?: { style?: MKStyle; data?: Record<string, unknown> },
  ): MKOverlay
}

export interface PolygonOverlayConstructor {
  new (
    points: MKCoordinate[] | MKCoordinate[][],
    options?: { style?: MKStyle; data?: Record<string, unknown> },
  ): MKOverlay
}

export interface MKOverlay {
  points?: MKCoordinate[] | MKCoordinate[][]
  style?: MKStyle
  data?: Record<string, unknown>
  selected: boolean
  addEventListener(name: string, handler: (e: unknown) => void): void
  removeEventListener(name: string, handler: (e: unknown) => void): void
}

export interface MapConstructor {
  new (element: HTMLElement, options?: MapOptions): MKMap
}

export interface MapOptions {
  center?: MKCoordinate
  region?: MKCoordinateRegion
  mapType?: MKMapType
  isRotationEnabled?: boolean
  isZoomEnabled?: boolean
  isScrollEnabled?: boolean
  showsCompass?: MKFeatureVisibility
  showsScale?: MKFeatureVisibility
  showsMapTypeControl?: boolean
  showsZoomControl?: boolean
  showsUserLocationControl?: boolean
  colorScheme?: string
}

export interface MKMap {
  element: HTMLElement
  region: MKCoordinateRegion
  center: MKCoordinate
  mapType: MKMapType
  colorScheme: string

  addAnnotation(a: MKAnnotation): MKAnnotation
  addAnnotations(a: MKAnnotation[]): MKAnnotation[]
  removeAnnotation(a: MKAnnotation): MKAnnotation
  removeAnnotations(a: MKAnnotation[]): MKAnnotation[]
  annotations: MKAnnotation[]

  addOverlay(o: MKOverlay): MKOverlay
  addOverlays(o: MKOverlay[]): MKOverlay[]
  removeOverlay(o: MKOverlay): MKOverlay
  removeOverlays(o: MKOverlay[]): MKOverlay[]
  overlays: MKOverlay[]

  convertPointOnPageToCoordinate(point: DOMPoint): MKCoordinate
  convertCoordinateToPointOnPage(coord: MKCoordinate): DOMPoint

  showItems(
    items: unknown[],
    options?: {
      animate?: boolean
      padding?: number | { top: number; right: number; bottom: number; left: number }
    },
  ): unknown[]

  setRegionAnimated?(region: MKCoordinateRegion, animate?: boolean): void

  addEventListener(name: string, handler: (e: unknown) => void): void
  removeEventListener(name: string, handler: (e: unknown) => void): void

  destroy(): void
}
