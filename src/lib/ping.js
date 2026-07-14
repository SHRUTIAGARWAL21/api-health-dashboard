import PingLog from '@/models/PingLog'
import { assertSafeUrl } from '@/lib/validateUrl'

const PING_TIMEOUT_MS = 10000
const MAX_REDIRECTS = 5

// Follows redirects by hand so every hop passes assertSafeUrl —
// redirect: 'follow' would let a public URL bounce us to a private address.
async function fetchFollowingSafeRedirects(url, method) {
  let currentUrl = url
  for (let i = 0; i <= MAX_REDIRECTS; i++) {
    await assertSafeUrl(currentUrl)
    const response = await fetch(currentUrl, {
      method,
      redirect: 'manual',
      signal: AbortSignal.timeout(PING_TIMEOUT_MS),
    })
    if (response.status < 300 || response.status >= 400) return response
    const location = response.headers.get('location')
    if (!location) return response
    currentUrl = new URL(location, currentUrl).toString()
  }
  throw new Error('Too many redirects')
}

export async function pingEndpoint(endpoint) {
  let status = 0
  let errorMessage
  const start = Date.now()

  try {
    const response = await fetchFollowingSafeRedirects(endpoint.url, endpoint.method)
    status = response.status
  } catch (err) {
    errorMessage = err.name === 'TimeoutError' ? 'Request timed out' : err.message
  }

  const responseTime = Date.now() - start

  return PingLog.create({
    endpointId: endpoint._id,
    status,
    responseTime,
    errorMessage,
  })
}
