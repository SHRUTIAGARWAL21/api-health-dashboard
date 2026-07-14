const COLORS = {
  up: 'bg-green-500',
  slow: 'bg-yellow-500',
  down: 'bg-red-500',
  unknown: 'bg-zinc-400',
}

const LABELS = {
  up: 'Up',
  slow: 'Slow',
  down: 'Down',
  unknown: 'Not yet checked',
}

export default function StatusDot({ status }) {
  const color = COLORS[status] ?? COLORS.unknown
  const label = LABELS[status] ?? LABELS.unknown
  return (
    <span className="inline-flex items-center gap-2">
      <span className={`inline-block w-3 h-3 rounded-full ${color}`} aria-hidden />
      <span className="text-sm text-zinc-600 dark:text-zinc-400">{label}</span>
    </span>
  )
}
