import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useKeyboardShortcuts } from './useKeyboardShortcuts'
import { useFeatureStore } from '../store/useFeatureStore'

const resetStore = () =>
  useFeatureStore.setState({
    features: { type: 'FeatureCollection', features: [] },
    selectedId: null,
    tool: 'hand',
    draftFeature: null,
    toasts: [],
    lastEditSource: 'init',
    hiddenIds: new Set<string>(),
    flyToId: null,
  })

const press = (key: string, init: KeyboardEventInit & { target?: EventTarget | null } = {}) => {
  const { target, ...rest } = init
  const ev = new KeyboardEvent('keydown', { key, cancelable: true, ...rest })
  Object.defineProperty(ev, 'target', { value: target ?? document.body, configurable: true })
  window.dispatchEvent(ev)
  return ev
}

beforeEach(() => resetStore())
afterEach(() => {
  document.body.innerHTML = ''
})

describe('useKeyboardShortcuts', () => {
  it('binds h, p, l, g to the matching tools', () => {
    renderHook(() => useKeyboardShortcuts())
    press('h')
    expect(useFeatureStore.getState().tool).toBe('hand')
    press('p')
    expect(useFeatureStore.getState().tool).toBe('point')
    press('l')
    expect(useFeatureStore.getState().tool).toBe('polyline')
    press('g')
    expect(useFeatureStore.getState().tool).toBe('polygon')
  })

  it('treats uppercase keys identically', () => {
    renderHook(() => useKeyboardShortcuts())
    press('P')
    expect(useFeatureStore.getState().tool).toBe('point')
  })

  it('ignores shortcuts when a modifier key is held', () => {
    renderHook(() => useKeyboardShortcuts())
    press('p', { metaKey: true })
    expect(useFeatureStore.getState().tool).toBe('hand')
    press('p', { ctrlKey: true })
    expect(useFeatureStore.getState().tool).toBe('hand')
    press('p', { altKey: true })
    expect(useFeatureStore.getState().tool).toBe('hand')
  })

  it('ignores shortcuts when focus is in an input', () => {
    const input = document.createElement('input')
    document.body.appendChild(input)
    renderHook(() => useKeyboardShortcuts())
    press('p', { target: input })
    expect(useFeatureStore.getState().tool).toBe('hand')
  })

  it('ignores shortcuts when focus is in a textarea', () => {
    const textarea = document.createElement('textarea')
    document.body.appendChild(textarea)
    renderHook(() => useKeyboardShortcuts())
    press('p', { target: textarea })
    expect(useFeatureStore.getState().tool).toBe('hand')
  })

  it('ignores shortcuts when focus is in a select', () => {
    const select = document.createElement('select')
    document.body.appendChild(select)
    renderHook(() => useKeyboardShortcuts())
    press('p', { target: select })
    expect(useFeatureStore.getState().tool).toBe('hand')
  })

  it('ignores shortcuts when focus is on a contenteditable element', () => {
    const div = document.createElement('div')
    div.contentEditable = 'true'
    document.body.appendChild(div)
    renderHook(() => useKeyboardShortcuts())
    press('p', { target: div })
    expect(useFeatureStore.getState().tool).toBe('hand')
  })

  it('ignores shortcuts when focus is inside CodeMirror', () => {
    const editor = document.createElement('div')
    editor.classList.add('cm-editor')
    const inner = document.createElement('span')
    editor.appendChild(inner)
    document.body.appendChild(editor)
    renderHook(() => useKeyboardShortcuts())
    press('p', { target: inner })
    expect(useFeatureStore.getState().tool).toBe('hand')
  })

  it('ignores shortcuts when the event target is not an HTMLElement', () => {
    renderHook(() => useKeyboardShortcuts())
    press('p', { target: null })
    expect(useFeatureStore.getState().tool).toBe('point')
  })

  it('deletes the selected feature on Delete', () => {
    const id = useFeatureStore.getState().addFeature({ type: 'Point', coordinates: [0, 0] })
    useFeatureStore.getState().setSelected(id)
    renderHook(() => useKeyboardShortcuts())
    press('Delete')
    expect(useFeatureStore.getState().features.features).toHaveLength(0)
  })

  it('deletes the selected feature on Backspace', () => {
    const id = useFeatureStore.getState().addFeature({ type: 'Point', coordinates: [0, 0] })
    useFeatureStore.getState().setSelected(id)
    renderHook(() => useKeyboardShortcuts())
    press('Backspace')
    expect(useFeatureStore.getState().features.features).toHaveLength(0)
  })

  it('does nothing on Delete when nothing is selected', () => {
    useFeatureStore.getState().addFeature({ type: 'Point', coordinates: [0, 0] })
    useFeatureStore.getState().setSelected(null)
    renderHook(() => useKeyboardShortcuts())
    press('Delete')
    expect(useFeatureStore.getState().features.features).toHaveLength(1)
  })

  it('clears the selection on Escape in hand mode', () => {
    const id = useFeatureStore.getState().addFeature({ type: 'Point', coordinates: [0, 0] })
    useFeatureStore.getState().setSelected(id)
    renderHook(() => useKeyboardShortcuts())
    const ev = press('Escape')
    expect(useFeatureStore.getState().selectedId).toBeNull()
    expect(ev.defaultPrevented).toBe(true)
  })

  it('does nothing on Escape when nothing is selected', () => {
    renderHook(() => useKeyboardShortcuts())
    const ev = press('Escape')
    expect(useFeatureStore.getState().selectedId).toBeNull()
    expect(ev.defaultPrevented).toBe(false)
  })

  it('does not deselect on Escape while a draft is active', () => {
    const id = useFeatureStore.getState().addFeature({ type: 'Point', coordinates: [0, 0] })
    useFeatureStore.getState().setSelected(id)
    useFeatureStore.setState({
      draftFeature: {
        type: 'Feature',
        properties: {},
        geometry: { type: 'Point', coordinates: [0, 0] },
      },
    })
    renderHook(() => useKeyboardShortcuts())
    const ev = press('Escape')
    expect(useFeatureStore.getState().selectedId).toBe(id)
    expect(ev.defaultPrevented).toBe(false)
  })

  it('does not deselect on Escape when a drawing tool is active', () => {
    const id = useFeatureStore.getState().addFeature({ type: 'Point', coordinates: [0, 0] })
    useFeatureStore.getState().setSelected(id)
    useFeatureStore.setState({ tool: 'point' })
    renderHook(() => useKeyboardShortcuts())
    const ev = press('Escape')
    expect(useFeatureStore.getState().selectedId).toBe(id)
    expect(ev.defaultPrevented).toBe(false)
  })

  it('ignores Escape when focus is in a typing target', () => {
    const id = useFeatureStore.getState().addFeature({ type: 'Point', coordinates: [0, 0] })
    useFeatureStore.getState().setSelected(id)
    const input = document.createElement('input')
    document.body.appendChild(input)
    renderHook(() => useKeyboardShortcuts())
    press('Escape', { target: input })
    expect(useFeatureStore.getState().selectedId).toBe(id)
  })

  it('ignores keys that are not bound', () => {
    renderHook(() => useKeyboardShortcuts())
    press('z')
    expect(useFeatureStore.getState().tool).toBe('hand')
  })

  it('cleans up its listener on unmount', () => {
    const { unmount } = renderHook(() => useKeyboardShortcuts())
    unmount()
    press('p')
    expect(useFeatureStore.getState().tool).toBe('hand')
  })
})
