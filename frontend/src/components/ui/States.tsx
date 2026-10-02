import clsx from 'clsx'
import { AlertTriangle, Inbox, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { useI18n } from '../../i18n/context'

export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx('animate-pulse rounded-md bg-surface-2', className)} aria-hidden />
}

export function SkeletonRows({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2" aria-busy="true">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-9 w-full" />
      ))}
    </div>
  )
}

export function EmptyState({
  title,
  hint,
  icon: Icon = Inbox,
  action,
  compact,
}: {
  title: string
  hint?: ReactNode
  icon?: LucideIcon
  action?: ReactNode
  compact?: boolean
}) {
  return (
    <div className={clsx('flex flex-col items-center justify-center text-center', compact ? 'py-6' : 'py-12')}>
      <span className="mb-3 rounded-full bg-surface-2 p-3 text-muted">
        <Icon className="size-6" aria-hidden />
      </span>
      <p className="font-medium text-ink">{title}</p>
      {hint && <p className="mt-1 max-w-md text-sm text-muted">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function ErrorBanner({ onRetry }: { onRetry?: () => void }) {
  const { t } = useI18n()
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center gap-3 rounded-xl border border-critical/40 bg-critical/10 px-4 py-3 text-sm"
    >
      <AlertTriangle className="size-5 shrink-0 text-critical" aria-hidden />
      <div className="flex-1">
        <p className="font-medium text-ink">{t('state.error')}</p>
        <p className="text-ink-2">{t('state.errorHint')}</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="rounded-lg border border-line bg-surface px-3 py-1.5 font-medium text-ink hover:bg-surface-2"
        >
          {t('action.retry')}
        </button>
      )}
    </div>
  )
}
