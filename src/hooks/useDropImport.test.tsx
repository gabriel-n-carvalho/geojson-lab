import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useRef } from 'react'
import { renderHook, act } from '@testing-library/react'
import { useDropImport } from './useDropImport'
import { useFeatureStore } from '../store/useFeatureStore'
import { sampleFC } from '../test/sample-geojson'

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

beforeEach(() => resetStore())
afterEach(() => {
  document.body.innerHTML = ''
})

const makeDataTransfer = (file?: File, includeFilesType = true): DataTransfer =>
  ({
    types: includeFilesType ? ['Files'] : [],
    files: file ? ([file] as unknown as FileList) : ({} as FileList),
    dropEffect: 'none',
  }) as unknown as DataTransfer

const dispatch = (el: HTMLElement, type: string, transfer: DataTransfer) => {
  const ev = new Event(type, { bubbles: true, cancelable: true }) as DragEvent
  Object.defineProperty(ev, 'dataTransfer', { value: transfer })
  el.dispatchEvent(ev)
  return ev
}

const mountTarget = () => {
  const el = document.createElement('div')
  document.body.appendChild(el)
  return el
}

describe('useDropImport', () => {
  it('does nothing when the ref is not attached', () => {
    const { result } = renderHook(() => {
      const ref = useRef<HTMLDivElement>(null)
      const dropping = useDropImport(ref)
      return { ref, dropping }
    })
    expect(result.current.dropping).toBe(false)
  })

  it('sets and clears dropping while dragging files', async () => {
    const el = mountTarget()
    const { result, rerender } = renderHook(() => {
      const ref = useRef<HTMLElement | null>(el)
      const dropping = useDropImport(ref)
      return dropping
    })
    rerender()
    act(() => {
      dispatch(el, 'dragenter', makeDataTransfer())
    })
    expect(result.current).toBe(true)
    act(() => {
      dispatch(el, 'dragleave', makeDataTransfer())
    })
    expect(result.current).toBe(false)
  })

  it('ignores drag events that have no Files in their types', () => {
    const el = mountTarget()
    renderHook(() => {
      const ref = useRef<HTMLElement | null>(el)
      return useDropImport(ref)
    })
    dispatch(el, 'dragenter', makeDataTransfer(undefined, false))
    dispatch(el, 'dragover', makeDataTransfer(undefined, false))
    dispatch(el, 'drop', makeDataTransfer(undefined, false))
    dispatch(el, 'dragleave', makeDataTransfer(undefined, false))
    // No state changes
    expect(useFeatureStore.getState().toasts).toHaveLength(0)
  })

  it('ignores drag events when dataTransfer.types is missing entirely', () => {
    const el = mountTarget()
    renderHook(() => {
      const ref = useRef<HTMLElement | null>(el)
      return useDropImport(ref)
    })
    const noTypes = { types: undefined } as unknown as DataTransfer
    dispatch(el, 'dragenter', noTypes)
    expect(useFeatureStore.getState().toasts).toHaveLength(0)
  })

  it('sets dropEffect to copy on dragover', () => {
    const el = mountTarget()
    renderHook(() => {
      const ref = useRef<HTMLElement | null>(el)
      return useDropImport(ref)
    })
    const transfer = makeDataTransfer()
    dispatch(el, 'dragover', transfer)
    expect(transfer.dropEffect).toBe('copy')
  })

  it('imports a valid GeoJSON file on drop', async () => {
    const el = mountTarget()
    renderHook(() => {
      const ref = useRef<HTMLElement | null>(el)
      return useDropImport(ref)
    })
    const file = new File([JSON.stringify(sampleFC)], 'm.geojson', { type: 'application/geo+json' })
    await act(async () => {
      dispatch(el, 'drop', makeDataTransfer(file))
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(useFeatureStore.getState().features.features).toHaveLength(3)
    expect(useFeatureStore.getState().toasts.some((t) => t.kind === 'success')).toBe(true)
  })

  it('emits an error toast when the file is not valid GeoJSON', async () => {
    const el = mountTarget()
    renderHook(() => {
      const ref = useRef<HTMLElement | null>(el)
      return useDropImport(ref)
    })
    const file = new File([JSON.stringify({ foo: 'bar' })], 'bad.geojson', {
      type: 'application/json',
    })
    await act(async () => {
      dispatch(el, 'drop', makeDataTransfer(file))
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(useFeatureStore.getState().toasts.some((t) => t.kind === 'error')).toBe(true)
  })

  it('emits an error toast when reading the file throws', async () => {
    const el = mountTarget()
    renderHook(() => {
      const ref = useRef<HTMLElement | null>(el)
      return useDropImport(ref)
    })
    const file = new File(['x'], 'broken.geojson')
    vi.spyOn(file, 'text').mockRejectedValueOnce(new Error('disk on fire'))
    await act(async () => {
      dispatch(el, 'drop', makeDataTransfer(file))
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(useFeatureStore.getState().toasts.some((t) => t.message.includes('disk on fire'))).toBe(
      true,
    )
  })

  it('does nothing when drop has no files attached', async () => {
    const el = mountTarget()
    renderHook(() => {
      const ref = useRef<HTMLElement | null>(el)
      return useDropImport(ref)
    })
    await act(async () => {
      dispatch(el, 'drop', { types: ['Files'], files: {} as FileList } as unknown as DataTransfer)
      await Promise.resolve()
    })
    expect(useFeatureStore.getState().toasts).toHaveLength(0)
  })

  it('does not go below zero on extra dragleave events', () => {
    const el = mountTarget()
    renderHook(() => {
      const ref = useRef<HTMLElement | null>(el)
      return useDropImport(ref)
    })
    dispatch(el, 'dragleave', makeDataTransfer())
    dispatch(el, 'dragleave', makeDataTransfer())
    expect(useFeatureStore.getState().toasts).toHaveLength(0)
  })

  it('cleans up its listeners on unmount', () => {
    const el = mountTarget()
    const removeSpy = vi.spyOn(el, 'removeEventListener')
    const { unmount } = renderHook(() => {
      const ref = useRef<HTMLElement | null>(el)
      return useDropImport(ref)
    })
    unmount()
    expect(removeSpy).toHaveBeenCalled()
  })
})
