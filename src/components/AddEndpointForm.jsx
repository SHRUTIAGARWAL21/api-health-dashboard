'use client'

import { useRef, useTransition } from 'react'
import { addEndpoint } from '@/app/actions'

export default function AddEndpointForm() {
  const formRef = useRef(null)
  const [pending, startTransition] = useTransition()

  function handleSubmit(formData) {
    startTransition(async () => {
      try {
        await addEndpoint(formData)
        formRef.current?.reset()
      } catch (err) {
        alert(err.message ?? 'Failed to add endpoint')
      }
    })
  }

  return (
    <form
      ref={formRef}
      action={handleSubmit}
      className="flex flex-col sm:flex-row gap-2 p-4 border rounded-lg bg-white dark:bg-zinc-900"
    >
      <input
        name="name"
        placeholder="My API"
        required
        className="flex-1 px-3 py-2 border rounded bg-transparent text-sm"
      />
      <input
        name="url"
        type="url"
        placeholder="https://example.com/health"
        required
        className="flex-[2] px-3 py-2 border rounded bg-transparent text-sm"
      />
      <select
        name="method"
        defaultValue="GET"
        className="px-3 py-2 border rounded bg-transparent text-sm"
      >
        <option>GET</option>
        <option>HEAD</option>
      </select>
      <input
        name="expectedStatus"
        type="number"
        defaultValue={200}
        min={100}
        max={599}
        placeholder="Expected status"
        className="w-24 px-3 py-2 border rounded bg-transparent text-sm"
      />
      <button
        type="submit"
        disabled={pending}
        className="px-4 py-2 rounded bg-black text-white dark:bg-white dark:text-black text-sm font-medium disabled:opacity-50"
      >
        {pending ? 'Adding…' : 'Add'}
      </button>
    </form>
  )
}
