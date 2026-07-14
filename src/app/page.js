import { auth } from '@clerk/nextjs/server'
import { SignInButton } from '@clerk/nextjs'
import { connectDB } from '@/lib/mongodb'
import Endpoint from '@/models/Endpoint'
import PingLog from '@/models/PingLog'
import AddEndpointForm from '@/components/AddEndpointForm'
import EndpointCard from '@/components/EndpointCard'

const LOGS_PER_ENDPOINT = 24

async function getDashboardData(userId) {
  await connectDB()
  const endpointDocs = await Endpoint.find({ userId })
    .sort({ createdAt: -1 })
    .lean()

  const endpointIds = endpointDocs.map((e) => e._id)

  const endpoints = endpointDocs.map((e) => ({
    _id: e._id.toString(),
    name: e.name,
    url: e.url,
    method: e.method,
    expectedStatus: e.expectedStatus,
  }))

  const grouped = await PingLog.aggregate([
    { $match: { endpointId: { $in: endpointIds } } },
    { $sort: { createdAt: -1 } },
    {
      $group: {
        _id: '$endpointId',
        logs: {
          $push: {
            _id: '$_id',
            status: '$status',
            responseTime: '$responseTime',
            errorMessage: '$errorMessage',
            createdAt: '$createdAt',
          },
        },
      },
    },
    { $project: { logs: { $slice: ['$logs', LOGS_PER_ENDPOINT] } } },
  ])

  const logsByEndpoint = {}
  for (const e of endpoints) logsByEndpoint[e._id] = []
  for (const group of grouped) {
    logsByEndpoint[group._id.toString()] = group.logs.map((log) => ({
      _id: log._id.toString(),
      status: log.status,
      responseTime: log.responseTime,
      errorMessage: log.errorMessage,
      createdAt: log.createdAt.toISOString(),
    }))
  }

  return { endpoints, logsByEndpoint }
}

export default async function Home() {
  const { userId } = await auth()

  if (!userId) {
    return (
      <main className="flex flex-1 items-center justify-center p-8">
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-semibold">API Health Dashboard</h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            Monitor your APIs 24/7 with AI-powered diagnostics.
          </p>
          <div className="pt-2">
            <SignInButton>
              <button className="px-5 py-2.5 rounded-full bg-black text-white dark:bg-white dark:text-black font-medium">
                Sign in to get started
              </button>
            </SignInButton>
          </div>
        </div>
      </main>
    )
  }

  const { endpoints, logsByEndpoint } = await getDashboardData(userId)

  return (
    <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-8 space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Your endpoints</h1>
        <p className="text-sm text-zinc-500">
          Pinged automatically every 5 minutes. Click "Ping now" to refresh on demand.
        </p>
      </header>

      <AddEndpointForm />

      {endpoints.length === 0 ? (
        <p className="text-sm text-zinc-500 text-center py-8 border border-dashed rounded-lg">
          No endpoints yet. Add one above to start monitoring.
        </p>
      ) : (
        <div className="space-y-4">
          {endpoints.map((endpoint) => (
            <EndpointCard
              key={endpoint._id}
              endpoint={endpoint}
              logs={logsByEndpoint[endpoint._id] ?? []}
            />
          ))}
        </div>
      )}
    </main>
  )
}
