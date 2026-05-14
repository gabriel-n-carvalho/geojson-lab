import { useEffect } from 'react'
import { useFeatureStore, type ToolMode } from '../store/useFeatureStore'

const TOOL_KEY_MAP: Record<string, ToolMode> = {
  h: 'hand',
  p: 'point',
  l: 'polyline',
  g: 'polygon',
}

const isTypingTarget = (el: EventTarget | null): boolean => {
  if (!(el instanceof HTMLElement)) return false
  const tag = el.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  if (el.isContentEditable) return true
  // CodeMirror puts the cursor inside contenteditable spans
  if (el.closest('.cm-editor')) return true
  return false
}

export function useKeyboardShortcuts() {
  const setTool = useFeatureStore((s) => s.setTool)
  const selectedId = useFeatureStore((s) => s.selectedId)
  const setSelected = useFeatureStore((s) => s.setSelected)
  const deleteFeature = useFeatureStore((s) => s.deleteFeature)
  const draftFeature = useFeatureStore((s) => s.draftFeature)
  const tool = useFeatureStore((s) => s.tool)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (isTypingTarget(e.target)) return

      const key = e.key.toLowerCase()
      if (key in TOOL_KEY_MAP) {
        e.preventDefault()
        setTool(TOOL_KEY_MAP[key])
        return
      }
      if (key === 'escape') {
        // Drawing has its own Escape handler in useDrawingTool; don't double-handle.
        if (draftFeature || tool !== 'hand') return
        if (!selectedId) return
        e.preventDefault()
        setSelected(null)
        return
      }
      if (key === 'delete' || key === 'backspace') {
        // While drawing, Backspace pops the last vertex (handled in
        // useDrawingTool). Don't also delete the selected feature.
        if (draftFeature) return
        if (selectedId) {
          e.preventDefault()
          deleteFeature(selectedId)
        }
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setTool, selectedId, setSelected, deleteFeature, draftFeature, tool])
}
