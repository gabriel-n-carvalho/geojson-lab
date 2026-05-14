import { check } from '@placemarkio/check-geojson'
import type { FeatureCollection, Feature, Geometry } from 'geojson'

export type ValidationResult = { ok: true; value: FeatureCollection } | { ok: false; error: string }

const wrap = (g: Geometry): Feature => ({ type: 'Feature', properties: {}, geometry: g })

export function checkGeoJSON(input: unknown): ValidationResult {
  try {
    const text = typeof input === 'string' ? input : JSON.stringify(input)
    const parsed = check(text)

    if (parsed.type === 'FeatureCollection') {
      return { ok: true, value: parsed as FeatureCollection }
    }
    if (parsed.type === 'Feature') {
      return {
        ok: true,
        value: { type: 'FeatureCollection', features: [parsed as Feature] },
      }
    }
    return {
      ok: true,
      value: { type: 'FeatureCollection', features: [wrap(parsed as Geometry)] },
    }
  } catch (err) {
    return { ok: false, error: (err as Error).message }
  }
}
