import type { Position } from 'geojson'

const EARTH_RADIUS_M = 6_371_008.8

const toRad = (deg: number): number => (deg * Math.PI) / 180

export function haversineMeters(a: Position, b: Position): number {
  const [lng1, lat1] = a
  const [lng2, lat2] = b
  const φ1 = toRad(lat1)
  const φ2 = toRad(lat2)
  const dφ = toRad(lat2 - lat1)
  const dλ = toRad(lng2 - lng1)
  const sinDφ = Math.sin(dφ / 2)
  const sinDλ = Math.sin(dλ / 2)
  const h = sinDφ * sinDφ + Math.cos(φ1) * Math.cos(φ2) * sinDλ * sinDλ
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)))
}

export function polylineLengthMeters(coords: Position[]): number {
  let total = 0
  for (let i = 1; i < coords.length; i++) {
    total += haversineMeters(coords[i - 1], coords[i])
  }
  return total
}

/**
 * Spherical polygon area using the L'Huilier-derived formula attributed to
 * Robert Chamberlain & William Duquette (NASA JPL). Ring is treated as closed
 * (last point may or may not duplicate first).
 */
export function polygonAreaMeters(ring: Position[]): number {
  if (ring.length < 3) return 0
  const closed =
    ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1]
      ? ring
      : [...ring, ring[0]]
  let total = 0
  for (let i = 0; i < closed.length - 1; i++) {
    const [lng1, lat1] = closed[i]
    const [lng2, lat2] = closed[i + 1]
    total += toRad(lng2 - lng1) * (2 + Math.sin(toRad(lat1)) + Math.sin(toRad(lat2)))
  }
  return Math.abs((total * EARTH_RADIUS_M * EARTH_RADIUS_M) / 2)
}

export function polygonNetAreaMeters(rings: Position[][]): number {
  if (rings.length === 0) return 0
  const outer = polygonAreaMeters(rings[0])
  let holes = 0
  for (let i = 1; i < rings.length; i++) holes += polygonAreaMeters(rings[i])
  return Math.max(0, outer - holes)
}

export function formatDistance(m: number): string {
  if (!isFinite(m) || m <= 0) return '0 m'
  if (m < 1000) return `${Math.round(m)} m`
  return `${(m / 1000).toFixed(m < 10_000 ? 2 : 1)} km`
}

export function formatArea(m2: number): string {
  if (!isFinite(m2) || m2 <= 0) return '0 m²'
  if (m2 < 10_000) return `${Math.round(m2)} m²`
  if (m2 < 1_000_000) return `${(m2 / 10_000).toFixed(2)} ha`
  return `${(m2 / 1_000_000).toFixed(m2 < 10_000_000 ? 2 : 1)} km²`
}
