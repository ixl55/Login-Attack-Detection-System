import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import type { StatsRange } from '../api/types'
import { readPref, writePref } from './storage'

const RANGES: StatsRange[] = ['1h', '24h', '7d']

const RangeContext = createContext<{ range: StatsRange; setRange: (r: StatsRange) => void } | null>(null)

export function RangeProvider({ children }: { children: ReactNode }) {
  const [range, setRangeState] = useState<StatsRange>(() => {
    const saved = readPref('lads.range') as StatsRange | null
    return saved && RANGES.includes(saved) ? saved : '24h'
  })
  const setRange = useCallback((r: StatsRange) => {
    writePref('lads.range', r)
    setRangeState(r)
  }, [])
  return <RangeContext.Provider value={{ range, setRange }}>{children}</RangeContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useRange() {
  const ctx = useContext(RangeContext)
  if (!ctx) throw new Error('useRange must be used inside RangeProvider')
  return ctx
}

// eslint-disable-next-line react-refresh/only-export-components
export { RANGES }
