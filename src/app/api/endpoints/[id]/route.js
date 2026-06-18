import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import Endpoint from '@/models/Endpoint'
import PingLog from '@/models/PingLog'

export async function DELETE(request, { params }) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    await connectDB()

    const deleted = await Endpoint.findOneAndDelete({ _id: id, userId })

    if (!deleted) {
      return NextResponse.json(
        { error: 'Endpoint not found' },
        { status: 404 }
      )
    }

    await PingLog.deleteMany({ endpointId: id })

    return NextResponse.json({ ok: true, id })
  } catch (error) {
    console.error('DELETE /api/endpoints/[id] failed:', error)
    return NextResponse.json(
      { error: 'Failed to delete endpoint' },
      { status: 500 }
    )
  }
}
