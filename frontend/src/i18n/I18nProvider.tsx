import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { readPref, writePref } from '../lib/storage'
import ar from './ar'
import { I18nContext, type I18n, type Lang } from './context'
import en, { type MessageKey } from './en'

const MESSAGES = { ar, en }
// Latin digits in both languages: IPs, counts and times read the same for every analyst.
const LOCALES: Record<Lang, string> = { ar: 'ar-SA-u-nu-latn-ca-gregory', en: 'en-GB' }

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => (readPref('lads.lang') === 'en' ? 'en' : 'ar'))
  const dir = lang === 'ar' ? 'rtl' : 'ltr'

  useEffect(() => {
    document.documentElement.lang = lang
    document.documentElement.dir = dir
  }, [lang, dir])

  const setLang = useCallback((next: Lang) => {
    writePref('lads.lang', next)
    setLangState(next)
  }, [])

  const value = useMemo<I18n>(() => {
    const locale = LOCALES[lang]
    const messages = MESSAGES[lang]
    const num = new Intl.NumberFormat(locale)
    const dateTime = new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' })
    const time = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    const hm = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' })
    const dayHour = new Intl.DateTimeFormat(locale, { weekday: 'short', hour: '2-digit' })
    const rel = new Intl.RelativeTimeFormat(locale, { numeric: 'auto', style: 'short' })

    const t = (key: MessageKey, vars?: Record<string, string | number>) => {
      let s: string = messages[key] ?? en[key] ?? key
      if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v))
      return s
    }

    return {
      lang,
      dir,
      setLang,
      t,
      fmtNumber: (n, opts) => (opts ? new Intl.NumberFormat(locale, opts).format(n) : num.format(n)),
      fmtPercent: (ratio, digits = 1) =>
        new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: digits }).format(ratio),
      fmtDateTime: (iso) => dateTime.format(new Date(iso)),
      fmtTime: (iso) => time.format(new Date(iso)),
      fmtAxisTime: (iso, bucketMinutes) => (bucketMinutes >= 360 ? dayHour : hm).format(new Date(iso)),
      fmtRelative: (iso) => {
        const seconds = Math.round((new Date(iso).getTime() - Date.now()) / 1000)
        const abs = Math.abs(seconds)
        if (abs < 60) return rel.format(seconds, 'second')
        if (abs < 3600) return rel.format(Math.round(seconds / 60), 'minute')
        if (abs < 86400) return rel.format(Math.round(seconds / 3600), 'hour')
        return rel.format(Math.round(seconds / 86400), 'day')
      },
    }
  }, [lang, dir, setLang])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}
