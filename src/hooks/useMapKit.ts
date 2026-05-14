import { useEffect, useRef, useState } from 'react'
import { loadMapKit } from '../mapkit/loader'
import type { MKMap, MapKitNamespace } from '../mapkit/types'

export type MapKitStatus = 'idle' | 'loading' | 'ready' | 'error' | 'unauthorized'

export type MapKitState = {
  mapkit: MapKitNamespace | null
  map: MKMap | null
  status: MapKitStatus
  error?: string
}

const DEFAULT_REGION = { lat: 37.3349, lng: -122.009, latDelta: 0.05, lngDelta: 0.05 }

export function useMapKit(containerRef: React.RefObject<HTMLElement | null>): MapKitState {
  const [state, setState] = useState<MapKitState>({ mapkit: null, map: null, status: 'idle' })
  const mapRef = useRef<MKMap | null>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    let disposed = false
    setState((s) => ({ ...s, status: 'loading' }))

    loadMapKit()
      .then(({ mapkit, tokenSource }) => {
        if (disposed) return

        const region = new mapkit.CoordinateRegion(
          new mapkit.Coordinate(DEFAULT_REGION.lat, DEFAULT_REGION.lng),
          new mapkit.CoordinateSpan(DEFAULT_REGION.latDelta, DEFAULT_REGION.lngDelta),
        )

        const map = new mapkit.Map(el, {
          region,
          showsCompass: mapkit.FeatureVisibility.Adaptive,
          showsScale: mapkit.FeatureVisibility.Adaptive,
          showsMapTypeControl: true,
          showsZoomControl: true,
          isRotationEnabled: true,
        })

        mapRef.current = map

        let unauthorized = tokenSource === 'missing'

        const onConfigError = () => {
          unauthorized = true
          setState({ mapkit, map, status: 'unauthorized' })
        }

        map.addEventListener('configuration-change', () => {
          if (!unauthorized) setState({ mapkit, map, status: 'ready' })
        })
        map.addEventListener('error', onConfigError)

        setState({
          mapkit,
          map,
          status: unauthorized ? 'unauthorized' : 'ready',
        })
      })
      .catch((err) => {
        if (disposed) return
        setState({ mapkit: null, map: null, status: 'error', error: (err as Error).message })
      })

    return () => {
      disposed = true
      if (mapRef.current) {
        try {
          mapRef.current.destroy()
        } catch {
          // swallow — destroy may throw if map didn't fully init
        }
        mapRef.current = null
      }
    }
  }, [containerRef])

  return state
}
