import clsx from 'clsx'
import {
  Activity,
  Ban,
  Bell,
  CircleCheck,
  Flag,
  Globe,
  ListTree,
  MapPin,
  Network,
  Plane,
  Search,
  ShieldCheck,
  User,
  Users,
  XCircle,
} from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useEvents, useIpInvestigation, useUserInvestigation } from '../api/hooks'
import type { Alert, EntitySummary, LocationPoint, TimelinePoint } from '../api/types'
import { AlertsList } from '../components/alerts/AlertsList'
import { AttemptsTimelineChart, ChartLegend } from '../components/charts/AttemptsTimelineChart'
import { EventsTable } from '../components/events/EventsTable'
import { SearchBox } from '../components/layout/SearchBox'
import { Card } from '../components/ui/Card'
import { DataTable } from '../components/ui/DataTable'
import { KpiCard } from '../components/ui/KpiCard'
import { LtrText } from '../components/ui/LtrText'
import { Pagination } from '../components/ui/Pagination'
import { RatioBar } from '../components/ui/RatioBar'
import { RiskGauge } from '../components/ui/RiskGauge'
import { EmptyState, ErrorBanner, Skeleton, SkeletonRows } from '../components/ui/States'
import { useI18n } from '../i18n/context'
import { useRange } from '../lib/range'
import { pushRecent, readRecent } from '../lib/recent'
import { joinPlace } from '../lib/place'

const EVENTS_PAGE = 25

function EntityHeader({
  kind,
  value,
  summary,
  extra,
}: {
  kind: 'user' | 'ip'
  value: string
  summary: EntitySummary | undefined
  extra?: ReactNode
}) {
  const { t, fmtDateTime } = useI18n()
  const Icon = kind === 'user' ? User : Globe
  return (
    <div className="flex flex-wrap items-center gap-6 rounded-xl border border-line bg-surface p-5 shadow-sm">
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <span className="rounded-xl bg-primary-soft p-3 text-primary">
          <Icon className="size-7" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-medium tracking-wide text-muted uppercase">{t(kind === 'user' ? 'inv.user' : 'inv.ip')}</p>
          <h1 className="truncate text-2xl font-semibold text-ink">
            <LtrText>{value}</LtrText>
          </h1>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
            {summary?.first_seen && (
              <span>
                {t('inv.firstSeen')}: <span className="text-ink-2">{fmtDateTime(summary.first_seen)}</span>
              </span>
            )}
            {summary?.last_seen && (
              <span>
                {t('inv.lastSeen')}: <span className="text-ink-2">{fmtDateTime(summary.last_seen)}</span>
              </span>
            )}
          </div>
          {extra && <div className="mt-2 flex flex-wrap gap-2">{extra}</div>}
        </div>
      </div>
      {summary ? <RiskGauge score={summary.risk_score} /> : <Skeleton className="h-20 w-32" />}
    </div>
  )
}

function ActivityCard({ timeline, bucketMinutes }: { timeline?: TimelinePoint[]; bucketMinutes?: number }) {
  const { t } = useI18n()
  const { range } = useRange()
  return (
    <Card title={t('inv.activity', { range: t(`range.${range}.long`) })} icon={Activity} actions={<ChartLegend />}>
      {timeline && bucketMinutes ? (
        <AttemptsTimelineChart data={timeline} bucketMinutes={bucketMinutes} height={220} />
      ) : (
        <Skeleton className="h-[220px] w-full" />
      )}
    </Card>
  )
}

function RelatedAlerts({ alerts }: { alerts: Alert[] | undefined }) {
  const { t } = useI18n()
  return (
    <Card title={t('inv.relatedAlerts')} icon={Bell} bodyClassName="px-2 py-1">
      {!alerts ? (
        <div className="p-2">
          <SkeletonRows rows={3} />
        </div>
      ) : alerts.length ? (
        <AlertsList alerts={alerts} />
      ) : (
        <EmptyState title={t('state.noAlerts')} icon={ShieldCheck} compact />
      )}
    </Card>
  )
}

function EntityEvents({ filter }: { filter: { username?: string; ip?: string } }) {
  const { t } = useI18n()
  const [offset, setOffset] = useState(0)
  const { data, isLoading } = useEvents({ ...filter, limit: EVENTS_PAGE, offset }, offset === 0)
  return (
    <Card title={t('inv.events')} icon={ListTree}>
      <EventsTable events={data?.items} loading={isLoading} hide={filter.username ? ['user'] : ['ip']} />
      {data && <Pagination offset={offset} limit={EVENTS_PAGE} total={data.total} onChange={setOffset} />}
    </Card>
  )
}

function LocationsTimeline({ locations }: { locations: LocationPoint[] }) {
  const { t, fmtDateTime, fmtNumber } = useI18n()
  if (!locations.length) return <EmptyState title={t('inv.unknownLocation')} icon={MapPin} compact />
  return (
    <ol className="relative max-h-[420px] space-y-2 overflow-y-auto pe-1">
      {locations.map((l, i) => (
        <li
          key={`${l.timestamp}-${i}`}
          className={clsx(
            'rounded-lg border p-3',
            l.impossible_travel ? 'border-critical/50 bg-critical/10' : 'border-line bg-surface-2/50',
          )}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="flex items-center gap-2 text-sm font-medium text-ink">
              {l.success ? (
                <CircleCheck className="size-4 text-ok" aria-label={t('result.success')} />
              ) : (
                <XCircle className="size-4 text-critical" aria-label={t('result.failed')} />
              )}
              {joinPlace(l.city, l.country) || t('inv.unknownLocation')}
            </span>
            <time className="text-xs text-muted" dateTime={l.timestamp}>
              {fmtDateTime(l.timestamp)}
            </time>
          </div>
          <p className="mt-1 text-xs text-muted">
            <LtrText>{l.ip_address}</LtrText>
          </p>
          {l.impossible_travel && (
            <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-ink">
              <Plane className="size-3.5 text-critical" aria-hidden />
              {t('inv.impossibleHop', {
                distance: fmtNumber(Math.round(l.distance_km ?? 0)),
                speed: l.speed_kmh == null ? t('inv.instant') : t('inv.kmh', { speed: fmtNumber(Math.round(l.speed_kmh)) }),
              })}
            </p>
          )}
        </li>
      ))}
    </ol>
  )
}

function UserInvestigationView({ username }: { username: string }) {
  const { t, fmtNumber, fmtPercent } = useI18n()
  const { range } = useRange()
  const { data, isError, refetch } = useUserInvestigation(username, range)
  const s = data?.summary

  return (
    <div className="space-y-6">
      <EntityHeader
        kind="user"
        value={username}
        summary={s}
        extra={data?.countries.map((c) => (
          <span key={c} className="inline-flex items-center gap-1 rounded-full border border-line bg-surface-2 px-2 py-0.5 text-xs text-ink-2">
            <Flag className="size-3" aria-hidden />
            {c}
          </span>
        ))}
      />
      {isError && <ErrorBanner onRetry={() => refetch()} />}
      {s && s.attempts === 0 && <EmptyState title={t('inv.noActivity')} icon={Search} />}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label={t('inv.attempts')} icon={Activity} value={s ? fmtNumber(s.attempts) : null} />
        <KpiCard
          label={t('inv.failed')}
          icon={XCircle}
          value={s ? fmtNumber(s.failed) : null}
          hint={s && s.attempts > 0 && fmtPercent(s.failed / s.attempts)}
        />
        <KpiCard label={t('inv.distinctIps')} icon={Network} value={data ? fmtNumber(data.distinct_ips) : null} />
        <KpiCard label={t('inv.countries')} icon={Flag} value={data ? fmtNumber(data.countries.length) : null} />
      </div>

      <ActivityCard timeline={data?.timeline} bucketMinutes={data?.bucket_minutes} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <RelatedAlerts alerts={data?.alerts} />
        <Card title={t('inv.locations')} icon={MapPin}>
          {data ? <LocationsTimeline locations={data.locations} /> : <SkeletonRows rows={4} />}
        </Card>
      </div>

      <Card title={t('inv.ipsUsed')} icon={Network}>
        <DataTable
          rows={data?.ips}
          rowKey={(r) => r.ip_address}
          loading={!data}
          emptyText={t('state.noEvents')}
          columns={[
            {
              key: 'ip',
              header: t('col.ip'),
              render: (r) => (
                <Link to={`/investigate/ip/${encodeURIComponent(r.ip_address)}`} className="hover:text-primary hover:underline">
                  <LtrText>{r.ip_address}</LtrText>
                </Link>
              ),
            },
            { key: 'country', header: t('col.location'), render: (r) => <span className="text-ink-2">{r.country ?? '—'}</span> },
            { key: 'attempts', header: t('col.attempts'), className: 'tabular', render: (r) => fmtNumber(r.attempts) },
            { key: 'failed', header: t('col.failed'), className: 'tabular', render: (r) => fmtNumber(r.failed) },
            {
              key: 'rate',
              header: t('col.failureRate'),
                  render: (r) => (
                <div className="flex items-center gap-2">
                  <RatioBar ratio={r.failed / r.attempts} />
                  <span className="w-10 text-xs text-ink-2 tabular">{fmtPercent(r.failed / r.attempts, 0)}</span>
                </div>
              ),
            },
          ]}
        />
      </Card>

      <EntityEvents filter={{ username }} />
    </div>
  )
}

function IpInvestigationView({ ip }: { ip: string }) {
  const { t, fmtNumber, fmtPercent } = useI18n()
  const { range } = useRange()
  const { data, isError, refetch } = useIpInvestigation(ip, range)
  const s = data?.summary

  const extra = data && (
    <>
      <span
        className={clsx(
          'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium',
          data.blocklisted ? 'border-critical/50 bg-critical/10 text-ink' : 'border-line bg-surface-2 text-ink-2',
        )}
      >
        {data.blocklisted ? (
          <Ban className="size-3.5 text-critical" aria-hidden />
        ) : (
          <ShieldCheck className="size-3.5 text-ok" aria-hidden />
        )}
        {data.blocklisted ? (
          <>
            {t('inv.blocklisted')}: <LtrText>{data.blocklist_match}</LtrText>
          </>
        ) : (
          t('inv.notBlocklisted')
        )}
      </span>
      {(data.city || data.country) && (
        <span className="inline-flex items-center gap-1 rounded-full border border-line bg-surface-2 px-2.5 py-0.5 text-xs text-ink-2">
          <MapPin className="size-3.5" aria-hidden />
          {joinPlace(data.city, data.country)}
        </span>
      )}
    </>
  )

  return (
    <div className="space-y-6">
      <EntityHeader kind="ip" value={ip} summary={s} extra={extra} />
      {isError && <ErrorBanner onRetry={() => refetch()} />}
      {s && s.attempts === 0 && <EmptyState title={t('inv.noActivity')} icon={Search} />}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label={t('inv.attempts')} icon={Activity} value={s ? fmtNumber(s.attempts) : null} />
        <KpiCard
          label={t('inv.failed')}
          icon={XCircle}
          value={s ? fmtNumber(s.failed) : null}
          hint={s && s.attempts > 0 && fmtPercent(s.failed / s.attempts)}
        />
        <KpiCard label={t('inv.distinctUsers')} icon={Users} value={data ? fmtNumber(data.distinct_users) : null} />
        <KpiCard label={t('kpi.openAlerts')} icon={Bell} value={s ? fmtNumber(s.open_alerts) : null} />
      </div>

      <ActivityCard timeline={data?.timeline} bucketMinutes={data?.bucket_minutes} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <RelatedAlerts alerts={data?.alerts} />
        <Card title={t('inv.usernames')} icon={Users}>
          <DataTable
            rows={data?.usernames}
            rowKey={(r) => r.username}
            loading={!data}
            emptyText={t('state.noEvents')}
            columns={[
              {
                key: 'user',
                header: t('col.user'),
                render: (r) => (
                  <Link to={`/investigate/user/${encodeURIComponent(r.username)}`} className="hover:text-primary hover:underline">
                    <LtrText>{r.username}</LtrText>
                  </Link>
                ),
              },
              { key: 'attempts', header: t('col.attempts'), className: 'tabular', render: (r) => fmtNumber(r.attempts) },
              { key: 'failed', header: t('col.failed'), className: 'tabular', render: (r) => fmtNumber(r.failed) },
              {
                key: 'ok',
                header: t('result.success'),
                className: 'tabular',
                render: (r) =>
                  r.successful > 0 ? (
                    <span className="inline-flex items-center gap-1 font-medium text-bad-text">
                      <CircleCheck className="size-3.5" aria-hidden />
                      {fmtNumber(r.successful)}
                    </span>
                  ) : (
                    <span className="text-muted">0</span>
                  ),
              },
            ]}
          />
        </Card>
      </div>

      <EntityEvents filter={{ ip }} />
    </div>
  )
}

function InvestigationLanding() {
  const { t } = useI18n()
  const recent = readRecent()
  return (
    <div className="mx-auto max-w-2xl pt-6">
      <EmptyState icon={Search} title={t('inv.emptyTitle')} hint={t('inv.emptyHint')} />
      <SearchBox autoFocus large />
      {recent.length > 0 && (
        <div className="mt-8">
          <p className="mb-2 text-sm font-medium text-ink-2">{t('inv.recent')}</p>
          <div className="flex flex-wrap gap-2">
            {recent.map((r) => {
              const Icon = r.kind === 'user' ? User : Globe
              return (
                <Link
                  key={`${r.kind}:${r.value}`}
                  to={`/investigate/${r.kind}/${encodeURIComponent(r.value)}`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-sm text-ink hover:border-primary"
                >
                  <Icon className="size-4 text-primary" aria-hidden />
                  <LtrText>{r.value}</LtrText>
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export function InvestigationPage({ kind }: { kind?: 'user' | 'ip' }) {
  const { value } = useParams()
  useEffect(() => {
    if (kind && value) pushRecent({ kind, value })
  }, [kind, value])

  if (!kind || !value) return <InvestigationLanding />
  // key: reset local state (pagination) when switching entities
  return kind === 'user' ? (
    <UserInvestigationView key={value} username={value} />
  ) : (
    <IpInvestigationView key={value} ip={value} />
  )
}
