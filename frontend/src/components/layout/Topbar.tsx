import clsx from 'clsx'
import { Languages, Menu, Moon, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useStats } from '../../api/hooks'
import { useI18n } from '../../i18n/context'
import { RANGES, useRange } from '../../lib/range'
import { useTheme } from '../../theme/ThemeProvider'
import { SegmentedControl } from '../ui/Button'
import { SearchBox } from './SearchBox'

function LiveIndicator() {
  const { t, fmtRelative } = useI18n()
  const { range } = useRange()
  const { dataUpdatedAt, isError } = useStats(range)
  const [, tick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 1000)
    return () => clearInterval(id)
  }, [])
  const online = !isError && dataUpdatedAt > 0
  return (
    <div className="flex items-center gap-2 text-xs" aria-live="polite">
      <span
        className={clsx('size-2 rounded-full', online ? 'bg-ok animate-pulse-dot' : 'bg-muted')}
        aria-hidden
      />
      <span className="sr-only font-medium text-ink sm:not-sr-only">{online ? t('top.live') : t('top.offline')}</span>
      {dataUpdatedAt > 0 && (
        <span className="hidden text-muted xl:inline">
          {t('top.updated', { time: fmtRelative(new Date(dataUpdatedAt).toISOString()) })}
        </span>
      )}
    </div>
  )
}

export function Topbar({ onMenu }: { onMenu: () => void }) {
  const { t, lang, setLang } = useI18n()
  const { theme, toggle } = useTheme()
  const { range, setRange } = useRange()

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-bg/85 backdrop-blur">
      <div className="flex flex-wrap items-center gap-2 px-4 py-3 sm:gap-3 lg:px-6">
        <button
          className="rounded-lg p-2 text-ink-2 hover:bg-surface-2 lg:hidden"
          onClick={onMenu}
          aria-label={t('nav.menu')}
        >
          <Menu className="size-5" />
        </button>

        <div className="order-last w-full md:order-none md:w-auto md:max-w-md md:flex-1">
          <SearchBox />
        </div>

        <div className="ms-auto flex items-center gap-2 sm:gap-3">
          <SegmentedControl
            label={t('top.range')}
            value={range}
            onChange={setRange}
            options={RANGES.map((r) => ({ value: r, label: t(`range.${r}`) }))}
          />
          <LiveIndicator />
          <button
            onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-xs font-medium text-ink hover:bg-surface-2"
            lang={lang === 'ar' ? 'en' : 'ar'}
            aria-label={t('top.toggleLang')}
          >
            <Languages className="size-4" aria-hidden />
            <span className="hidden sm:inline">{t('top.toggleLang')}</span>
            <span className="sm:hidden">{lang === 'ar' ? 'EN' : 'ع'}</span>
          </button>
          <button
            onClick={toggle}
            className="rounded-lg border border-line p-1.5 text-ink hover:bg-surface-2"
            aria-label={t('top.toggleTheme')}
            title={t('top.toggleTheme')}
          >
            {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </button>
        </div>
      </div>
    </header>
  )
}
