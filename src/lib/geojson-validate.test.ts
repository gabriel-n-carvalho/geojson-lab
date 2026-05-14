import { describe, expect, it } from 'vitest'
import { checkGeoJSON } from './geojson-validate'
import { samplePoint, sampleFC } from '../test/sample-geojson'

describe('checkGeoJSON', () => {
  it('accepts a FeatureCollection passed as a string', () => {
    const result = checkGeoJSON(JSON.stringify(sampleFC))
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.type).toBe('FeatureCollection')
      expect(result.value.features).toHaveLength(3)
    }
  })

  it('accepts a FeatureCollection passed as an object', () => {
    const result = checkGeoJSON(sampleFC)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value.features).toHaveLength(3)
  })

  it('wraps a bare Feature in a FeatureCollection', () => {
    const result = checkGeoJSON(samplePoint)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.type).toBe('FeatureCollection')
      expect(result.value.features[0].geometry.type).toBe('Point')
    }
  })

  it('wraps a bare Geometry in a FeatureCollection', () => {
    const geom = { type: 'Point', coordinates: [-122, 37] }
    const result = checkGeoJSON(geom)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.features).toHaveLength(1)
      expect(result.value.features[0].geometry).toEqual(geom)
    }
  })

  it('returns an error for malformed input', () => {
    const result = checkGeoJSON('{not json')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(typeof result.error).toBe('string')
  })

  it('returns an error for non-GeoJSON shape', () => {
    const result = checkGeoJSON({ foo: 'bar' })
    expect(result.ok).toBe(false)
  })
})
