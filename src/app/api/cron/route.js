import { timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { pingEndpoint } from '@/lib/ping'
import Endpoint from '@/models/Endpoint'

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

    return NextResponse.json({ pinged, failed })
  } catch (error) {
    console.error('GET /api/cron failed:', error)
    return NextResponse.json({ error: 'Cron job failed' }, { status: 500 })
  }
}
