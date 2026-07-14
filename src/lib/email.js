import { Resend } from 'resend'
import { computeStatus } from '@/lib/status'
import Endpoint from '@/models/Endpoint'

// NOTE: `from` must use a domain verified in your Resend account.
// This placeholder MUST be replaced with a real verified domain before
// alerts will actually deliver (see Resend dashboard -> Domains).
const FROM_ADDRESS = 'noreply@api-health-dashboard.com'
const DASHBOARD_URL = 'https://your-deployed-url.vercel.app'

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000

function buildHtml(endpoint, currentLog) {
  const currentStatus =
    currentLog?.status && currentLog.status !== 0
      ? `HTTP ${currentLog.status}`
      : currentLog?.errorMessage || 'No response'
  const responseTime =
    currentLog?.responseTime != null ? `${currentLog.responseTime} ms` : 'n/a'
  const timestamp = (currentLog?.createdAt || new Date()).toISOString()

  return `<h2>API Downtime Alert</h2>
<p>Your monitored endpoint is down.</p>
<ul>
  <li><strong>Endpoint:</strong> ${endpoint.name}</li>
  <li><strong>URL:</strong> ${endpoint.url}</li>
  <li><strong>Method:</strong> ${endpoint.method}</li>
  <li><strong>Current Status:</strong> ${currentStatus}</li>
  <li><strong>Response Time:</strong> ${responseTime}</li>
  <li><strong>Time:</strong> ${timestamp}</li>
</ul>
<p><a href="${DASHBOARD_URL}">View Dashboard</a></p>
<p>This endpoint has been down for at least 1 hour. Check your dashboard for details.</p>`
}

export async function sendDowntimeAlert(endpoint, currentLog) {
  const status = computeStatus(currentLog, endpoint.expectedStatus)
  if (status !== 'down') return

  // Throttle: skip if we already alerted within the last 24 hours.
  if (
    endpoint.lastAlertSentAt &&
    Date.now() - new Date(endpoint.lastAlertSentAt).getTime() < TWENTY_FOUR_HOURS_MS
  ) {
    return
  }

  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not set; email alerts disabled')
    return
  }

  const resend = new Resend(process.env.RESEND_API_KEY)

  try {
    await resend.emails.send({
      to: endpoint.ownerEmail,
      from: FROM_ADDRESS,
      subject: `⚠️ API Down: ${endpoint.name}`,
      html: buildHtml(endpoint, currentLog),
    })

    await Endpoint.findByIdAndUpdate(endpoint._id, {
      lastAlertSentAt: new Date(),
    })
  } catch (error) {
    console.error('Failed to send downtime alert:', error.message)
  }
}
