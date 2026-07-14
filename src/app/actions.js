'use server'

import { auth, clerkClient } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import { connectDB } from '@/lib/mongodb'
import { pingEndpoint } from '@/lib/ping'
import { assertSafeUrl } from '@/lib/validateUrl'
import Endpoint from '@/models/Endpoint'
import PingLog from '@/models/PingLog'

async function requireUserId() {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')
  return userId
}

export async function addEndpoint(formData) {
  const userId = await requireUserId()

  // clerkClient is an async factory in @clerk/nextjs v7 (returns a Promise),
  // so we must await it before accessing the users API.
  const client = await clerkClient()
  const user = await client.users.getUser(userId)
  const ownerEmail = user.emailAddresses?.[0]?.emailAddress
  if (!ownerEmail) throw new Error('Clerk user must have an email address')

  const name = formData.get('name')?.toString().trim()
  const url = formData.get('url')?.toString().trim()
  const method = formData.get('method')?.toString() || 'GET'
  const expectedStatusRaw = formData.get('expectedStatus')?.toString().trim()

  if (!name || !url) throw new Error('name and url are required')
  if (name.length > 100) throw new Error('name must be 100 characters or fewer')

  if (method !== 'GET' && method !== 'HEAD') {
    throw new Error('Only GET and HEAD methods are allowed')
  }

  let expectedStatus = 200
  if (expectedStatusRaw) {
    expectedStatus = Number(expectedStatusRaw)
    if (!Number.isInteger(expectedStatus) || expectedStatus < 100 || expectedStatus > 599) {
      throw new Error('Expected status must be an integer between 100 and 599')
    }
  }

  await assertSafeUrl(url)

  await connectDB()
  await Endpoint.create({ userId, ownerEmail, name, url, method, expectedStatus })
  revalidatePath('/')
}

export async function deleteEndpoint(formData) {
  const userId = await requireUserId()
  const id = formData.get('id')?.toString()
  if (!id) throw new Error('id is required')

  await connectDB()
  const endpoint = await Endpoint.findOne({ _id: id, userId })
  if (!endpoint) throw new Error('Not found')

  await PingLog.deleteMany({ endpointId: endpoint._id })
  await endpoint.deleteOne()
  revalidatePath('/')
}

export async function pingNow(formData) {
  const userId = await requireUserId()
  const id = formData.get('id')?.toString()
  if (!id) throw new Error('id is required')

  await connectDB()
  const endpoint = await Endpoint.findOne({ _id: id, userId })
  if (!endpoint) throw new Error('Not found')

  await pingEndpoint(endpoint)
  revalidatePath('/')
}
