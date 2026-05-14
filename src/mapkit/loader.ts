import type { MapKitNamespace } from './types'

// The MapKit JS token is short-lived and meant to be sent to the client, but it
// must be signed server-side using the Apple .p8 private key. We fetch it from
// an edge function at VITE_MAPKIT_TOKEN_ENDPOINT (default /api/mapkit-token).
const ENDPOINT =
  (import.meta.env.VITE_MAPKIT_TOKEN_ENDPOINT as string | undefined) || '/api/mapkit-token'

export type TokenSource = 'fetched' | 'missing'
export type LoadResult = { mapkit: MapKitNamespace; tokenSource: TokenSource }

// A real MapKit JS JWT is three base64url-encoded segments separated by dots.
// Anything else (empty string, a stray sentence, two segments) is a placeholder.
export const isPlaceholderToken = (t: string): boolean => {
  if (!t) return true
  const parts = t.split('.')
  if (parts.length !== 3) return true
  return parts.some((p) => p.length === 0)
}

async function fetchToken(): Promise<string | null> {
  try {
    const r = await fetch(ENDPOINT, { credentials: 'omit' })
    if (!r.ok) return null
    const t = (await r.text()).trim()
    return isPlaceholderToken(t) ? null : t
  } catch {
    return null
  }
}

let loadPromise: Promise<LoadResult> | null = null

export function loadMapKit(): Promise<LoadResult> {
  if (loadPromise) return loadPromise

  loadPromise = new Promise<LoadResult>((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('MapKit JS requires a window'))
      return
    }

    void fetchToken().then((initialToken) => {
      const tokenSource: TokenSource = initialToken ? 'fetched' : 'missing'
      let pendingToken: string | null = initialToken

      const finish = () => {
        try {
          window.mapkit.init({
            authorizationCallback: (done) => {
              if (pendingToken) {
                const t = pendingToken
                pendingToken = null
                done(t)
                return
              }
              void fetchToken().then((t) => done(t ?? ''))
            },
            language: navigator.language,
          })
          resolve({ mapkit: window.mapkit, tokenSource })
        } catch (err) {
          reject(err as Error)
        }
      }

      if (window.mapkit) {
        finish()
        return
      }

      window.initMapKit = finish

      const script = document.querySelector<HTMLScriptElement>('script[data-mapkit]')
      if (script && !script.hasAttribute('data-loaded')) {
        script.addEventListener(
          'error',
          () => reject(new Error('Failed to load MapKit JS script')),
          {
            once: true,
          },
        )
      }
    })
  })

  return loadPromise
}
