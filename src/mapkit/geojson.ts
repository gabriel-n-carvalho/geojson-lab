import type {
  Feature,
  Geometry,
  Point,
  LineString,
  Polygon,
  MultiPoint,
  MultiLineString,
  MultiPolygon,
  Position,
} from 'geojson'
import type {
  MapKitNamespace,
  MKAnnotation,
  MKCoordinate,
  MKCoordinateRegion,
  MKOverlay,
  MKStyle,
} from './types'

export type RenderedItem =
  | { kind: 'annotation'; featureId: string; instance: MKAnnotation }
  | { kind: 'overlay'; featureId: string; instance: MKOverlay }

const STYLE_DEFAULTS = {
  stroke: '#0a84ff',
  fill: '#0a84ff',
  strokeWidth: 2,
  fillOpacity: 0.2,
  strokeOpacity: 1,
}

const STYLE_SELECTED = {
  stroke: '#ff9500',
  fill: '#ff9500',
  strokeWidth: 3,
  fillOpacity: 0.3,
  strokeOpacity: 1,
}

const pos = (mapkit: MapKitNamespace, [lng, lat]: Position): MKCoordinate =>
  new mapkit.Coordinate(lat, lng)

const ring = (mapkit: MapKitNamespace, r: Position[]): MKCoordinate[] =>
  r.map((p) => pos(mapkit, p))

const styleFor = (mapkit: MapKitNamespace, selected: boolean): MKStyle => {
  const s = selected ? STYLE_SELECTED : STYLE_DEFAULTS
  return new mapkit.Style({
    strokeColor: s.stroke,
    fillColor: s.fill,
    lineWidth: s.strokeWidth,
    fillOpacity: s.fillOpacity,
    strokeOpacity: s.strokeOpacity,
  })
}

export function featureToItems(
  mapkit: MapKitNamespace,
  feature: Feature,
  selected = false,
): RenderedItem[] {
  const id = String(feature.id ?? '')
  if (!id) return []
  return geometryToItems(mapkit, feature.geometry, id, selected, feature.properties)
}

const DEFAULT_POINT_SPAN = 0.01
const PADDING_FACTOR = 1.4
const MIN_SPAN = 0.001

function collectPositions(g: Geometry): Position[] {
  switch (g.type) {
    case 'Point':
      return [g.coordinates]
    case 'MultiPoint':
    case 'LineString':
      return g.coordinates
    case 'MultiLineString':
    case 'Polygon':
      return g.coordinates.flat()
    case 'MultiPolygon':
      return g.coordinates.flat(2)
    case 'GeometryCollection':
      return g.geometries.flatMap(collectPositions)
    default:
      return []
  }
}

export function featureToRegion(
  mapkit: MapKitNamespace,
  feature: Feature,
): MKCoordinateRegion | null {
  const positions = collectPositions(feature.geometry)
  if (positions.length === 0) return null
  let minLng = Infinity
  let minLat = Infinity
  let maxLng = -Infinity
  let maxLat = -Infinity
  for (const [lng, lat] of positions) {
    if (lng < minLng) minLng = lng
    if (lng > maxLng) maxLng = lng
    if (lat < minLat) minLat = lat
    if (lat > maxLat) maxLat = lat
  }
  const centerLat = (minLat + maxLat) / 2
  const centerLng = (minLng + maxLng) / 2
  const isSinglePoint = minLng === maxLng && minLat === maxLat
  const spanLat = isSinglePoint
    ? DEFAULT_POINT_SPAN
    : Math.max((maxLat - minLat) * PADDING_FACTOR, MIN_SPAN)
  const spanLng = isSinglePoint
    ? DEFAULT_POINT_SPAN
    : Math.max((maxLng - minLng) * PADDING_FACTOR, MIN_SPAN)
  return new mapkit.CoordinateRegion(
    new mapkit.Coordinate(centerLat, centerLng),
    new mapkit.CoordinateSpan(spanLat, spanLng),
  )
}

function geometryToItems(
  mapkit: MapKitNamespace,
  g: Geometry,
  featureId: string,
  selected: boolean,
  properties: Record<string, unknown> | null,
): RenderedItem[] {
  const data = { featureId, properties: properties ?? {} }
  const style = styleFor(mapkit, selected)

  switch (g.type) {
    case 'Point': {
      const p = (g as Point).coordinates
      const anno = new mapkit.MarkerAnnotation(pos(mapkit, p), {
        color: selected ? STYLE_SELECTED.stroke : STYLE_DEFAULTS.stroke,
        data,
        selected,
      })
      return [{ kind: 'annotation', featureId, instance: anno }]
    }

    case 'MultiPoint': {
      return (g as MultiPoint).coordinates.map((p) => ({
        kind: 'annotation' as const,
        featureId,
        instance: new mapkit.MarkerAnnotation(pos(mapkit, p), {
          color: selected ? STYLE_SELECTED.stroke : STYLE_DEFAULTS.stroke,
          data,
          selected,
        }),
      }))
    }

    case 'LineString': {
      const pts = ring(mapkit, (g as LineString).coordinates)
      return [
        {
          kind: 'overlay',
          featureId,
          instance: new mapkit.PolylineOverlay(pts, { style, data }),
        },
      ]
    }

    case 'MultiLineString': {
      return (g as MultiLineString).coordinates.map((line) => ({
        kind: 'overlay' as const,
        featureId,
        instance: new mapkit.PolylineOverlay(ring(mapkit, line), { style, data }),
      }))
    }

    case 'Polygon': {
      const rings = (g as Polygon).coordinates.map((r) => ring(mapkit, r))
      return [
        {
          kind: 'overlay',
          featureId,
          instance: new mapkit.PolygonOverlay(rings, { style, data }),
        },
      ]
    }

    case 'MultiPolygon': {
      return (g as MultiPolygon).coordinates.flatMap((poly) => {
        const rings = poly.map((r) => ring(mapkit, r))
        return [
          {
            kind: 'overlay' as const,
            featureId,
            instance: new mapkit.PolygonOverlay(rings, { style, data }),
          },
        ]
      })
    }

    case 'GeometryCollection': {
      return g.geometries.flatMap((sub) =>
        geometryToItems(mapkit, sub, featureId, selected, properties),
      )
    }

    default:
      return []
  }
}

type DraftOptions = { closeHover?: boolean }

const DRAFT_BLUE = '#0a84ff'
const DRAFT_ID = '__draft__'

function vertexDotFactory(kind: 'normal' | 'close-hover'): (c: MKCoordinate) => HTMLElement {
  return () => {
    const el = document.createElement('div')
    const isCloseHover = kind === 'close-hover'
    const size = isCloseHover ? 14 : 8
    el.style.width = `${size}px`
    el.style.height = `${size}px`
    el.style.borderRadius = '50%'
    el.style.background = DRAFT_BLUE
    el.style.border = `2px solid ${isCloseHover ? '#ffffff' : '#ffffff'}`
    el.style.boxShadow = isCloseHover
      ? `0 0 0 3px rgba(10, 132, 255, 0.35), 0 2px 6px rgba(0, 0, 0, 0.18)`
      : `0 1px 3px rgba(0, 0, 0, 0.25)`
    el.style.pointerEvents = 'none'
    el.style.boxSizing = 'border-box'
    el.style.transition = 'transform 120ms ease, box-shadow 120ms ease'
    return el
  }
}

function vertexAnnotation(
  mapkit: MapKitNamespace,
  coord: Position,
  isCloseHover: boolean,
): RenderedItem {
  return {
    kind: 'annotation',
    featureId: DRAFT_ID,
    instance: new mapkit.Annotation(
      pos(mapkit, coord),
      vertexDotFactory(isCloseHover ? 'close-hover' : 'normal'),
      {
        data: { featureId: DRAFT_ID, draft: true, vertex: true },
        anchorOffset: new DOMPoint(0, 0),
      },
    ),
  }
}

/** Build a draft overlay/annotation while the user is drawing. */
export function draftToItems(
  mapkit: MapKitNamespace,
  draft: Feature,
  options: DraftOptions = {},
): RenderedItem[] {
  const style = new mapkit.Style({
    strokeColor: DRAFT_BLUE,
    fillColor: DRAFT_BLUE,
    lineWidth: 2,
    fillOpacity: 0.1,
    strokeOpacity: 1,
    lineDash: [6, 4],
  })

  const g = draft.geometry

  if (g.type === 'Point') {
    return [
      {
        kind: 'annotation',
        featureId: DRAFT_ID,
        instance: new mapkit.MarkerAnnotation(pos(mapkit, (g as Point).coordinates), {
          color: DRAFT_BLUE,
          data: { featureId: DRAFT_ID, draft: true },
        }),
      },
    ]
  }

  if (g.type === 'LineString') {
    const coords = (g as LineString).coordinates
    if (coords.length < 2) return []
    const items: RenderedItem[] = [
      {
        kind: 'overlay',
        featureId: DRAFT_ID,
        instance: new mapkit.PolylineOverlay(ring(mapkit, coords), {
          style,
          data: { featureId: DRAFT_ID, draft: true },
        }),
      },
    ]
    // Vertex dots for every committed point (exclude the cursor-preview tail).
    const committed = coords.slice(0, -1)
    for (const c of committed) {
      items.push(vertexAnnotation(mapkit, c, false))
    }
    return items
  }

  if (g.type === 'Polygon') {
    const rings = (g as Polygon).coordinates
    if (rings[0].length < 2) return []
    // MapKit's PolygonOverlay needs ≥3 vertices to paint. While the ring only
    // holds 1 real vertex + cursor preview, render the edge as a polyline so
    // the user sees the in-progress line from the first click.
    const edgeOverlay: RenderedItem =
      rings[0].length < 3
        ? {
            kind: 'overlay',
            featureId: DRAFT_ID,
            instance: new mapkit.PolylineOverlay(ring(mapkit, rings[0]), {
              style,
              data: { featureId: DRAFT_ID, draft: true },
            }),
          }
        : {
            kind: 'overlay',
            featureId: DRAFT_ID,
            instance: new mapkit.PolygonOverlay(
              rings.map((r) => ring(mapkit, r)),
              { style, data: { featureId: DRAFT_ID, draft: true } },
            ),
          }
    const items: RenderedItem[] = [edgeOverlay]
    const committed = rings[0].slice(0, -1)
    committed.forEach((c, idx) => {
      const isStart = idx === 0
      const showCloseCue = isStart && options.closeHover === true && committed.length >= 3
      items.push(vertexAnnotation(mapkit, c, showCloseCue))
    })
    return items
  }

  return []
}
