import { readPref, writePref } from './storage'

export interface RecentEntity {
  kind: 'user' | 'ip'
  value: string
}

const KEY = 'lads.recent'
const MAX = 8

export function readRecent(): RecentEntity[] {
  try {
    const parsed = JSON.parse(readPref(KEY) ?? '[]')
    return Array.isArray(parsed) ? parsed.filter((e) => e && (e.kind === 'user' || e.kind === 'ip')) : []
  } catch {
    return []
  }
}

export function pushRecent(entity: RecentEntity): void {
  const rest = readRecent().filter((e) => !(e.kind === entity.kind && e.value === entity.value))
  writePref(KEY, JSON.stringify([entity, ...rest].slice(0, MAX)))
}
