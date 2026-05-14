import { useEffect, useRef } from 'react'
import type { Feature, Position } from 'geojson'
import type { MapKitNamespace, MKMap } from '../mapkit/types'
import { useFeatureStore } from '../store/useFeatureStore'

type Props = {
  mapkit: MapKitNamespace | null
  map: MKMap | null
  surfaceRef: React.RefObject<HTMLElement | null>
}

const CLOSE_HOVER_PX = 14

/**
 * Binds page-level mouse + keyboard events on the drawing surface to the
 * currently-active tool. Each tool is a tiny state machine over the draft
 * feature in the store.
 */
export function useDrawingTool({ mapkit, map, surfaceRef }: Props) {
  const tool = useFeatureStore((s) => s.tool)
  const setTool = useFeatureStore((s) => s.setTool)
  const setDraft = useFeatureStore((s) => s.setDraft)
  const draftRef = useRef<Feature | null>(null)
  const addFeature = useFeatureStore((s) => s.addFeature)
  const setDrawingCloseHover = useFeatureStore((s) => s.setDrawingCloseHover)
  const pushToast = useFeatureStore((s) => s.pushToast)

  const draft = useFeatureStore((s) => s.draftFeature)
  useEffect(() => {
    draftRef.current = draft
  }, [draft])

  useEffect(() => {
    const surface = surfaceRef.current
    if (!mapkit || !map || !surface || tool === 'hand') return

    const toCoord = (e: { clientX: number; clientY: number }): Position => {
      const c = map.convertPointOnPageToCoordinate(new DOMPoint(e.clientX, e.clientY))
      return [c.longitude, c.latitude]
    }

    const isWithinClosePx = (
      e: { clientX: number; clientY: number },
      ringCoords: Position[],
    ): boolean => {
      if (ringCoords.length < 3) return false
      const [startLng, startLat] = ringCoords[0]
      const startPt = map.convertCoordinateToPointOnPage(new mapkit.Coordinate(startLat, startLng))
      const dx = startPt.x - e.clientX
      const dy = startPt.y - e.clientY
      return Math.hypot(dx, dy) <= CLOSE_HOVER_PX
    }

    const cancel = () => {
      setDraft(null)
      setDrawingCloseHover(false)
    }

    const commitLineDraft = (coords: Position[]) => {
      if (coords.length < 2) return
      addFeature({ type: 'LineString', coordinates: coords })
      pushToast('success', `Line added (${coords.length} points)`)
    }

    const commitPolygonDraft = (ring: Position[]) => {
      if (ring.length < 3) return
      const closed = [...ring, ring[0]]
      addFeature({ type: 'Polygon', coordinates: [closed] })
      pushToast('success', `Polygon added (${ring.length} vertices)`)
    }

    const onClick = (e: MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      const p = toCoord(e)

      if (tool === 'point') {
        addFeature({ type: 'Point', coordinates: p })
        pushToast('success', 'Point added')
        return
      }

      if (tool === 'polyline') {
        const current = draftRef.current
        const coords =
          current && current.geometry.type === 'LineString'
            ? [...(current.geometry.coordinates as Position[]).slice(0, -1), p, p]
            : [p, p] // last point is the live cursor preview
        setDraft({
          type: 'Feature',
          properties: {},
          geometry: { type: 'LineString', coordinates: coords },
        })
        return
      }

      if (tool === 'polygon') {
        const current = draftRef.current
        if (current && current.geometry.type === 'Polygon') {
          const realRing = (current.geometry.coordinates as Position[][])[0].slice(0, -1)
          if (isWithinClosePx(e, realRing)) {
            commitPolygonDraft(realRing)
            cancel()
            return
          }
        }
        const ringCoords =
          current && current.geometry.type === 'Polygon'
            ? [...(current.geometry.coordinates as Position[][])[0].slice(0, -1), p, p]
            : [p, p]
        setDraft({
          type: 'Feature',
          properties: {},
          geometry: { type: 'Polygon', coordinates: [ringCoords] },
        })
        return
      }
    }

    const onMouseMove = (e: MouseEvent) => {
      const p = toCoord(e)

      if (tool === 'polyline') {
        const current = draftRef.current
        if (!current || current.geometry.type !== 'LineString') return
        const coords = current.geometry.coordinates as Position[]
        if (coords.length === 0) return
        const next = [...coords.slice(0, -1), p]
        setDraft({
          ...current,
          geometry: { type: 'LineString', coordinates: next },
        })
        return
      }

      if (tool === 'polygon') {
        const current = draftRef.current
        if (!current || current.geometry.type !== 'Polygon') return
        const ringCoords = (current.geometry.coordinates as Position[][])[0]
        if (ringCoords.length === 0) return
        const next = [...ringCoords.slice(0, -1), p]
        setDraft({
          ...current,
          geometry: { type: 'Polygon', coordinates: [next] },
        })

        const real = ringCoords.slice(0, -1)
        const nextHover = isWithinClosePx(e, real)
        if (useFeatureStore.getState().drawingCloseHover !== nextHover) {
          setDrawingCloseHover(nextHover)
        }
        return
      }
    }

    const onDblClick = (e: MouseEvent) => {
      if (tool !== 'polyline' && tool !== 'polygon') return
      e.preventDefault()
      e.stopPropagation()
      const current = draftRef.current
      if (!current) return

      if (current.geometry.type === 'LineString') {
        const coords = (current.geometry.coordinates as Position[]).slice(0, -2)
        if (coords.length < 2) {
          cancel()
          return
        }
        commitLineDraft(coords)
      } else if (current.geometry.type === 'Polygon') {
        const ringCoords = (current.geometry.coordinates as Position[][])[0].slice(0, -2)
        if (ringCoords.length < 3) {
          cancel()
          return
        }
        commitPolygonDraft(ringCoords)
      }
      cancel()
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        if (draftRef.current) {
          cancel()
        } else {
          setTool('hand')
        }
        return
      }
      if (e.key === 'Enter') {
        if (tool === 'polyline' || tool === 'polygon') {
          const current = draftRef.current
          if (!current) return
          if (current.geometry.type === 'LineString') {
            const coords = (current.geometry.coordinates as Position[]).slice(0, -1)
            if (coords.length < 2) return
            commitLineDraft(coords)
          } else if (current.geometry.type === 'Polygon') {
            const ringCoords = (current.geometry.coordinates as Position[][])[0].slice(0, -1)
            if (ringCoords.length < 3) return
            commitPolygonDraft(ringCoords)
          }
          cancel()
        }
        return
      }
      if (e.key === 'Backspace' || e.key === 'Delete') {
        if (tool !== 'polyline' && tool !== 'polygon') return
        const current = draftRef.current
        if (!current) return
        e.preventDefault()

        if (current.geometry.type === 'LineString') {
          const coords = current.geometry.coordinates as Position[]
          const real = coords.slice(0, -1)
          if (real.length <= 1) {
            cancel()
            return
          }
          const cursor = coords[coords.length - 1]
          const next = [...real.slice(0, -1), cursor]
          setDraft({
            ...current,
            geometry: { type: 'LineString', coordinates: next },
          })
        } else if (current.geometry.type === 'Polygon') {
          const ringCoords = (current.geometry.coordinates as Position[][])[0]
          const real = ringCoords.slice(0, -1)
          if (real.length <= 1) {
            cancel()
            return
          }
          const cursor = ringCoords[ringCoords.length - 1]
          const next = [...real.slice(0, -1), cursor]
          setDraft({
            ...current,
            geometry: { type: 'Polygon', coordinates: [next] },
          })
          if (next.length - 1 < 3) setDrawingCloseHover(false)
        }
      }
    }

    surface.addEventListener('click', onClick)
    surface.addEventListener('mousemove', onMouseMove)
    surface.addEventListener('dblclick', onDblClick)
    window.addEventListener('keydown', onKeyDown)

    return () => {
      surface.removeEventListener('click', onClick)
      surface.removeEventListener('mousemove', onMouseMove)
      surface.removeEventListener('dblclick', onDblClick)
      window.removeEventListener('keydown', onKeyDown)
      cancel()
    }
  }, [
    mapkit,
    map,
    surfaceRef,
    tool,
    addFeature,
    setDraft,
    setTool,
    setDrawingCloseHover,
    pushToast,
  ])
}
