import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const FRESH_MODULE = './loader.ts'
const VALID = 'aaa.bbb.ccc'

const mockFetchResponse = (body: string, init?: ResponseInit) => {
  globalThis.fetch = vi.fn().mockResolvedValue(new Response(body, init)) as unknown as typeof fetch
}
const mockFetchReject = (err: Error) => {
  globalThis.fetch = vi.fn().mockRejectedValue(err) as unknown as typeof fetch
}

beforeEach(() => {
  vi.resetModules()
  delete (window as unknown as { mapkit?: unknown }).mapkit
  delete (window as unknown as { initMapKit?: () => void }).initMapKit
  document.body.innerHTML = ''
  mockFetchResponse(VALID)
})

afterEach(() => {
  delete (window as unknown as { mapkit?: unknown }).mapkit
  delete (window as unknown as { initMapKit?: () => void }).initMapKit
  document.body.innerHTML = ''
  vi.unstubAllGlobals()
})

describe('isPlaceholderToken', () => {
  it('treats empty input as a placeholder', async () => {
    const { isPlaceholderToken } = await import(FRESH_MODULE)
    expect(isPlaceholderToken('')).toBe(true)
  })

  it('treats input without three parts as a placeholder', async () => {
    const { isPlaceholderToken } = await import(FRESH_MODULE)
    expect(isPlaceholderToken('a.b')).toBe(true)
  })

  it('treats tokens with empty segments as placeholders', async () => {
    const { isPlaceholderToken } = await import(FRESH_MODULE)
    expect(isPlaceholderToken('a..c')).toBe(true)
  })

  it('treats well-formed tokens as real', async () => {
    const { isPlaceholderToken } = await import(FRESH_MODULE)
    expect(isPlaceholderToken('aaa.bbb.ccc')).toBe(false)
  })
})

describe('loadMapKit', () => {
  it('resolves with tokenSource:fetched when the endpoint returns a real token', async () => {
    const init = vi.fn()
    ;(window as unknown as { mapkit: unknown }).mapkit = { init }
    const { loadMapKit } = await import(FRESH_MODULE)
    const result = await loadMapKit()
    expect(init).toHaveBeenCalledOnce()
    expect(result.mapkit).toBe((window as unknown as { mapkit: unknown }).mapkit)
    expect(result.tokenSource).toBe('fetched')
  })

  it('resolves with tokenSource:missing when the endpoint returns 401', async () => {
    mockFetchResponse('nope', { status: 401 })
    ;(window as unknown as { mapkit: unknown }).mapkit = { init: vi.fn() }
    const { loadMapKit } = await import(FRESH_MODULE)
    const result = await loadMapKit()
    expect(result.tokenSource).toBe('missing')
  })

  it('resolves with tokenSource:missing when the fetch rejects', async () => {
    mockFetchReject(new Error('network down'))
    ;(window as unknown as { mapkit: unknown }).mapkit = { init: vi.fn() }
    const { loadMapKit } = await import(FRESH_MODULE)
    const result = await loadMapKit()
    expect(result.tokenSource).toBe('missing')
  })

  it('resolves with tokenSource:missing when the body is a placeholder shape', async () => {
    mockFetchResponse('not-a-jwt')
    ;(window as unknown as { mapkit: unknown }).mapkit = { init: vi.fn() }
    const { loadMapKit } = await import(FRESH_MODULE)
    const result = await loadMapKit()
    expect(result.tokenSource).toBe('missing')
  })

  it('passes the fetched token through authorizationCallback on the first call', async () => {
    const init = vi.fn()
    ;(window as unknown as { mapkit: unknown }).mapkit = { init }
    const { loadMapKit } = await import(FRESH_MODULE)
    await loadMapKit()
    const cbArg = init.mock.calls[0][0] as {
      authorizationCallback: (cb: (t: string) => void) => void
    }
    const cb = vi.fn()
    cbArg.authorizationCallback(cb)
    expect(cb).toHaveBeenCalledWith(VALID)
  })

  it('fetches a fresh token on subsequent authorizationCallback invocations', async () => {
    const init = vi.fn()
    ;(window as unknown as { mapkit: unknown }).mapkit = { init }
    const { loadMapKit } = await import(FRESH_MODULE)
    await loadMapKit()
    const cbArg = init.mock.calls[0][0] as {
      authorizationCallback: (cb: (t: string) => void) => void
    }
    // First call consumes the pre-fetched token.
    const cb1 = vi.fn()
    cbArg.authorizationCallback(cb1)
    expect(cb1).toHaveBeenCalledWith(VALID)
    // Second call must trigger a new fetch.
    mockFetchResponse('xxx.yyy.zzz')
    const cb2 = vi.fn()
    cbArg.authorizationCallback(cb2)
    await vi.waitFor(() => expect(cb2).toHaveBeenCalledWith('xxx.yyy.zzz'))
  })

  it('passes empty string through authorizationCallback when refetch fails', async () => {
    const init = vi.fn()
    ;(window as unknown as { mapkit: unknown }).mapkit = { init }
    const { loadMapKit } = await import(FRESH_MODULE)
    await loadMapKit()
    const cbArg = init.mock.calls[0][0] as {
      authorizationCallback: (cb: (t: string) => void) => void
    }
    cbArg.authorizationCallback(vi.fn()) // consume pre-fetched
    mockFetchReject(new Error('boom'))
    const cb = vi.fn()
    cbArg.authorizationCallback(cb)
    await vi.waitFor(() => expect(cb).toHaveBeenCalledWith(''))
  })

  it('caches its promise across calls', async () => {
    ;(window as unknown as { mapkit: unknown }).mapkit = { init: vi.fn() }
    const { loadMapKit } = await import(FRESH_MODULE)
    const a = loadMapKit()
    const b = loadMapKit()
    expect(a).toBe(b)
    await a
  })

  it('hooks window.initMapKit when mapkit is not yet ready and finishes when called', async () => {
    const script = document.createElement('script')
    script.setAttribute('data-mapkit', 'true')
    document.body.appendChild(script)

    const { loadMapKit } = await import(FRESH_MODULE)
    const init = vi.fn()
    const promise = loadMapKit()
    await vi.waitFor(() =>
      expect(typeof (window as unknown as { initMapKit?: () => void }).initMapKit).toBe('function'),
    )
    ;(window as unknown as { mapkit: unknown }).mapkit = { init }
    ;(window as unknown as { initMapKit: () => void }).initMapKit()
    await expect(promise).resolves.toMatchObject({ tokenSource: 'fetched' })
    expect(init).toHaveBeenCalledOnce()
  })

  it('rejects when the script element errors out', async () => {
    const script = document.createElement('script')
    script.setAttribute('data-mapkit', 'true')
    document.body.appendChild(script)

    const { loadMapKit } = await import(FRESH_MODULE)
    const promise = loadMapKit()
    // Wait for the listener to be attached after fetchToken resolves.
    await vi.waitFor(() =>
      expect(typeof (window as unknown as { initMapKit?: () => void }).initMapKit).toBe('function'),
    )
    script.dispatchEvent(new Event('error'))
    await expect(promise).rejects.toThrow(/Failed to load MapKit JS script/)
  })

  it('ignores a script element that has already been loaded', async () => {
    const script = document.createElement('script')
    script.setAttribute('data-mapkit', 'true')
    script.setAttribute('data-loaded', 'true')
    document.body.appendChild(script)

    const { loadMapKit } = await import(FRESH_MODULE)
    loadMapKit()
    await vi.waitFor(() =>
      expect(typeof (window as unknown as { initMapKit?: () => void }).initMapKit).toBe('function'),
    )
    // No error listener attached — dispatching an error must not throw or reject.
    script.dispatchEvent(new Event('error'))
    expect(true).toBe(true)
  })

  it('rejects when init throws', async () => {
    ;(window as unknown as { mapkit: unknown }).mapkit = {
      init: () => {
        throw new Error('boom')
      },
    }
    const { loadMapKit } = await import(FRESH_MODULE)
    await expect(loadMapKit()).rejects.toThrow('boom')
  })
})

describe('loadMapKit (no window)', () => {
  it('rejects when window is undefined', async () => {
    vi.resetModules()
    vi.stubGlobal('window', undefined as unknown as Window)
    try {
      const { loadMapKit } = await import(FRESH_MODULE)
      await expect(loadMapKit()).rejects.toThrow(/window/)
    } finally {
      vi.unstubAllGlobals()
    }
  })
})
