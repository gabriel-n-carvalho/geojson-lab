import type { Feature, Geometry } from 'geojson'
import { useFeatureStore } from '../store/useFeatureStore'
import {
  polylineLengthMeters,
  polygonNetAreaMeters,
  formatDistance,
  formatArea,
} from '../lib/measure'
import {
  EyeIcon,
  EyeOffIcon,
  PointIcon,
  PolylineIcon,
  PolygonIcon,
  SparkleIcon,
  TrashIcon,
} from './icons'
import { SAMPLE_FC } from '../lib/sample'
import styles from './LayersPanel.module.css'

const GEOM_ICON = {
  Point: PointIcon,
  MultiPoint: PointIcon,
  LineString: PolylineIcon,
  MultiLineString: PolylineIcon,
  Polygon: PolygonIcon,
  MultiPolygon: PolygonIcon,
  GeometryCollection: PolygonIcon,
} as const

const labelFor = (feature: Feature): string => {
  const props = feature.properties as Record<string, unknown> | null
  if (props) {
    for (const key of ['name', 'Name', 'title', 'label']) {
      const v = props[key]
      if (typeof v === 'string' && v.trim()) return v
    }
  }
  return `${feature.geometry.type}`
}

const subtitleFor = (geometry: Geometry, id: string): string => {
  switch (geometry.type) {
    case 'Point':
      return `${id} · ${geometry.coordinates[1].toFixed(4)}, ${geometry.coordinates[0].toFixed(4)}`
    case 'MultiPoint':
      return `${id} · ${geometry.coordinates.length} points`
    case 'LineString':
      return `${id} · ${formatDistance(polylineLengthMeters(geometry.coordinates))}`
    case 'MultiLineString': {
      const total = geometry.coordinates.reduce((sum, line) => sum + polylineLengthMeters(line), 0)
      return `${id} · ${formatDistance(total)}`
    }
    case 'Polygon':
      return `${id} · ${formatArea(polygonNetAreaMeters(geometry.coordinates))}`
    case 'MultiPolygon': {
      const total = geometry.coordinates.reduce((sum, poly) => sum + polygonNetAreaMeters(poly), 0)
      return `${id} · ${formatArea(total)}`
    }
    default:
      return id
  }
}

export function LayersPanel() {
  const features = useFeatureStore((s) => s.features.features)
  const selectedId = useFeatureStore((s) => s.selectedId)
  const hiddenIds = useFeatureStore((s) => s.hiddenIds)
  const flyTo = useFeatureStore((s) => s.flyTo)
  const setSelected = useFeatureStore((s) => s.setSelected)
  const toggleHidden = useFeatureStore((s) => s.toggleHidden)
  const deleteFeature = useFeatureStore((s) => s.deleteFeature)
  const replaceAll = useFeatureStore((s) => s.replaceAll)

  return (
    <aside className={styles.panel} aria-label="Feature list">
      <div className={styles.header}>
        <span>Layers</span>
        <span className={styles.count}>{features.length}</span>
      </div>
      {features.length === 0 ? (
        <div className={styles.empty}>
          <p className={styles.emptyText}>
            No layers yet. Draw on the map or import a GeoJSON file to get started.
          </p>
          <button
            type="button"
            className={styles.emptyCta}
            onClick={() => replaceAll(SAMPLE_FC, 'import')}
          >
            <SparkleIcon width={14} height={14} />
            Load sample data
          </button>
        </div>
      ) : (
        <div className={styles.list} role="list">
          {features.map((feature) => {
            const id = String(feature.id ?? '')
            if (!id) return null
            const Icon = GEOM_ICON[feature.geometry.type] ?? PointIcon
            const hidden = hiddenIds.has(id)
            const selected = id === selectedId
            const handleActivate = () => {
              if (selected) setSelected(null)
              else flyTo(id)
            }
            return (
              <div
                key={id}
                className={styles.item}
                role="listitem"
                data-selected={selected}
                data-hidden={hidden}
                onClick={handleActivate}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    handleActivate()
                  }
                }}
              >
                <span
                  className={styles.geomBadge}
                  data-kind={feature.geometry.type}
                  aria-hidden="true"
                >
                  <Icon width={14} height={14} />
                </span>
                <span className={styles.label}>
                  <span className={styles.name}>{labelFor(feature)}</span>
                  <span className={styles.subtitle}>{subtitleFor(feature.geometry, id)}</span>
                </span>
                <button
                  type="button"
                  className={styles.visBtn}
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleHidden(id)
                  }}
                  aria-label={hidden ? `Show ${labelFor(feature)}` : `Hide ${labelFor(feature)}`}
                  aria-pressed={hidden}
                  title={hidden ? 'Show' : 'Hide'}
                >
                  {hidden ? (
                    <EyeOffIcon width={14} height={14} />
                  ) : (
                    <EyeIcon width={14} height={14} />
                  )}
                </button>
                <button
                  type="button"
                  className={styles.deleteBtn}
                  onClick={(e) => {
                    e.stopPropagation()
                    deleteFeature(id)
                  }}
                  aria-label={`Delete ${labelFor(feature)}`}
                  title="Delete"
                >
                  <TrashIcon width={14} height={14} />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </aside>
  )
}
