import { ArrowLeft, ArrowRight, MapPin, TriangleAlert } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { Alert, TravelPlace } from '../../api/types'
import { useI18n } from '../../i18n/context'
import { LtrText } from '../ui/LtrText'
import { joinPlace } from '../../lib/place'

function Fact({ children }: { children: ReactNode }) {
  return <p className="text-sm text-ink-2">{children}</p>
}

function UserChips({ users }: { users: string[] }) {
  return (
    <div className="mt-1.5 flex flex-wrap gap-1.5">
      {users.map((u) => (
        <Link
          key={u}
          to={`/investigate/user/${encodeURIComponent(u)}`}
          className="rounded-md border border-line bg-surface-2 px-2 py-0.5 hover:border-primary"
        >
          <LtrText className="text-xs text-ink">{u}</LtrText>
        </Link>
      ))}
    </div>
  )
}

function Place({ place }: { place: TravelPlace }) {
  const { fmtDateTime } = useI18n()
  return (
    <div className="min-w-0 flex-1 rounded-lg border border-line bg-surface-2 p-3">
      <p className="flex items-center gap-1.5 font-medium text-ink">
        <MapPin className="size-4 text-primary" aria-hidden />
        {joinPlace(place.city, place.country) || <LtrText>{place.ip_address}</LtrText>}
      </p>
      <p className="mt-1 text-xs text-muted">
        <LtrText>{place.ip_address}</LtrText>
      </p>
      <p className="text-xs text-muted">{fmtDateTime(place.timestamp)}</p>
    </div>
  )
}

/** Human-readable explanation of an alert, shaped by its detector. */
export function AlertDetails({ alert }: { alert: Alert }) {
  const { t, fmtNumber, fmtPercent, dir } = useI18n()
  const d = alert.details
  const Arrow = dir === 'rtl' ? ArrowLeft : ArrowRight

  switch (alert.type) {
    case 'brute_force':
      return (
        <div className="space-y-2">
          <Fact>{t('alert.failedAttempts', { count: fmtNumber(d.failed_attempts ?? 0), window: d.window_minutes ?? '' })}</Fact>
          {d.scope === 'account' && <Fact>{t('alert.sourceIps', { count: fmtNumber(d.source_ips ?? 0) })}</Fact>}
          {d.scope === 'ip' && <Fact>{t('alert.ipScope', { count: fmtNumber(d.targeted_users ?? 0) })}</Fact>}
          {d.possible_compromise && (
            <p className="flex items-start gap-2 rounded-lg border border-critical/40 bg-critical/10 p-3 text-sm text-ink">
              <TriangleAlert className="mt-0.5 size-4 shrink-0 text-critical" aria-hidden />
              {t('alert.compromise')}
            </p>
          )}
        </div>
      )
    case 'password_spraying':
      return (
        <div className="space-y-3">
          <Fact>
            {t('alert.sprayed', {
              users: fmtNumber(d.distinct_users ?? 0),
              failed: fmtNumber(d.failed_attempts ?? 0),
              attempts: fmtNumber(d.attempts ?? 0),
              ratio: fmtPercent(d.failure_ratio ?? 0, 0),
              window: d.window_minutes ?? '',
            })}
          </Fact>
          {!!d.compromised_users?.length && (
            <div className="rounded-lg border border-critical/40 bg-critical/10 p-3">
              <p className="flex items-center gap-2 text-sm font-medium text-ink">
                <TriangleAlert className="size-4 text-critical" aria-hidden />
                {t('alert.compromisedUsers')}
              </p>
              <UserChips users={d.compromised_users} />
            </div>
          )}
          {!!d.usernames?.length && (
            <div>
              <p className="text-xs font-medium text-muted">{t('alert.accountsTried')}</p>
              <UserChips users={d.usernames} />
            </div>
          )}
        </div>
      )
    case 'impossible_travel':
      return (
        <div className="space-y-3">
          {d.from && d.to && (
            <div className="flex items-center gap-2">
              <Place place={d.from} />
              <Arrow className="size-5 shrink-0 text-critical" aria-hidden />
              <Place place={d.to} />
            </div>
          )}
          <Fact>
            {t('alert.travel', { distance: fmtNumber(d.distance_km ?? 0), minutes: fmtNumber(d.elapsed_minutes ?? 0) })}
          </Fact>
          <Fact>
            {d.speed_kmh == null
              ? t('alert.instant')
              : t('alert.speed', { speed: fmtNumber(Math.round(d.speed_kmh)), max: fmtNumber(d.max_speed_kmh ?? 0) })}
          </Fact>
        </div>
      )
    case 'suspicious_ip':
      return (
        <div className="space-y-3">
          <Fact>
            {t('alert.matchedRange')}: <LtrText className="text-ink">{d.matched_range}</LtrText>
          </Fact>
          <Fact>{t('alert.blocklistAttempts', { count: fmtNumber(d.attempts ?? 0) })}</Fact>
          {!!d.successful_users?.length && (
            <div className="rounded-lg border border-critical/40 bg-critical/10 p-3">
              <p className="flex items-center gap-2 text-sm font-medium text-ink">
                <TriangleAlert className="size-4 text-critical" aria-hidden />
                {t('alert.compromisedUsers')}
              </p>
              <UserChips users={d.successful_users} />
            </div>
          )}
          {!!d.usernames?.length && (
            <div>
              <p className="text-xs font-medium text-muted">{t('alert.accountsTried')}</p>
              <UserChips users={d.usernames} />
            </div>
          )}
        </div>
      )
  }
}
