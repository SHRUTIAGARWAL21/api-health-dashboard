'use client'

import { useTransition } from 'react'
import { deleteEndpoint, pingNow } from '@/app/actions'

export default function EndpointActions({ endpointId }) {
  const [pinging, startPing] = useTransition()
  const [deleting, startDelete] = useTransition()

  function handlePing() {
    const fd = new FormData()
    fd.set('id', endpointId)
    startPing(async () => {
      try {
        await pingNow(fd)
      } catch (err) {
        alert(err.message ?? 'Ping failed')
      }
    })
  }

  function handleDelete() {
    if (!confirm('Delete this endpoint and its history?')) return
    const fd = new FormData()
    fd.set('id', endpointId)
    startDelete(async () => {
      try {
        await deleteEndpoint(fd)
      } catch (err) {
        alert(err.message ?? 'Delete failed')
      }
    })
  }

  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={handlePing}
        disabled={pinging}
        className="px-3 py-1.5 text-xs rounded border hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50"
      >
        {pinging ? 'Pinging…' : 'Ping now'}
      </button>
      <button
        type="button"
        onClick={handleDelete}
        disabled={deleting}
        className="px-3 py-1.5 text-xs rounded border border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-950 disabled:opacity-50"
      >
        {deleting ? 'Deleting…' : 'Delete'}
      </button>
    </div>
  )
}
