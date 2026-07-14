'use client'

import { useState } from 'react'

export default function AISummary({ endpointId }) {
  const [summary, setSummary] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    setLoading(true)
    setError(null)
    setSummary(null)
    try {
      const res = await fetch('/api/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpointId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Request failed')
      setSummary(data.summary)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="px-3 py-1.5 text-xs rounded bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50"
      >
        {loading ? 'Thinking…' : 'Explain failures (AI)'}
      </button>
      {summary && (
        <p className="text-sm text-zinc-700 dark:text-zinc-300 bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-900 rounded p-3 whitespace-pre-wrap">
          {summary}
        </p>
      )}
      {error && (
        <p className="text-sm text-red-600 bg-red-50 dark:bg-red-950/30 border border-red-200 rounded p-3">
          {error}
        </p>
      )}
    </div>
  )
}
