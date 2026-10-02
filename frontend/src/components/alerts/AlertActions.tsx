import { CheckCheck, Eye, RotateCcw } from 'lucide-react'
import { useUpdateAlertStatus } from '../../api/hooks'
import type { Alert } from '../../api/types'
import { useI18n } from '../../i18n/context'
import { Button } from '../ui/Button'

export function AlertActions({ alert, size = 'sm' }: { alert: Alert; size?: 'sm' | 'md' }) {
  const { t } = useI18n()
  const update = useUpdateAlertStatus()
  const set = (status: Alert['status']) => update.mutate({ id: alert.id, status })
  const busy = update.isPending
  // Clicks inside a clickable feed row must not also open the drawer.
  const stop = (e: React.MouseEvent) => e.stopPropagation()

  return (
    <div className="flex flex-wrap gap-1.5" onClick={stop}>
      {alert.status === 'open' && (
        <Button size={size} disabled={busy} onClick={() => set('acknowledged')}>
          <Eye className="size-3.5" aria-hidden />
          {t('action.acknowledge')}
        </Button>
      )}
      {alert.status !== 'resolved' ? (
        <Button size={size} variant="primary" disabled={busy} onClick={() => set('resolved')}>
          <CheckCheck className="size-3.5" aria-hidden />
          {t('action.resolve')}
        </Button>
      ) : (
        <Button size={size} disabled={busy} onClick={() => set('open')}>
          <RotateCcw className="size-3.5" aria-hidden />
          {t('action.reopen')}
        </Button>
      )}
    </div>
  )
}
