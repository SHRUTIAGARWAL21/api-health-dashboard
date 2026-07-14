import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'

function ipv4ToParts(ip) {
  return ip.split('.').map((p) => Number(p))
}

function isPrivateIPv4(ip) {
  const [a, b] = ipv4ToParts(ip)
  if (a === 127) return true // 127.0.0.0/8 loopback
  if (a === 10) return true // 10.0.0.0/8
  if (a === 172 && b >= 16 && b <= 31) return true // 172.16.0.0/12
  if (a === 192 && b === 168) return true // 192.168.0.0/16
  if (a === 169 && b === 254) return true // 169.254.0.0/16 link-local
  if (a === 0) return true // 0.0.0.0/8
  if (a === 100 && b >= 64 && b <= 127) return true // 100.64.0.0/10 CGNAT
  return false
}

function isPrivateIPv6(ip) {
  const lower = ip.toLowerCase()

  // IPv4-mapped IPv6 (::ffff:x.x.x.x) — extract and check the embedded IPv4.
  // The trailing 32 bits may be dotted (::ffff:127.0.0.1) or hex (::ffff:7f00:1).
  const mapped = lower.match(/^::ffff:(.+)$/)
  if (mapped) {
    const rest = mapped[1]
    if (rest.includes('.')) return isPrivateIPv4(rest)
    const words = rest.split(':').map((w) => parseInt(w, 16))
    const hi = words.length === 2 ? words[0] : 0
    const lo = words[words.length - 1]
    const a = (hi >> 8) & 0xff
    const b = hi & 0xff
    const c = (lo >> 8) & 0xff
    const d = lo & 0xff
    return isPrivateIPv4(`${a}.${b}.${c}.${d}`)
  }

  if (lower === '::1' || lower === '::') return true // loopback / unspecified

  const first = parseInt(lower.split(':')[0] || '0', 16)
  if ((first & 0xfe00) === 0xfc00) return true // fc00::/7 unique-local
  if ((first & 0xffc0) === 0xfe80) return true // fe80::/10 link-local

  return false
}

function isPrivateAddress(ip) {
  const family = isIP(ip)
  if (family === 4) return isPrivateIPv4(ip)
  if (family === 6) return isPrivateIPv6(ip)
  return true // unknown format — reject to be safe
}

export async function assertSafeUrl(rawUrl) {
  let url
  try {
    url = new URL(rawUrl)
  } catch {
    throw new Error('Invalid URL')
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Only http and https URLs are allowed')
  }

  if (url.username || url.password) {
    throw new Error('URLs with credentials are not allowed')
  }

  const hostname = url.hostname.toLowerCase()
  if (hostname === 'localhost') {
    throw new Error('This URL points to a private or reserved address')
  }

  // IPv6 literals arrive wrapped in brackets from url.hostname
  const host = hostname.startsWith('[') && hostname.endsWith(']')
    ? hostname.slice(1, -1)
    : hostname

  if (isIP(host)) {
    if (isPrivateAddress(host)) {
      throw new Error('This URL points to a private or reserved address')
    }
    return url
  }

  let addresses
  try {
    addresses = await lookup(host, { all: true })
  } catch {
    throw new Error('Could not resolve the host')
  }

  if (addresses.length === 0) {
    throw new Error('Could not resolve the host')
  }

  for (const { address } of addresses) {
    if (isPrivateAddress(address)) {
      throw new Error('This URL points to a private or reserved address')
    }
  }

  return url
}
