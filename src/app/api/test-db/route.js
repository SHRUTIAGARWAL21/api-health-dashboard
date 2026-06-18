import { connectDB } from '@/lib/mongodb'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const conn = await connectDB()
    return NextResponse.json({
      status: 'ok',
      message: 'Connected to MongoDB!',
      database: conn.connection.db.databaseName,
    })
  } catch (error) {
    return NextResponse.json(
      { status: 'error', message: error.message },
      { status: 500 }
    )
  }
}
