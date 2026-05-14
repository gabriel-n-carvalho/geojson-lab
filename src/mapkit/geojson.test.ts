import { describe, expect, it } from 'vitest'
import type { Feature } from 'geojson'
import { featureToItems, featureToRegion, draftToItems } from './geojson'
import { buildMapKitMock, MockPolylineOverlay, MockPolygonOverlay } from '../test/mapkit-mock'
import {
  samplePoint,
  sampleLine,
  samplePolygon,
  sampleMultiPoint,
  sampleMultiLine,
  sampleMultiPolygon,
  sampleGeometryCollection,
} from '../test/sample-geojson'

type RegionShape = {
  center: { latitude: number; longitude: number }
  span: { latitudeDelta: number; longitudeDelta: number }
}

describe('featureToItems', () => {
  it('returns no items when the feature has no id', () => {
    const mapkit = buildMapKitMock()
    const result = featureToItems(mapkit, { ...samplePoint, id: undefined })
    expect(result).toHaveLength(0)
  })

  it('converts a Point into a single annotation', () => {
    const mapkit = buildMapKitMock()
    const result = featureToItems(mapkit, samplePoint)
    expect(result).toHaveLength(1)
    expect(result[0].kind).toBe('annotation')
  })

  it('converts a selected Point into a selected annotation', () => {
    const mapkit = buildMapKitMock()
    const result = featureToItems(mapkit, samplePoint, true)
    expect(result).toHaveLength(1)
    expect(result[0].kind).toBe('annotation')
  })

  it('converts a MultiPoint into one annotation per coordinate', () => {
    const mapkit = buildMapKitMock()
    const result = featureToItems(mapkit, sampleMultiPoint)
    expect(result).toHaveLength(2)
    expect(result.every((r) => r.kind === 'annotation')).toBe(true)
  })

  it('converts a MultiPoint with selected=true', () => {
    const mapkit = buildMapKitMock()
    const result = featureToItems(mapkit, sampleMultiPoint, true)
    expect(result).toHaveLength(2)
  })

  it('converts a LineString into a polyline overlay', () => {
    const mapkit = buildMapKitMock()
    const result = featureToItems(mapkit, sampleLine)
    expect(result).toHaveLength(1)
    expect(result[0].kind).toBe('overlay')
  })

  it('converts a MultiLineString into one overlay per line', () => {
    const mapkit = buildMapKitMock()
    const result = featureToItems(mapkit, sampleMultiLine)
    expect(result).toHaveLength(2)
    expect(result.every((r) => r.kind === 'overlay')).toBe(true)
  })

  it('converts a Polygon into a polygon overlay', () => {
    const mapkit = buildMapKitMock()
    const result = featureToItems(mapkit, samplePolygon)
    expect(result).toHaveLength(1)
    expect(result[0].kind).toBe('overlay')
  })

  it('converts a MultiPolygon into one overlay per polygon', () => {
    const mapkit = buildMapKitMock()
    const result = featureToItems(mapkit, sampleMultiPolygon)
    expect(result).toHaveLength(1)
    expect(result.every((r) => r.kind === 'overlay')).toBe(true)
  })

  it('flattens a GeometryCollection through its sub-geometries', () => {
    const mapkit = buildMapKitMock()
    const result = featureToItems(mapkit, sampleGeometryCollection)
    // Point + LineString = 1 annotation + 1 overlay
    expect(result).toHaveLength(2)
    expect(result.map((r) => r.kind).sort()).toEqual(['annotation', 'overlay'])
  })

  it('falls back to an empty list for unknown geometry types', () => {
    const mapkit = buildMapKitMock()
    const f = {
      type: 'Feature',
      id: 'x',
      properties: {},
      geometry: { type: 'WhoKnows' as never, coordinates: [] },
    } as unknown as Feature
    const result = featureToItems(mapkit, f)
    expect(result).toHaveLength(0)
  })

  it('handles features with null properties', () => {
    const mapkit = buildMapKitMock()
    const f: Feature = { ...samplePoint, properties: null }
    const result = featureToItems(mapkit, f)
    expect(result).toHaveLength(1)
  })
})

describe('draftToItems', () => {
  it('returns one annotation for a Point draft', () => {
    const mapkit = buildMapKitMock()
    const draft: Feature = {
      type: 'Feature',
      properties: {},
      geometry: { type: 'Point', coordinates: [0, 0] },
    }
    const items = draftToItems(mapkit, draft)
    expect(items).toHaveLength(1)
    expect(items[0].kind).toBe('annotation')
  })

  it('returns an overlay and vertex dots for a LineString draft with >= 2 points', () => {
    const mapkit = buildMapKitMock()
    const draft: Feature = {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: [
          [0, 0],
          [1, 1],
          [2, 2],
        ],
      },
    }
    const items = draftToItems(mapkit, draft)
    // 1 polyline overlay + 2 vertex annotations (committed = all but the cursor preview)
    expect(items.length).toBeGreaterThan(1)
    expect(items.filter((i) => i.kind === 'overlay')).toHaveLength(1)
    expect(items.filter((i) => i.kind === 'annotation').length).toBeGreaterThan(0)
  })

  it('returns nothing for a LineString draft with fewer than 2 points', () => {
    const mapkit = buildMapKitMock()
    const draft: Feature = {
      type: 'Feature',
      properties: {},
      geometry: { type: 'LineString', coordinates: [[0, 0]] },
    }
    expect(draftToItems(mapkit, draft)).toHaveLength(0)
  })

  it('returns an overlay and vertex dots for a Polygon draft with a valid ring', () => {
    const mapkit = buildMapKitMock()
    const draft: Feature = {
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
    }
    const items = draftToItems(mapkit, draft)
    expect(items.length).toBeGreaterThan(1)
    const overlays = items.filter((i) => i.kind === 'overlay')
    expect(overlays).toHaveLength(1)
    expect(overlays[0].instance).toBeInstanceOf(MockPolygonOverlay)
  })

  it('renders a polyline overlay for a Polygon draft with only 2 ring coords (1 real vertex + cursor)', () => {
    const mapkit = buildMapKitMock()
    const draft: Feature = {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [0, 0],
            [3, 4],
          ],
        ],
      },
    }
    const items = draftToItems(mapkit, draft)
    const overlays = items.filter((i) => i.kind === 'overlay')
    expect(overlays).toHaveLength(1)
    expect(overlays[0].instance).toBeInstanceOf(MockPolylineOverlay)
    expect(overlays[0].instance).not.toBeInstanceOf(MockPolygonOverlay)
    // One committed vertex (the cursor-preview tail is excluded)
    expect(items.filter((i) => i.kind === 'annotation')).toHaveLength(1)
  })

  it('shows the close cue dot when closeHover is set and the ring has 3+ committed vertices', () => {
    const mapkit = buildMapKitMock()
    const draft: Feature = {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [0, 0],
            [1, 0],
            [1, 1],
            [0, 1],
            [0, 0],
          ],
        ],
      },
    }
    const items = draftToItems(mapkit, draft, { closeHover: true })
    expect(items.length).toBeGreaterThan(1)
  })

  it('returns nothing for a Polygon draft with fewer than 2 ring points', () => {
    const mapkit = buildMapKitMock()
    const draft: Feature = {
      type: 'Feature',
      properties: {},
      geometry: { type: 'Polygon', coordinates: [[[0, 0]]] },
    }
    expect(draftToItems(mapkit, draft)).toHaveLength(0)
  })

  it('returns nothing for unsupported geometry types', () => {
    const mapkit = buildMapKitMock()
    const draft: Feature = {
      type: 'Feature',
      properties: {},
      geometry: { type: 'MultiPoint', coordinates: [[0, 0]] },
    }
    expect(draftToItems(mapkit, draft)).toHaveLength(0)
  })
})

describe('featureToRegion', () => {
  it('centers on a Point with the default span', () => {
    const mapkit = buildMapKitMock()
    const region = featureToRegion(mapkit, samplePoint) as RegionShape | null
    expect(region).not.toBeNull()
    expect(region!.center.latitude).toBeCloseTo(37)
    expect(region!.center.longitude).toBeCloseTo(-122)
    expect(region!.span.latitudeDelta).toBeCloseTo(0.01)
    expect(region!.span.longitudeDelta).toBeCloseTo(0.01)
  })

  it('frames a LineString with padded span around the bbox', () => {
    const mapkit = buildMapKitMock()
    const region = featureToRegion(mapkit, sampleLine) as RegionShape | null
    expect(region).not.toBeNull()
    expect(region!.center.latitude).toBeCloseTo(37.005)
    expect(region!.center.longitude).toBeCloseTo(-122.005)
    // bbox 0.01° wide × 1.4 padding = 0.014
    expect(region!.span.latitudeDelta).toBeCloseTo(0.014)
    expect(region!.span.longitudeDelta).toBeCloseTo(0.014)
  })

  it('frames a Polygon by its outer ring', () => {
    const mapkit = buildMapKitMock()
    const region = featureToRegion(mapkit, samplePolygon) as RegionShape | null
    expect(region).not.toBeNull()
    expect(region!.center.latitude).toBeCloseTo(37.005)
    expect(region!.center.longitude).toBeCloseTo(-122.005)
    expect(region!.span.latitudeDelta).toBeCloseTo(0.014)
    expect(region!.span.longitudeDelta).toBeCloseTo(0.014)
  })

  it('unions bboxes across a MultiPoint', () => {
    const mapkit = buildMapKitMock()
    const region = featureToRegion(mapkit, sampleMultiPoint) as RegionShape | null
    expect(region).not.toBeNull()
    expect(region!.center.latitude).toBeCloseTo(37.005)
    expect(region!.center.longitude).toBeCloseTo(-121.995)
  })

  it('unions bboxes across a MultiLineString', () => {
    const mapkit = buildMapKitMock()
    const region = featureToRegion(mapkit, sampleMultiLine) as RegionShape | null
    expect(region).not.toBeNull()
    // lines span lng -122.01..-121.98 and lat 37..37.01
    expect(region!.center.latitude).toBeCloseTo(37.005)
    expect(region!.center.longitude).toBeCloseTo(-121.995)
  })

  it('unions bboxes across a MultiPolygon', () => {
    const mapkit = buildMapKitMock()
    const region = featureToRegion(mapkit, sampleMultiPolygon) as RegionShape | null
    expect(region).not.toBeNull()
    expect(region!.center.latitude).toBeCloseTo(37.005)
    expect(region!.center.longitude).toBeCloseTo(-122.005)
  })

  it('unions bboxes across a GeometryCollection', () => {
    const mapkit = buildMapKitMock()
    const region = featureToRegion(mapkit, sampleGeometryCollection) as RegionShape | null
    expect(region).not.toBeNull()
    // Point (-122, 37) + Line (-122..-122.01, 37..37.01)
    expect(region!.center.latitude).toBeCloseTo(37.005)
    expect(region!.center.longitude).toBeCloseTo(-122.005)
  })

  it('returns null for an empty GeometryCollection', () => {
    const mapkit = buildMapKitMock()
    const feature: Feature = {
      type: 'Feature',
      id: 'empty',
      properties: {},
      geometry: { type: 'GeometryCollection', geometries: [] },
    }
    expect(featureToRegion(mapkit, feature)).toBeNull()
  })

  it('returns null for an unsupported geometry type', () => {
    const mapkit = buildMapKitMock()
    const feature = {
      type: 'Feature',
      id: 'weird',
      properties: {},
      geometry: { type: 'WhoKnows', coordinates: [] },
    } as unknown as Feature
    expect(featureToRegion(mapkit, feature)).toBeNull()
  })

  it('clamps tiny extents to the minimum span', () => {
    const mapkit = buildMapKitMock()
    const tinyLine: Feature = {
      type: 'Feature',
      id: 'tiny',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: [
          [0, 0],
          [0.0000001, 0.0000001],
        ],
      },
    }
    const region = featureToRegion(mapkit, tinyLine) as RegionShape | null
    expect(region).not.toBeNull()
    expect(region!.span.latitudeDelta).toBeGreaterThanOrEqual(0.001)
    expect(region!.span.longitudeDelta).toBeGreaterThanOrEqual(0.001)
  })
})
