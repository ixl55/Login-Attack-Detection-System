import { Globe, User } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAlert } from '../../api/hooks'
import { useI18n } from '../../i18n/context'
import { useAlertParam } from '../../lib/alertParam'
import { AlertTypeIcon } from '../ui/AlertTypeIcon'
import { SeverityBadge, StatusBadge } from '../ui/Badges'
import { Drawer } from '../ui/Drawer'
import { LtrText } from '../ui/LtrText'
import { EmptyState, SkeletonRows } from '../ui/States'
import { AlertActions } from './AlertActions'
import { AlertDetails } from './AlertDetails'

export function AlertDrawer() {
  const { t, fmtDateTime, fmtNumber } = useI18n()
  const { alertId, closeAlert } = useAlertParam()
  const { data: alert, isLoading, isError } = useAlert(alertId)

  return (
    <Drawer open={alertId !== null} onClose={closeAlert} title={t('alert.details')}>
      {isLoading && <SkeletonRows rows={6} />}
      {isError && <EmptyState title={t('alert.notFound')} compact />}
      {alert && (
        <div className="space-y-5">
          <div>
            <div className="flex items-center gap-2">
              <AlertTypeIcon type={alert.type} className="size-5 text-primary" />
              <h3 className="text-lg font-semibold text-ink">{t(`alertType.${alert.type}`)}</h3>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <SeverityBadge severity={alert.severity} />
              <StatusBadge status={alert.status} />
              <span className="text-xs text-muted">#{alert.id}</span>
            </div>
            <p className="mt-3 text-sm text-ink-2" dir="ltr" lang="en">
              {alert.description}
            </p>
          </div>

          <AlertActions alert={alert} size="md" />

          <div className="rounded-xl border border-line p-4">
            <AlertDetails alert={alert} />
          </div>

          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-xs text-muted">{t('alert.firstSeen')}</dt>
              <dd className="text-ink">{fmtDateTime(alert.first_seen)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">{t('alert.lastSeen')}</dt>
              <dd className="text-ink">{fmtDateTime(alert.last_seen)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">{t('alert.events')}</dt>
              <dd className="text-ink tabular">{fmtNumber(alert.event_count)}</dd>
            </div>
          </dl>

          <div className="flex flex-wrap gap-2 border-t border-line pt-4">
            {alert.username && (
              <Link
                to={`/investigate/user/${encodeURIComponent(alert.username)}`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-sm text-ink hover:border-primary"
              >
                <User className="size-4 text-primary" aria-hidden />
                {t('action.investigateUser')}: <LtrText>{alert.username}</LtrText>
              </Link>
            )}
            {alert.ip_address && (
              <Link
                to={`/investigate/ip/${encodeURIComponent(alert.ip_address)}`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-sm text-ink hover:border-primary"
              >
                <Globe className="size-4 text-primary" aria-hidden />
                {t('action.investigateIp')}: <LtrText>{alert.ip_address}</LtrText>
              </Link>
            )}
          </div>
        </div>
      )}
    </Drawer>
  )
}
