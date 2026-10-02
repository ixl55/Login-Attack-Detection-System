import clsx from 'clsx'
import { ArrowDownRight, ArrowUpRight, Minus, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { useI18n } from '../../i18n/context'
import { Skeleton } from './States'

interface KpiCardProps {
  label: string
  value: string | null
  icon: LucideIcon
  hint?: ReactNode
  /** Relative change vs previous period (0.25 = +25%). */
  delta?: number | null
  /** For metrics where going up is bad (attempts under attack, failure rate). */
  upIsBad?: boolean
  accent?: 'default' | 'critical'
}

export function KpiCard({ label, value, icon: Icon, hint, delta, upIsBad = true, accent = 'default' }: KpiCardProps) {
  const { t, fmtPercent } = useI18n()
  const hasDelta = delta !== undefined && delta !== null && Number.isFinite(delta)
  const flat = hasDelta && Math.abs(delta!) < 0.005
  const up = hasDelta && delta! > 0
  const bad = hasDelta && !flat && up === upIsBad
  const DeltaIcon = flat ? Minus : up ? ArrowUpRight : ArrowDownRight

  return (
    <div
      className={clsx(
        'relative overflow-hidden rounded-xl border bg-surface p-4 shadow-sm',
        accent === 'critical' ? 'border-critical/50' : 'border-line',
      )}
    >
      {accent === 'critical' && <div className="absolute inset-y-0 start-0 w-1 bg-critical" aria-hidden />}
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-ink-2">{label}</p>
        <span className="rounded-lg bg-primary-soft p-2 text-primary">
          <Icon className="size-4" aria-hidden />
        </span>
      </div>
      <div className="mt-2 text-3xl font-semibold tracking-tight text-ink">
        {value === null ? <Skeleton className="h-9 w-24" /> : value}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
        {hasDelta && (
          <span
            className={clsx(
              'inline-flex items-center gap-0.5 rounded px-1 py-0.5 font-medium tabular',
              flat ? 'text-muted' : bad ? 'bg-critical/10 text-bad-text' : 'bg-ok/10 text-ok-text',
            )}
            title={t('kpi.vsPrevious')}
          >
            <DeltaIcon className="size-3.5" aria-hidden />
            {flat ? t('kpi.noChange') : Math.abs(delta!) >= 10 ? `>${fmtPercent(10, 0)}` : fmtPercent(Math.abs(delta!), 0)}
          </span>
        )}
        {hint && <span>{hint}</span>}
      </div>
    </div>
  )
}
