import { describe, expect, it } from 'vitest'
import { SAMPLE_FC } from './sample'

describe('SAMPLE_FC', () => {
  it('is a FeatureCollection with three features', () => {
    expect(SAMPLE_FC.type).toBe('FeatureCollection')
    expect(SAMPLE_FC.features).toHaveLength(3)
  })

  it('contains a Point, a LineString, and a Polygon', () => {
    const types = SAMPLE_FC.features.map((f) => f.geometry.type)
    expect(types).toEqual(['Point', 'LineString', 'Polygon'])
  })

  it('uses stable ids for the sample features', () => {
    expect(SAMPLE_FC.features.map((f) => f.id)).toEqual([
      'sample-point',
      'sample-line',
      'sample-polygon',
    ])
  })
})
