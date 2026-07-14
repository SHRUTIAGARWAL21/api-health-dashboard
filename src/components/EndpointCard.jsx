import StatusDot from './StatusDot'
import ResponseTimeChart from './ResponseTimeChart'
import EndpointActions from './EndpointActions'
import AISummary from './AISummary'
import { computeStatus } from '@/lib/status'

function formatRelative(date) {
  if (!date) return 'never'
  const diff = Date.now() - new Date(date).getTime()
  const seconds = Math.floor(diff / 1000)
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export default function EndpointCard({ endpoint, logs }) {
  const latest = logs[0]
  const status = computeStatus(latest, endpoint.expectedStatus)

  return (
    <div className="border rounded-lg bg-white dark:bg-zinc-900 p-4 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold truncate">{endpoint.name}</h3>
            <StatusDot status={status} />
          </div>
          <p className="text-xs text-zinc-500 truncate">
            {endpoint.method} {endpoint.url}
          </p>
          <p className="text-xs text-zinc-400 mt-1">
            Last checked: {formatRelative(latest?.createdAt)}
            {latest && ` · ${latest.responseTime}ms · status ${latest.status}`}
          </p>
        </div>
        <EndpointActions endpointId={endpoint._id} />
      </div>

      <ResponseTimeChart logs={[...logs].reverse()} />

      <AISummary endpointId={endpoint._id} />
    </div>
  )
}
