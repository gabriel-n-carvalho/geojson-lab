import { useEffect, useMemo, useRef } from 'react'
import { useFeatureStore, type ToolMode } from '../store/useFeatureStore'
import { useMapKit } from '../hooks/useMapKit'
import { useDrawingTool } from '../hooks/useDrawingTool'
import { useDropImport } from '../hooks/useDropImport'
import { draftToItems, featureToItems, featureToRegion, type RenderedItem } from '../mapkit/geojson'
import { PointIcon, PolygonIcon, PolylineIcon } from './icons'
import { formatArea, formatDistance, polygonAreaMeters, polylineLengthMeters } from '../lib/measure'
import type { Feature, Position } from 'geojson'
import type { MapKitNamespace, MKMap } from '../mapkit/types'
import styles from './MapCanvas.module.css'

const STATUS_LABEL: Record<string, string> = {
  idle: 'MapKit JS — idle',
  loading: 'MapKit JS — loading…',
  ready: 'MapKit JS — ready',
  unauthorized: 'MapKit JS — needs a JWT token',
  error: 'MapKit JS — failed to load',
}

const STATUS_DOT: Record<string, string> = {
  idle: 'idle',
  loading: 'loading',
  ready: 'ready',
  unauthorized: 'error',
  error: 'error',
}

type RenderEntry = { feature: Feature; selected: boolean; items: RenderedItem[] }

export function MapCanvas() {
  const wrapRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const surfaceRef = useRef<HTMLDivElement>(null)
  const { mapkit, map, status } = useMapKit(containerRef)
  const features = useFeatureStore((s) => s.features)
  const draft = useFeatureStore((s) => s.draftFeature)
  const selectedId = useFeatureStore((s) => s.selectedId)
  const setSelected = useFeatureStore((s) => s.setSelected)
  const tool = useFeatureStore((s) => s.tool)
  const setTool = useFeatureStore((s) => s.setTool)
  const hiddenIds = useFeatureStore((s) => s.hiddenIds)
  const toggleHidden = useFeatureStore((s) => s.toggleHidden)
  const flyToId = useFeatureStore((s) => s.flyToId)
  const clearFlyTo = useFeatureStore((s) => s.clearFlyTo)
  const drawingCloseHover = useFeatureStore((s) => s.drawingCloseHover)
  const isEmpty = features.features.length === 0
  const isDrawing = tool !== 'hand'

  useDrawingTool({ mapkit, map, surfaceRef })
  const dropping = useDropImport(wrapRef)

  const renderedRef = useRef<Map<string, RenderEntry>>(new Map())
  const draftItemsRef = useRef<RenderedItem[]>([])

  useEffect(() => {
    if (!map) return
    const handler = () => setSelected(null)
    map.addEventListener('single-tap', handler)
    return () => map.removeEventListener('single-tap', handler)
  }, [map, setSelected])

  useEffect(() => {
    if (!mapkit || !map) return
    const visible = features.features.filter((f) => {
      const id = String(f.id ?? '')
      return id && !hiddenIds.has(id)
    })
    syncFeatures(mapkit, map, visible, selectedId, renderedRef.current, (id) => setSelected(id))
  }, [mapkit, map, features, selectedId, setSelected, hiddenIds])

  // Fly-to: compute the target region from the feature's GeoJSON and animate to it.
  // Works regardless of whether the feature has been rendered to the map yet, so the
  // click is reliable even for hidden layers or right-after-import races.
  useEffect(() => {
    if (!mapkit || !map || !flyToId) return
    const feature = features.features.find((f) => String(f.id ?? '') === flyToId)
    if (!feature) {
      clearFlyTo()
      return
    }
    if (hiddenIds.has(flyToId)) {
      toggleHidden(flyToId)
    }
    const region = featureToRegion(mapkit, feature)
    if (region) {
      try {
        if (typeof map.setRegionAnimated === 'function') {
          map.setRegionAnimated(region, true)
        } else {
          // MapKit Map is an external resource (not React state); region is a settable property.
          // eslint-disable-next-line react-hooks/immutability
          map.region = region
        }
      } catch (err) {
        console.warn('flyTo: failed to set map region', err)
      }
    }
    clearFlyTo()
  }, [mapkit, map, flyToId, features, hiddenIds, toggleHidden, clearFlyTo])

  useEffect(() => {
    if (!mapkit || !map) return
    // Clear previous draft
    removeItems(map, draftItemsRef.current)
    draftItemsRef.current = []

    if (!draft) return
    const items = draftToItems(mapkit, draft, { closeHover: drawingCloseHover })
    addItems(map, items)
    draftItemsRef.current = items
  }, [mapkit, map, draft, drawingCloseHover])

  const measurement = useMemo(() => computeMeasurement(draft), [draft])

  return (
    <div className={styles.wrap} ref={wrapRef}>
      <div
        ref={containerRef}
        className={`${styles.map} ${styles[`cursor-${tool}`]}`}
        aria-label="Map canvas"
      />
      <div
        ref={surfaceRef}
        className={`${styles.surface} ${styles[`cursor-${tool}`]}`}
        data-active={tool !== 'hand'}
        aria-hidden="true"
      />
      {isEmpty && status === 'ready' && !isDrawing && (
        <div className={styles.empty}>
          <div className={styles.emptyCard}>
            <h2 className={styles.emptyTitle}>Start drawing on the map</h2>
            <p className={styles.emptyText}>
              Pick a tool above, drop a <code>.geojson</code> file here, or paste GeoJSON into the
              editor on the right.
            </p>
            <button type="button" className={styles.emptyCta} onClick={() => setTool('polygon')}>
              <PolygonIcon width={14} height={14} />
              Draw a polygon
            </button>
            <div className={styles.emptyKbd}>
              <span>Shortcuts:</span>
              <kbd>H</kbd> <kbd>P</kbd> <kbd>L</kbd> <kbd>G</kbd>
            </div>
          </div>
        </div>
      )}
      {isDrawing && status === 'ready' && <DrawingBanner tool={tool} measurement={measurement} />}
      {status === 'unauthorized' && (
        <div className={styles.empty}>
          <div className={styles.emptyCard}>
            <h2 className={styles.emptyTitle}>MapKit JS needs a JWT token</h2>
            <p className={styles.emptyText}>
              The map can't render tiles until <code>/api/mapkit-token</code> returns a valid JWT.
              Set <code>MAPKIT_TEAM_ID</code>, <code>MAPKIT_KEY_ID</code>, and{' '}
              <code>MAPKIT_PRIVATE_KEY</code> (see <code>.env.example</code>) and run with{' '}
              <code>vercel dev</code>. The editor and drawing tools still work without it.
            </p>
          </div>
        </div>
      )}
      {dropping && <div className={styles.dropOverlay}>Drop GeoJSON to import</div>}
      <div className={styles.statusPill}>
        <span className={styles.statusDot} data-state={STATUS_DOT[status]} />
        <span>{STATUS_LABEL[status]}</span>
      </div>
    </div>
  )
}

function syncFeatures(
  mapkit: MapKitNamespace,
  map: MKMap,
  features: Feature[],
  selectedId: string | null,
  rendered: Map<string, RenderEntry>,
  onSelect: (id: string) => void,
) {
  const seen = new Set<string>()

  for (const feature of features) {
    const id = String(feature.id ?? '')
    if (!id) continue
    seen.add(id)
    const isSelected = id === selectedId
    const prev = rendered.get(id)
    if (prev && prev.feature === feature && prev.selected === isSelected) {
      continue
    }
    if (prev) {
      removeItems(map, prev.items)
    }
    const items = featureToItems(mapkit, feature, isSelected)
    addItems(map, items)
    for (const item of items) {
      const handler = () => onSelect(id)
      item.instance.addEventListener('select', handler)
    }
    rendered.set(id, { feature, selected: isSelected, items })
  }

  for (const [id, entry] of rendered) {
    if (!seen.has(id)) {
      removeItems(map, entry.items)
      rendered.delete(id)
    }
  }
}

function addItems(map: MKMap, items: RenderedItem[]) {
  const annos = items.filter((i) => i.kind === 'annotation').map((i) => i.instance)
  const overlays = items.filter((i) => i.kind === 'overlay').map((i) => i.instance)
  if (annos.length) map.addAnnotations(annos as never)
  if (overlays.length) map.addOverlays(overlays as never)
}

function removeItems(map: MKMap, items: RenderedItem[]) {
  const annos = items.filter((i) => i.kind === 'annotation').map((i) => i.instance)
  const overlays = items.filter((i) => i.kind === 'overlay').map((i) => i.instance)
  if (annos.length) map.removeAnnotations(annos as never)
  if (overlays.length) map.removeOverlays(overlays as never)
}

const DRAWING_COPY: Record<
  Exclude<ToolMode, 'hand'>,
  { label: string; hint: string; Icon: typeof PointIcon }
> = {
  point: {
    label: 'Point',
    hint: 'Click anywhere to drop a pin · Esc to cancel',
    Icon: PointIcon,
  },
  polyline: {
    label: 'Line',
    hint: 'Click to add points · Double-click or Enter to finish · ⌫ undo · Esc to cancel',
    Icon: PolylineIcon,
  },
  polygon: {
    label: 'Polygon',
    hint: 'Click to add points · Click the start vertex or double-click to finish · ⌫ undo · Esc to cancel',
    Icon: PolygonIcon,
  },
}

function DrawingBanner({ tool, measurement }: { tool: ToolMode; measurement: string | null }) {
  if (tool === 'hand') return null
  const { label, hint, Icon } = DRAWING_COPY[tool]
  return (
    <div className={styles.drawingBanner} role="status" aria-live="polite">
      <span className={styles.drawingBannerIcon} aria-hidden="true">
        <Icon width={14} height={14} />
      </span>
      <span className={styles.drawingBannerLabel}>{label}</span>
      <span className={styles.drawingBannerSep} aria-hidden="true" />
      <span className={styles.drawingBannerHint}>{hint}</span>
      {measurement && <span className={styles.drawingBannerMeasure}>{measurement}</span>}
    </div>
  )
}

function computeMeasurement(draft: Feature | null): string | null {
  if (!draft) return null
  const g = draft.geometry
  if (g.type === 'LineString') {
    const coords = g.coordinates as Position[]
    if (coords.length < 2) return null
    return formatDistance(polylineLengthMeters(coords))
  }
  if (g.type === 'Polygon') {
    const ring = (g.coordinates as Position[][])[0]
    if (!ring || ring.length < 3) return null
    return formatArea(polygonAreaMeters(ring))
  }
  return null
}
