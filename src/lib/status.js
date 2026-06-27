const SLOW_THRESHOLD_MS = 1000

export function computeStatus(log) {
  if (!log) return 'unknown'
  if (log.status === 0 || log.status >= 400) return 'down'
  if (log.responseTime > SLOW_THRESHOLD_MS) return 'slow'
  return 'up'
}
