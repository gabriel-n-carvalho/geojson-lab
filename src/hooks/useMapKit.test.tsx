import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useRef } from 'react'
import { renderHook, act, waitFor } from '@testing-library/react'
import { buildMapKitMock, MockMap } from '../test/mapkit-mock'
import type { MapKitNamespace } from '../mapkit/types'

const FRESH_MODULE = './useMapKit.ts'

let mockMapKit: MapKitNamespace

vi.mock('../mapkit/loader', () => ({
  loadMapKit: vi.fn(),
}))

beforeEach(async () => {
  vi.resetModules()
  mockMapKit = buildMapKitMock()
})

afterEach(() => {
  vi.clearAllMocks()
})

const mountContainer = () => {
  const el = document.createElement('div')
  document.body.appendChild(el)
  return el
}

describe('useMapKit', () => {
  it('does nothing when the container ref is empty', async () => {
    const loaderModule = await import('../mapkit/loader')
    const loadMock = loaderModule.loadMapKit as unknown as ReturnType<typeof vi.fn>
    const { useMapKit } = await import(FRESH_MODULE)
    renderHook(() => {
      const ref = useRef<HTMLDivElement>(null)
      return useMapKit(ref)
    })
    expect(loadMock).not.toHaveBeenCalled()
  })

  it('progresses through loading and reaches ready when token is fetched', async () => {
    const loaderModule = await import('../mapkit/loader')
    const loadMock = loaderModule.loadMapKit as unknown as ReturnType<typeof vi.fn>
    loadMock.mockResolvedValue({ mapkit: mockMapKit, tokenSource: 'fetched' })

    const el = mountContainer()
    const { useMapKit } = await import(FRESH_MODULE)
    const { result } = renderHook(() => {
      const ref = useRef<HTMLElement | null>(el)
      return useMapKit(ref)
    })

    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(result.current.map).toBeTruthy()
  })

  it('stays unauthorized when tokenSource is missing', async () => {
    const loaderModule = await import('../mapkit/loader')
    const loadMock = loaderModule.loadMapKit as unknown as ReturnType<typeof vi.fn>
    loadMock.mockResolvedValue({ mapkit: mockMapKit, tokenSource: 'missing' })

    const el = mountContainer()
    const { useMapKit } = await import(FRESH_MODULE)
    const { result } = renderHook(() => {
      const ref = useRef<HTMLElement | null>(el)
      return useMapKit(ref)
    })

    await waitFor(() => expect(result.current.status).toBe('unauthorized'))
  })

  it('configuration-change events keep status unauthorized when flagged', async () => {
    const loaderModule = await import('../mapkit/loader')
    const loadMock = loaderModule.loadMapKit as unknown as ReturnType<typeof vi.fn>
    loadMock.mockResolvedValue({ mapkit: mockMapKit, tokenSource: 'missing' })

    const el = mountContainer()
    const { useMapKit } = await import(FRESH_MODULE)
    const { result } = renderHook(() => {
      const ref = useRef<HTMLElement | null>(el)
      return useMapKit(ref)
    })

    await waitFor(() => expect(result.current.status).toBe('unauthorized'))
    // No state change after configuration-change fires (set by mock).
    await new Promise((r) => setTimeout(r, 5))
    expect(result.current.status).toBe('unauthorized')
  })

  it('falls into error state when the loader rejects', async () => {
    const loaderModule = await import('../mapkit/loader')
    const loadMock = loaderModule.loadMapKit as unknown as ReturnType<typeof vi.fn>
    loadMock.mockRejectedValue(new Error('cdn down'))

    const el = mountContainer()
    const { useMapKit } = await import(FRESH_MODULE)
    const { result } = renderHook(() => {
      const ref = useRef<HTMLElement | null>(el)
      return useMapKit(ref)
    })

    await waitFor(() => expect(result.current.status).toBe('error'))
    expect(result.current.error).toBe('cdn down')
  })

  it('ignores resolve after the hook unmounts', async () => {
    const loaderModule = await import('../mapkit/loader')
    const loadMock = loaderModule.loadMapKit as unknown as ReturnType<typeof vi.fn>

    let resolve: ((v: { mapkit: MapKitNamespace; tokenSource: 'fetched' }) => void) | undefined
    loadMock.mockReturnValue(
      new Promise<{ mapkit: MapKitNamespace; tokenSource: 'fetched' }>((r) => (resolve = r)),
    )

    const el = mountContainer()
    const { useMapKit } = await import(FRESH_MODULE)
    const { result, unmount } = renderHook(() => {
      const ref = useRef<HTMLElement | null>(el)
      return useMapKit(ref)
    })
    unmount()
    await act(async () => {
      resolve?.({ mapkit: mockMapKit, tokenSource: 'fetched' })
      await Promise.resolve()
    })
    expect(result.current.status).toBe('loading')
  })

  it('ignores reject after the hook unmounts', async () => {
    const loaderModule = await import('../mapkit/loader')
    const loadMock = loaderModule.loadMapKit as unknown as ReturnType<typeof vi.fn>

    let reject: ((e: Error) => void) | undefined
    loadMock.mockReturnValue(
      new Promise<{ mapkit: MapKitNamespace; tokenSource: 'fetched' }>((_, r) => (reject = r)),
    )

    const el = mountContainer()
    const { useMapKit } = await import(FRESH_MODULE)
    const { result, unmount } = renderHook(() => {
      const ref = useRef<HTMLElement | null>(el)
      return useMapKit(ref)
    })
    unmount()
    await act(async () => {
      reject?.(new Error('after'))
      await Promise.resolve()
    })
    expect(result.current.status).toBe('loading')
  })

  it('swallows errors thrown by map.destroy on unmount', async () => {
    const loaderModule = await import('../mapkit/loader')
    const loadMock = loaderModule.loadMapKit as unknown as ReturnType<typeof vi.fn>

    const originalMap = mockMapKit.Map
    class ThrowingMap extends MockMap {
      destroy = () => {
        throw new Error('boom')
      }
    }
    ;(mockMapKit as { Map: unknown }).Map = ThrowingMap

    loadMock.mockResolvedValue({ mapkit: mockMapKit, tokenSource: 'fetched' })

    const el = mountContainer()
    const { useMapKit } = await import(FRESH_MODULE)
    const { result, unmount } = renderHook(() => {
      const ref = useRef<HTMLElement | null>(el)
      return useMapKit(ref)
    })

    await waitFor(() => expect(result.current.status).toBe('ready'))
    // Should not throw
    expect(() => unmount()).not.toThrow()
    ;(mockMapKit as { Map: unknown }).Map = originalMap
  })

  it('configuration-change after ready does nothing further', async () => {
    const loaderModule = await import('../mapkit/loader')
    const loadMock = loaderModule.loadMapKit as unknown as ReturnType<typeof vi.fn>
    loadMock.mockResolvedValue({ mapkit: mockMapKit, tokenSource: 'fetched' })

    const el = mountContainer()
    const { useMapKit } = await import(FRESH_MODULE)
    const { result } = renderHook(() => {
      const ref = useRef<HTMLElement | null>(el)
      return useMapKit(ref)
    })

    await waitFor(() => expect(result.current.status).toBe('ready'))
    // Fire one more configuration-change — status stays ready.
    const m = result.current.map as unknown as MockMap
    m.fire('configuration-change', { status: 'Initialized' })
    expect(result.current.status).toBe('ready')
  })

  it('error event flips status to unauthorized', async () => {
    const loaderModule = await import('../mapkit/loader')
    const loadMock = loaderModule.loadMapKit as unknown as ReturnType<typeof vi.fn>
    loadMock.mockResolvedValue({ mapkit: mockMapKit, tokenSource: 'fetched' })

    const el = mountContainer()
    const { useMapKit } = await import(FRESH_MODULE)
    const { result } = renderHook(() => {
      const ref = useRef<HTMLElement | null>(el)
      return useMapKit(ref)
    })

    await waitFor(() => expect(result.current.status).toBe('ready'))
    const m = result.current.map as unknown as MockMap
    act(() => m.fire('error', { error: 'bad' }))
    await waitFor(() => expect(result.current.status).toBe('unauthorized'))
  })
})
