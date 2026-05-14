import { describe, it, expect } from 'vitest'
import type { FeatureCollection } from 'geojson'
import { computeFeatureRanges } from './feature-json-ranges'
import { sampleFC } from '../test/sample-geojson'

const emptyFC: FeatureCollection = { type: 'FeatureCollection', features: [] }

describe('computeFeatureRanges', () => {
  it('returns an empty array for an empty FeatureCollection', () => {
    const doc = JSON.stringify(emptyFC, null, 2)
    expect(computeFeatureRanges(doc)).toEqual([])
  })

  it('returns one range for a single-feature FeatureCollection', () => {
    const fc: FeatureCollection = { type: 'FeatureCollection', features: [sampleFC.features[0]] }
    const doc = JSON.stringify(fc, null, 2)
    const ranges = computeFeatureRanges(doc)
    expect(ranges).toHaveLength(1)
    const [r] = ranges
    expect(doc.slice(r.from, r.to).startsWith('{')).toBe(true)
    expect(doc.slice(r.from, r.to).endsWith('}')).toBe(true)
    expect(doc.slice(r.from, r.to)).toContain('"pt-1"')
    expect(r.fromLine).toBeGreaterThan(0)
    expect(r.toLine).toBeGreaterThanOrEqual(r.fromLine)
  })

  it('returns one range per feature, in document order', () => {
    const doc = JSON.stringify(sampleFC, null, 2)
    const ranges = computeFeatureRanges(doc)
    expect(ranges).toHaveLength(3)
    expect(doc.slice(ranges[0].from, ranges[0].to)).toContain('"pt-1"')
    expect(doc.slice(ranges[1].from, ranges[1].to)).toContain('"ln-1"')
    expect(doc.slice(ranges[2].from, ranges[2].to)).toContain('"pg-1"')
    expect(ranges[0].toLine).toBeLessThan(ranges[1].fromLine)
    expect(ranges[1].toLine).toBeLessThan(ranges[2].fromLine)
  })

  it('ignores nested "features" keys inside feature properties', () => {
    const fc: FeatureCollection = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          id: 'nested-1',
          properties: { features: { nested: true } },
          geometry: { type: 'Point', coordinates: [0, 0] },
        },
      ],
    }
    const doc = JSON.stringify(fc, null, 2)
    const ranges = computeFeatureRanges(doc)
    expect(ranges).toHaveLength(1)
    expect(doc.slice(ranges[0].from, ranges[0].to)).toContain('"nested-1"')
  })

  it('handles braces inside string values without miscounting', () => {
    const fc: FeatureCollection = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          id: 'brace-string',
          properties: { note: 'has } and { braces inside' },
          geometry: { type: 'Point', coordinates: [0, 0] },
        },
      ],
    }
    const doc = JSON.stringify(fc, null, 2)
    const ranges = computeFeatureRanges(doc)
    expect(ranges).toHaveLength(1)
    expect(doc.slice(ranges[0].from, ranges[0].to).endsWith('}')).toBe(true)
  })

  it('returns an empty array on unbalanced input', () => {
    expect(computeFeatureRanges('{ "features": [ { "type": "Feature"')).toEqual([])
  })

  it('returns an empty array when no top-level features key exists', () => {
    expect(computeFeatureRanges('{ "type": "Point", "coordinates": [0, 0] }')).toEqual([])
  })

  it('computes line numbers as 0-based newline counts', () => {
    const doc = JSON.stringify(sampleFC, null, 2)
    const ranges = computeFeatureRanges(doc)
    const lines = doc.split('\n')
    expect(lines[ranges[0].fromLine].trimStart().startsWith('{')).toBe(true)
    expect(lines[ranges[0].toLine].trimStart().startsWith('}')).toBe(true)
  })
})
