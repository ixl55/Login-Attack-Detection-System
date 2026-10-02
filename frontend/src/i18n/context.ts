import { createContext, useContext } from 'react'
import type { MessageKey } from './en'

export type Lang = 'ar' | 'en'

export interface I18n {
  lang: Lang
  dir: 'rtl' | 'ltr'
  setLang: (lang: Lang) => void
  t: (key: MessageKey, vars?: Record<string, string | number>) => string
  fmtNumber: (n: number, opts?: Intl.NumberFormatOptions) => string
  fmtPercent: (ratio: number, digits?: number) => string
  fmtDateTime: (iso: string) => string
  fmtTime: (iso: string) => string
  fmtAxisTime: (iso: string, bucketMinutes: number) => string
  fmtRelative: (iso: string) => string
}

export const I18nContext = createContext<I18n | null>(null)

export function useI18n(): I18n {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used inside I18nProvider')
  return ctx
}
