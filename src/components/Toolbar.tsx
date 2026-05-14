import { useRef } from 'react'
import { useFeatureStore, type ToolMode } from '../store/useFeatureStore'
import { checkGeoJSON } from '../lib/geojson-validate'
import { downloadJson } from '../lib/download'
import {
  HandIcon,
  PointIcon,
  PolylineIcon,
  PolygonIcon,
  ResetIcon,
  FolderOpenIcon,
  DownloadIcon,
} from './icons'
import styles from './Toolbar.module.css'

type ToolDef = {
  id: ToolMode
  label: string
  shortcut: string
  Icon: typeof HandIcon
}

const TOOLS: ToolDef[] = [
  { id: 'hand', label: 'Hand', shortcut: 'H', Icon: HandIcon },
  { id: 'point', label: 'Point', shortcut: 'P', Icon: PointIcon },
  { id: 'polyline', label: 'Line', shortcut: 'L', Icon: PolylineIcon },
  { id: 'polygon', label: 'Polygon', shortcut: 'G', Icon: PolygonIcon },
]

export function Toolbar() {
  const tool = useFeatureStore((s) => s.tool)
  const setTool = useFeatureStore((s) => s.setTool)
  const clearAll = useFeatureStore((s) => s.clearAll)
  const features = useFeatureStore((s) => s.features)
  const replaceAll = useFeatureStore((s) => s.replaceAll)
  const pushToast = useFeatureStore((s) => s.pushToast)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleOpen = () => {
    fileInputRef.current?.click()
  }

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const parsed = JSON.parse(text)
      const result = checkGeoJSON(parsed)
      if (!result.ok) {
        pushToast('error', result.error)
        return
      }
      replaceAll(result.value, 'import')
      pushToast('success', `Imported ${result.value.features.length} feature(s)`)
    } catch (err) {
      pushToast('error', `Failed to read file: ${(err as Error).message}`)
    } finally {
      e.target.value = ''
    }
  }

  const handleDownload = () => {
    downloadJson('map.geojson', features)
    pushToast('success', 'Downloaded map.geojson')
  }

  const handleClear = () => {
    if (features.features.length === 0) return
    if (confirm(`Delete all ${features.features.length} features?`)) {
      clearAll()
      pushToast('info', 'Map cleared')
    }
  }

  const isEmpty = features.features.length === 0

  return (
    <header className={styles.bar}>
      <div className={styles.brand}>
        <span className={styles.brandDot} aria-hidden="true" />
        <span>geojson-lab</span>
      </div>

      <div className={styles.group} role="toolbar" aria-label="Drawing tools">
        {TOOLS.map(({ id, label, shortcut, Icon }) => (
          <button
            key={id}
            type="button"
            className={styles.tool}
            data-active={tool === id}
            onClick={() => setTool(id)}
            title={`${label} (${shortcut})`}
            aria-label={label}
            aria-pressed={tool === id}
          >
            <Icon />
          </button>
        ))}
      </div>

      <div className={styles.divider} />

      <button
        type="button"
        className={styles.tool}
        onClick={handleClear}
        disabled={isEmpty}
        title="Reset playground"
        aria-label="Reset playground"
      >
        <ResetIcon />
        <span>Reset Playground</span>
      </button>

      <div className={styles.spacer} />

      <button
        type="button"
        className={styles.tool}
        onClick={handleOpen}
        title="Import GeoJSON"
        aria-label="Import GeoJSON"
      >
        <FolderOpenIcon />
        <span>Import</span>
      </button>

      <button
        type="button"
        className={styles.tool}
        onClick={handleDownload}
        disabled={isEmpty}
        title="Download GeoJSON"
        aria-label="Download GeoJSON"
      >
        <DownloadIcon />
        <span>Download GeoJSON</span>
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept=".geojson,.json,application/geo+json,application/json"
        onChange={handleFile}
        style={{ display: 'none' }}
      />
    </header>
  )
}
