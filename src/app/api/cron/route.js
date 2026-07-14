import { timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { pingEndpoint } from '@/lib/ping'
import { sendDowntimeAlert } from '@/lib/email'
import Endpoint from '@/models/Endpoint'
import PingLog from '@/models/PingLog'

export async function GET(request) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    console.error('CRON_SECRET is not set')
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  const authHeader = request.headers.get('authorization') ?? ''
  const expected = Buffer.from(`Bearer ${secret}`)
  const provided = Buffer.from(authHeader)
  if (
    expected.length !== provided.length ||
    !timingSafeEqual(expected, provided)
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await connectDB()

    const endpoints = await Endpoint.find({})
    if (endpoints.length === 0) {
      return NextResponse.json({ pinged: 0, failed: 0, message: 'No endpoints to ping' })
    }

    const results = await Promise.allSettled(
      endpoints.map((endpoint) => pingEndpoint(endpoint))
    )

    const failed = results.filter((r) => r.status === 'rejected').length
    const pinged = results.length - failed

    // After pinging, check each endpoint's latest log and alert on downtime.
    // sendDowntimeAlert handles status checking + 24h throttling internally.
    for (const endpoint of endpoints) {
      try {
        const latestLog = await PingLog.findOne({ endpointId: endpoint._id }).sort({
          createdAt: -1,
        })
        await sendDowntimeAlert(endpoint, latestLog)
      } catch (error) {
        console.error('Downtime alert check failed:', error.message)
      }
    }

    return NextResponse.json({ pinged, failed })
  } catch (error) {
    console.error('GET /api/cron failed:', error)
    return NextResponse.json({ error: 'Cron job failed' }, { status: 500 })
  }
}
