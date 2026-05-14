import { useEffect, useState } from 'react'
import { useFeatureStore } from '../store/useFeatureStore'
import { checkGeoJSON } from '../lib/geojson-validate'

export function useDropImport(target: React.RefObject<HTMLElement | null>) {
  const replaceAll = useFeatureStore((s) => s.replaceAll)
  const pushToast = useFeatureStore((s) => s.pushToast)
  const [dropping, setDropping] = useState(false)

  useEffect(() => {
    const el = target.current
    if (!el) return

    let dragDepth = 0

    const onEnter = (e: DragEvent) => {
      if (!hasFiles(e)) return
      e.preventDefault()
      dragDepth++
      setDropping(true)
    }

    const onLeave = (e: DragEvent) => {
      if (!hasFiles(e)) return
      e.preventDefault()
      dragDepth = Math.max(0, dragDepth - 1)
      if (dragDepth === 0) setDropping(false)
    }

    const onOver = (e: DragEvent) => {
      if (!hasFiles(e)) return
      e.preventDefault()
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'
    }

    const onDrop = async (e: DragEvent) => {
      if (!hasFiles(e)) return
      e.preventDefault()
      dragDepth = 0
      setDropping(false)
      const file = e.dataTransfer?.files?.[0]
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
        pushToast(
          'success',
          `Imported ${result.value.features.length} feature(s) from ${file.name}`,
        )
      } catch (err) {
        pushToast('error', `Couldn't read file: ${(err as Error).message}`)
      }
    }

    el.addEventListener('dragenter', onEnter)
    el.addEventListener('dragleave', onLeave)
    el.addEventListener('dragover', onOver)
    el.addEventListener('drop', onDrop)

    return () => {
      el.removeEventListener('dragenter', onEnter)
      el.removeEventListener('dragleave', onLeave)
      el.removeEventListener('dragover', onOver)
      el.removeEventListener('drop', onDrop)
    }
  }, [target, replaceAll, pushToast])

  return dropping
}

function hasFiles(e: DragEvent): boolean {
  const types = e.dataTransfer?.types
  if (!types) return false
  for (let i = 0; i < types.length; i++) {
    if (types[i] === 'Files') return true
  }
  return false
}
