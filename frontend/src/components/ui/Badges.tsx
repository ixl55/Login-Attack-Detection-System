import clsx from 'clsx'
import { CheckCircle2, CircleDot, Eye, XCircle } from 'lucide-react'
import type { AlertStatus, Severity } from '../../api/types'
import { useI18n } from '../../i18n/context'
import { SEVERITY_BG } from '../../lib/severity'

// Severity is carried by the colored marker + label, never by text color alone.
export function SeverityBadge({ severity, className }: { severity: Severity; className?: string }) {
  const { t } = useI18n()
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-2 px-2 py-0.5 text-xs font-medium text-ink',
        className,
      )}
    >
      <span className={clsx('size-2 rounded-full', SEVERITY_BG[severity])} aria-hidden />
      {t(`severity.${severity}`)}
    </span>
  )
}

const STATUS_ICON = { open: CircleDot, acknowledged: Eye, resolved: CheckCircle2 }

export function StatusBadge({ status }: { status: AlertStatus }) {
  const { t } = useI18n()
  const Icon = STATUS_ICON[status]
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 text-xs font-medium',
        status === 'open' ? 'text-ink' : 'text-muted',
      )}
    >
      <Icon className={clsx('size-3.5', status === 'open' && 'text-primary')} aria-hidden />
      {t(`status.${status}`)}
    </span>
  )
}

export function ResultBadge({ success }: { success: boolean }) {
  const { t } = useI18n()
  const Icon = success ? CheckCircle2 : XCircle
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium',
        success ? 'bg-ok/10 text-ok-text' : 'bg-critical/10 text-bad-text',
      )}
    >
      <Icon className="size-3.5" aria-hidden />
      {t(success ? 'result.success' : 'result.failed')}
    </span>
  )
}
