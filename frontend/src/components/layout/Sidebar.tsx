import clsx from 'clsx'
import { LayoutDashboard, ListTree, Search, ShieldCheck, X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { NavLink } from 'react-router-dom'
import { useStats } from '../../api/hooks'
import { useI18n } from '../../i18n/context'
import { useRange } from '../../lib/range'
import { useMediaQuery } from '../../lib/useMediaQuery'

const LINKS = [
  { to: '/', label: 'nav.overview', icon: LayoutDashboard, end: true, badge: true },
  { to: '/events', label: 'nav.events', icon: ListTree, end: false, badge: false },
  { to: '/investigate', label: 'nav.investigate', icon: Search, end: false, badge: false },
] as const

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, fmtNumber } = useI18n()
  const { range } = useRange()
  const { data: stats } = useStats(range)
  const openAlerts = stats?.open_alerts ?? 0
  const isDesktop = useMediaQuery('(min-width: 1024px)')
  const asideRef = useRef<HTMLElement>(null)
  // The off-canvas menu is out of the tab order / accessibility tree while closed on small screens.
  useEffect(() => {
    if (asideRef.current) asideRef.current.inert = !open && !isDesktop
  }, [open, isDesktop])

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className={clsx('fixed inset-0 z-30 bg-black/50 lg:hidden', open ? 'block' : 'hidden')}
        onClick={onClose}
        aria-hidden
      />
      <aside
        ref={asideRef}
        className={clsx(
          'fixed inset-y-0 start-0 z-40 flex w-64 flex-col border-e border-line bg-surface transition-transform lg:sticky lg:top-0 lg:h-screen',
          !open && 'max-lg:ltr:-translate-x-full max-lg:rtl:translate-x-full',
        )}
      >
        <div className="flex items-center justify-between gap-2 px-5 py-5">
          <div className="flex items-center gap-2.5">
            <span className="rounded-lg bg-primary-soft p-2 text-primary">
              <ShieldCheck className="size-5" aria-hidden />
            </span>
            <div>
              <p className="font-mono text-base font-bold tracking-wider text-ink">{t('app.name')}</p>
              <p className="text-xs text-muted">{t('app.tagline')}</p>
            </div>
          </div>
          <button className="rounded-lg p-1.5 text-muted hover:bg-surface-2 lg:hidden" onClick={onClose} aria-label={t('nav.close')}>
            <X className="size-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-3">
          {LINKS.map(({ to, label, icon: Icon, end, badge }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onClose}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition',
                  isActive ? 'bg-primary-soft text-primary' : 'text-ink-2 hover:bg-surface-2 hover:text-ink',
                )
              }
            >
              <Icon className="size-4.5" aria-hidden />
              <span className="flex-1">{t(label)}</span>
              {badge && openAlerts > 0 && (
                <span className="rounded-full bg-critical px-2 py-0.5 text-xs font-semibold text-white tabular">
                  {fmtNumber(openAlerts)}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <p className="px-5 py-4 text-xs text-muted">
          <a href="/docs" className="hover:text-primary" target="_blank" rel="noreferrer">
            API · /docs
          </a>
        </p>
      </aside>
    </>
  )
}
