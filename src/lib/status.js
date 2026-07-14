const SLOW_THRESHOLD_MS = 1000

export function computeStatus(log, expectedStatus = 200) {
  if (!log) return 'unknown'
  if (log.status === 0 || log.status !== expectedStatus) return 'down'
  if (log.responseTime > SLOW_THRESHOLD_MS) return 'slow'
  return 'up'
}
