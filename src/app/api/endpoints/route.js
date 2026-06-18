import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import Endpoint from '@/models/Endpoint'

export async function POST(request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, url, method, expectedStatus } = body

    if (!name || !url) {
      return NextResponse.json(
        { error: 'name and url are required' },
        { status: 400 }
      )
    }

    await connectDB()

    const endpoint = await Endpoint.create({
      userId,
      name,
      url,
      method,
      expectedStatus,
    })

    return NextResponse.json(endpoint, { status: 201 })
  } catch (error) {
    console.error('POST /api/endpoints failed:', error)
    return NextResponse.json(
      { error: 'Failed to create endpoint' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()
    const endpoints = await Endpoint.find({ userId }).sort({ createdAt: -1 })

    return NextResponse.json(endpoints)
  } catch (error) {
    console.error('GET /api/endpoints failed:', error)
    return NextResponse.json(
      { error: 'Failed to fetch endpoints' },
      { status: 500 }
    )
  }
}
