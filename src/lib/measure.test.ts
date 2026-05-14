import { describe, expect, it } from 'vitest'
import {
  haversineMeters,
  polylineLengthMeters,
  polygonAreaMeters,
  formatDistance,
  formatArea,
} from './measure'

describe('haversineMeters', () => {
  it('returns 0 for the same point', () => {
    expect(haversineMeters([-122, 37], [-122, 37])).toBe(0)
  })

  it('approximates 1 degree of longitude at the equator (~111 km)', () => {
    const d = haversineMeters([0, 0], [1, 0])
    expect(d).toBeGreaterThan(111_000)
    expect(d).toBeLessThan(112_000)
  })

  it('approximates SF → NY (~4130 km)', () => {
    const sf: [number, number] = [-122.4194, 37.7749]
    const ny: [number, number] = [-74.006, 40.7128]
    const d = haversineMeters(sf, ny) / 1000
    expect(d).toBeGreaterThan(4100)
    expect(d).toBeLessThan(4150)
  })
})

describe('polylineLengthMeters', () => {
  it('sums consecutive segments', () => {
    const total = polylineLengthMeters([
      [0, 0],
      [1, 0],
      [1, 1],
    ])
    const seg1 = haversineMeters([0, 0], [1, 0])
    const seg2 = haversineMeters([1, 0], [1, 1])
    expect(total).toBeCloseTo(seg1 + seg2, 0)
  })

  it('returns 0 for fewer than 2 points', () => {
    expect(polylineLengthMeters([])).toBe(0)
    expect(polylineLengthMeters([[0, 0]])).toBe(0)
  })
})

describe('polygonAreaMeters', () => {
  it('returns 0 for under 3 vertices', () => {
    expect(polygonAreaMeters([])).toBe(0)
    expect(
      polygonAreaMeters([
        [0, 0],
        [1, 0],
      ]),
    ).toBe(0)
  })

  it('approximates a 1°x1° square at the equator (~12,308 km²)', () => {
    const area =
      polygonAreaMeters([
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1],
      ]) / 1_000_000
    expect(area).toBeGreaterThan(12_000)
    expect(area).toBeLessThan(12_400)
  })

  it('handles an already-closed ring (last point equals first)', () => {
    const open = polygonAreaMeters([
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
    ])
    const closed = polygonAreaMeters([
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
      [0, 0],
    ])
    expect(closed).toBeCloseTo(open, 0)
  })
})

describe('formatDistance', () => {
  it('uses meters under 1 km', () => {
    expect(formatDistance(245)).toBe('245 m')
    expect(formatDistance(999.4)).toBe('999 m')
  })

  it('uses km with 2 decimals between 1 km and 10 km', () => {
    expect(formatDistance(1000)).toBe('1.00 km')
    expect(formatDistance(3420)).toBe('3.42 km')
  })

  it('uses km with 1 decimal beyond 10 km', () => {
    expect(formatDistance(42_000)).toBe('42.0 km')
  })

  it('handles zero / invalid input', () => {
    expect(formatDistance(0)).toBe('0 m')
    expect(formatDistance(NaN)).toBe('0 m')
  })
})

describe('formatArea', () => {
  it('uses m² under 1 ha', () => {
    expect(formatArea(512)).toBe('512 m²')
  })

  it('uses hectares for 1 ha — 100 ha', () => {
    expect(formatArea(10_000)).toBe('1.00 ha')
    expect(formatArea(50_000)).toBe('5.00 ha')
  })

  it('uses km² beyond 1 km²', () => {
    expect(formatArea(1_240_000)).toBe('1.24 km²')
    expect(formatArea(42_000_000)).toBe('42.0 km²')
  })

  it('handles zero', () => {
    expect(formatArea(0)).toBe('0 m²')
  })
})
