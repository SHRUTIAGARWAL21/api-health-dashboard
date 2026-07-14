'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'

export default function ResponseTimeChart({ logs }) {
  if (!logs || logs.length === 0) {
    return (
      <div className="h-32 flex items-center justify-center text-xs text-zinc-500">
        No pings yet
      </div>
    )
  }

  const data = logs.map((log) => ({
    time: new Date(log.createdAt).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    }),
    responseTime: log.responseTime,
    status: log.status,
  }))

  return (
    <div className="h-32 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <XAxis dataKey="time" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 10 }} width={36} unit="ms" />
          <Tooltip
            contentStyle={{ fontSize: 12 }}
            formatter={(value) => [`${value} ms`, 'Response']}
          />
          <ReferenceLine
            y={1000}
            stroke="#eab308"
            strokeDasharray="3 3"
            label={{ value: 'slow', fontSize: 10, fill: '#eab308' }}
          />
          <Line
            type="monotone"
            dataKey="responseTime"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ r: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
