const IPV4 = /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/
const IPV6 = /^[0-9a-f:]+(%\w+)?$/i

export function isIpAddress(value: string): boolean {
  const v = value.trim()
  return IPV4.test(v) || (v.includes(':') && v.split(':').length >= 3 && IPV6.test(v))
}

export function investigatePath(query: string): string {
  const q = query.trim()
  return isIpAddress(q) ? `/investigate/ip/${encodeURIComponent(q)}` : `/investigate/user/${encodeURIComponent(q)}`
}
