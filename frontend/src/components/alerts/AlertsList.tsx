import clsx from 'clsx'
import { useEffect, useRef } from 'react'
import type { Alert } from '../../api/types'
import { useI18n } from '../../i18n/context'
import { useAlertParam } from '../../lib/alertParam'
import { AlertTypeIcon } from '../ui/AlertTypeIcon'
import { SEVERITY_BG } from '../../lib/severity'
import { SeverityBadge, StatusBadge } from '../ui/Badges'
import { LtrText } from '../ui/LtrText'
import { AlertActions } from './AlertActions'

/** Alert rows: severity stripe, type, entity, relative time, status and quick actions. */
export function AlertsList({ alerts }: { alerts: Alert[] }) {
  const { t, fmtRelative, fmtDateTime, fmtNumber } = useI18n()
  const { openAlert } = useAlertParam()

  // Highlight alerts that appear after the first render.
  const seen = useRef<Set<number> | null>(null)
  const fresh = new Set<number>()
  if (seen.current) for (const a of alerts) if (!seen.current.has(a.id)) fresh.add(a.id)
  useEffect(() => {
    seen.current ??= new Set()
    for (const a of alerts) seen.current.add(a.id)
  }, [alerts])

  return (
    <ul className="divide-y divide-line">
      {alerts.map((a) => (
        <li
          key={a.id}
          className={clsx(
            'relative cursor-pointer py-3 ps-4 pe-2 transition hover:bg-surface-2/60',
            fresh.has(a.id) && 'animate-flash',
            a.status === 'resolved' && 'opacity-60',
          )}
          onClick={() => openAlert(a.id)}
        >
          <span className={clsx('absolute inset-y-2 start-0 w-1 rounded-full', SEVERITY_BG[a.severity])} aria-hidden />
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <AlertTypeIcon type={a.type} className="size-4 text-muted" />
                <button
                  className="text-start text-sm font-semibold text-ink hover:text-primary"
                  onClick={(e) => {
                    e.stopPropagation()
                    openAlert(a.id)
                  }}
                >
                  {t(`alertType.${a.type}`)}
                </button>
                <SeverityBadge severity={a.severity} />
                <StatusBadge status={a.status} />
              </div>
              <p className="mt-1 truncate text-sm text-ink-2" dir="auto" title={a.description}>
                {a.username && <LtrText className="text-ink">{a.username}</LtrText>}
                {a.username && a.ip_address && <span className="mx-1.5 text-muted">·</span>}
                {a.ip_address && <LtrText className="text-ink">{a.ip_address}</LtrText>}
                <span className="mx-1.5 text-muted">·</span>
                <span className="tabular">{fmtNumber(a.event_count)}×</span>
              </p>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <time className="text-xs text-muted" dateTime={a.last_seen} title={fmtDateTime(a.last_seen)}>
                {fmtRelative(a.last_seen)}
              </time>
              {a.status !== 'resolved' && <AlertActions alert={a} />}
            </div>
          </div>
        </li>
      ))}
    </ul>
  )
}
