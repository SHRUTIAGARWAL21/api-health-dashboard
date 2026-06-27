import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { pingEndpoint } from '@/lib/ping'
import Endpoint from '@/models/Endpoint'

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

    const log = await pingEndpoint(endpoint)

    return NextResponse.json(log, { status: 201 })
  } catch (error) {
    console.error('POST /api/ping failed:', error)
    return NextResponse.json(
      { error: 'Failed to ping endpoint' },
      { status: 500 }
    )
  }
}
