import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import Endpoint from '@/models/Endpoint'
import PingLog from '@/models/PingLog'

const PING_TIMEOUT_MS = 10000

export async function POST(request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { endpointId } = await request.json()
    if (!endpointId) {
      return NextResponse.json(
        { error: 'endpointId is required' },
        { status: 400 }
      )
    }

    await connectDB()

    const endpoint = await Endpoint.findOne({ _id: endpointId, userId })
    if (!endpoint) {
      return NextResponse.json(
        { error: 'Endpoint not found' },
        { status: 404 }
      )
    }

    let status = 0
    let errorMessage
    const start = Date.now()

    try {
      const response = await fetch(endpoint.url, {
        method: endpoint.method,
        signal: AbortSignal.timeout(PING_TIMEOUT_MS),
      })
      status = response.status
    } catch (err) {
      errorMessage = err.name === 'TimeoutError' ? 'Request timed out' : err.message
    }

    const responseTime = Date.now() - start

    const log = await PingLog.create({
      endpointId: endpoint._id,
      status,
      responseTime,
      errorMessage,
    })

    return NextResponse.json(log, { status: 201 })
  } catch (error) {
    console.error('POST /api/ping failed:', error)
    return NextResponse.json(
      { error: 'Failed to ping endpoint' },
      { status: 500 }
    )
  }
}
