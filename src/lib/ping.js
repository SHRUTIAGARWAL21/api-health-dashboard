import PingLog from '@/models/PingLog'
import { assertSafeUrl } from '@/lib/validateUrl'

const PING_TIMEOUT_MS = 10000

export async function pingEndpoint(endpoint) {
  let status = 0
  let errorMessage
  const start = Date.now()

  try {
    await assertSafeUrl(endpoint.url)
    const response = await fetch(endpoint.url, {
      method: endpoint.method,
      redirect: 'manual',
      signal: AbortSignal.timeout(PING_TIMEOUT_MS),
    })
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
