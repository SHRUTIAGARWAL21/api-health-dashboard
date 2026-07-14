import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'
import mongoose from 'mongoose'
import { connectDB } from '@/lib/mongodb'
import Endpoint from '@/models/Endpoint'
import PingLog from '@/models/PingLog'

const MODEL = 'gemini-2.5-flash'
const LOG_LIMIT = 50

export async function POST(request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY is not set' },
        { status: 500 }
      )
    }

    const { endpointId } = await request.json()
    if (!endpointId) {
      return NextResponse.json({ error: 'endpointId is required' }, { status: 400 })
    }
    if (!mongoose.isValidObjectId(endpointId)) {
      return NextResponse.json({ error: 'Invalid endpointId' }, { status: 400 })
    }

    await connectDB()
    const endpoint = await Endpoint.findOne({ _id: endpointId, userId }).lean()
    if (!endpoint) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const logs = await PingLog.find({ endpointId })
      .sort({ createdAt: -1 })
      .limit(LOG_LIMIT)
      .lean()

    if (logs.length === 0) {
      return NextResponse.json({
        summary: 'No pings recorded yet. Try "Ping now" or wait for the cron job to run.',
      })
    }

    const prompt = buildPrompt(endpoint, logs)

    const ai = new GoogleGenAI({ apiKey })
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: prompt,
    })

    return NextResponse.json({ summary: response.text ?? 'No summary returned.' })
  } catch (error) {
    console.error('POST /api/summary failed:', error)
    return NextResponse.json(
      { error: 'Failed to generate summary' },
      { status: 500 }
    )
  }
}

function buildPrompt(endpoint, logs) {
  const lines = logs.map((log) => {
    const ts = new Date(log.createdAt).toISOString()
    const error = log.errorMessage ? ` error="${log.errorMessage}"` : ''
    return `- ${ts} status=${log.status} responseTime=${log.responseTime}ms${error}`
  })

  return `You are a site reliability engineer. Analyze the recent health checks for this API endpoint and explain in 2-4 short sentences what is happening and what the likely cause is. Be specific and actionable. Do not use markdown.

Endpoint: ${endpoint.name} (${endpoint.method} ${endpoint.url})

Recent pings (newest first):
${lines.join('\n')}`
}
