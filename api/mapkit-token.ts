import { SignJWT, importPKCS8 } from 'jose'

export const config = { runtime: 'edge' }

const TTL_SECONDS = 30 * 60
const REFRESH_BEFORE = 5 * 60

let cached: { jwt: string; expiresAt: number } | null = null
let signingKey: CryptoKey | null = null

async function getKey(): Promise<CryptoKey> {
  if (signingKey) return signingKey
  const raw = process.env.MAPKIT_PRIVATE_KEY ?? ''
  // Env vars set via CLI/CI often arrive with literal "\n" escapes; the Vercel
  // dashboard preserves real newlines. Normalize both cases.
  const pem = raw.replace(/\\n/g, '\n').trim()
  signingKey = (await importPKCS8(pem, 'ES256')) as CryptoKey
  return signingKey
}

function required(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`${name} not set`)
  return v
}

const responseHeaders = (): ResponseInit => ({
  headers: {
    'content-type': 'text/plain; charset=utf-8',
    'cache-control': 'public, max-age=1500',
  },
})

export default async function handler(req: Request): Promise<Response> {
  const allow = process.env.ALLOWED_ORIGINS?.split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  if (allow?.length) {
    const origin = req.headers.get('origin')
    if (!origin || !allow.includes(origin)) {
      return new Response('forbidden', { status: 403 })
    }
  }

  const now = Math.floor(Date.now() / 1000)
  if (cached && cached.expiresAt - now > REFRESH_BEFORE) {
    return new Response(cached.jwt, responseHeaders())
  }

  try {
    const teamId = required('MAPKIT_TEAM_ID')
    const keyId = required('MAPKIT_KEY_ID')
    const payload: Record<string, string> = {}
    if (process.env.MAPKIT_ORIGIN) payload.origin = process.env.MAPKIT_ORIGIN
    const jwt = await new SignJWT(payload)
      .setProtectedHeader({ alg: 'ES256', kid: keyId, typ: 'JWT' })
      .setIssuer(teamId)
      .setIssuedAt(now)
      .setExpirationTime(now + TTL_SECONDS)
      .sign(await getKey())
    cached = { jwt, expiresAt: now + TTL_SECONDS }
    return new Response(jwt, responseHeaders())
  } catch {
    return new Response('signing-failed', { status: 500 })
  }
}
