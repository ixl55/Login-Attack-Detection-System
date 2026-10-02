import { Activity, Bell, Crosshair, Globe, PieChart, Siren, Target, TrendingDown } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAlerts, useStats } from '../api/hooks'
import type { AlertType, TopIp, TopUser } from '../api/types'
import { AlertsList } from '../components/alerts/AlertsList'
import { AlertsByType } from '../components/charts/AlertsByType'
import { AttemptsTimelineChart, ChartLegend } from '../components/charts/AttemptsTimelineChart'
import { SegmentedControl } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { DataTable } from '../components/ui/DataTable'
import { KpiCard } from '../components/ui/KpiCard'
import { LtrText } from '../components/ui/LtrText'
import { RatioBar } from '../components/ui/RatioBar'
import { EmptyState, ErrorBanner, Skeleton, SkeletonRows } from '../components/ui/States'
import { useI18n } from '../i18n/context'
import { useRange } from '../lib/range'

function change(current: number, previous: number): number | null {
  return previous > 0 ? (current - previous) / previous : null
}

function RecentAlerts({ type, onClearType }: { type: AlertType | null; onClearType: () => void }) {
  const { t, fmtNumber } = useI18n()
  const [status, setStatus] = useState<'open' | 'all'>('open')
  const { data, isLoading } = useAlerts({ status: status === 'open' ? 'open' : undefined, type: type ?? undefined, limit: 15 })

  return (
    <Card
      title={
        <>
          {t('overview.recentAlerts')}
          {data && <span className="font-normal text-muted tabular">({fmtNumber(data.total)})</span>}
        </>
      }
      icon={Bell}
      bodyClassName="px-2 py-1"
      actions={
        <>
          {type && (
            <button
              onClick={onClearType}
              className="rounded-full border border-primary/50 bg-primary-soft px-2.5 py-0.5 text-xs text-primary"
            >
              {t('overview.showingType', { type: t(`alertType.${type}`) })} ✕
            </button>
          )}
          <SegmentedControl
            label={t('overview.recentAlerts')}
            value={status}
            onChange={setStatus}
            options={[
              { value: 'open', label: t('status.open') },
              { value: 'all', label: t('status.all') },
            ]}
          />
        </>
      }
    >
      {isLoading && !data ? (
        <div className="p-2">
          <SkeletonRows rows={6} />
        </div>
      ) : data?.items.length ? (
        <AlertsList alerts={data.items} />
      ) : (
        <EmptyState title={t('state.noAlerts')} icon={Bell} compact />
      )}
    </Card>
  )
}

function TopIpsTable({ rows }: { rows: TopIp[] | undefined }) {
  const { t, fmtNumber, fmtPercent } = useI18n()
  return (
    <DataTable
      rows={rows}
      rowKey={(r) => r.ip_address}
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
        { key: 'failed', header: t('col.failed'), className: 'tabular', render: (r) => fmtNumber(r.failed) },
        {
          key: 'rate',
          header: t('col.failureRate'),
          render: (r) => (
            <div className="flex items-center gap-2">
              <RatioBar ratio={r.failure_rate} />
              <span className="w-10 text-xs text-ink-2 tabular">{fmtPercent(r.failure_rate, 0)}</span>
            </div>
          ),
        },
        { key: 'users', header: t('col.users'), className: 'tabular', render: (r) => fmtNumber(r.distinct_users) },
      ]}
    />
  )
}

function TopUsersTable({ rows }: { rows: TopUser[] | undefined }) {
  const { t, fmtNumber, fmtPercent } = useI18n()
  return (
    <DataTable
      rows={rows}
      rowKey={(r) => r.username}
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
        { key: 'failed', header: t('col.failed'), className: 'tabular', render: (r) => fmtNumber(r.failed) },
        {
          key: 'rate',
          header: t('col.failureRate'),
          render: (r) => (
            <div className="flex items-center gap-2">
              <RatioBar ratio={r.failure_rate} />
              <span className="w-10 text-xs text-ink-2 tabular">{fmtPercent(r.failure_rate, 0)}</span>
            </div>
          ),
        },
        { key: 'ips', header: t('col.ips'), className: 'tabular', render: (r) => fmtNumber(r.distinct_ips) },
      ]}
    />
  )
}

export function OverviewPage() {
  const { t, fmtNumber, fmtPercent } = useI18n()
  const { range } = useRange()
  const { data: stats, isError, refetch } = useStats(range)
  const [typeFilter, setTypeFilter] = useState<AlertType | null>(null)

  const cur = stats?.totals
  const prev = stats?.previous
  const noData = stats && stats.totals.attempts === 0 && stats.open_alerts === 0

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold text-ink">{t('nav.overview')}</h1>
          <p className="text-sm text-muted">{t(`range.${range}.long`)}</p>
        </div>
      </div>

      {isError && <ErrorBanner onRetry={() => refetch()} />}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label={t('kpi.attempts')}
          icon={Activity}
          value={cur ? fmtNumber(cur.attempts) : null}
          delta={cur && prev ? change(cur.attempts, prev.attempts) : null}
          hint={cur && t('kpi.failedOf', { failed: fmtNumber(cur.failed) })}
        />
        <KpiCard
          label={t('kpi.failureRate')}
          icon={TrendingDown}
          value={cur ? fmtPercent(cur.failure_rate) : null}
          delta={cur && prev ? change(cur.failure_rate, prev.failure_rate) : null}
        />
        <KpiCard
          label={t('kpi.openAlerts')}
          icon={Siren}
          value={stats ? fmtNumber(stats.open_alerts) : null}
          hint={cur && t('kpi.newInRange', { count: fmtNumber(cur.new_alerts) })}
        />
        <KpiCard
          label={t('kpi.criticalAlerts')}
          icon={Crosshair}
          value={stats ? fmtNumber(stats.critical_open_alerts) : null}
          accent={stats && stats.critical_open_alerts > 0 ? 'critical' : 'default'}
          hint={stats && stats.critical_open_alerts > 0 ? t('kpi.needsAction') : undefined}
        />
      </div>

      {noData && <EmptyState title={t('state.empty')} hint={t('state.emptyHint')} />}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card title={t('overview.timeline')} icon={Activity} className="lg:col-span-2" actions={<ChartLegend />}>
          {stats ? (
            <AttemptsTimelineChart data={stats.timeline} bucketMinutes={stats.bucket_minutes} />
          ) : (
            <Skeleton className="h-[260px] w-full" />
          )}
        </Card>
        <Card title={t('overview.byType')} icon={PieChart} bodyClassName="p-2">
          {stats ? (
            <AlertsByType data={stats.alerts_by_type} selected={typeFilter} onSelect={setTypeFilter} />
          ) : (
            <SkeletonRows rows={4} />
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <RecentAlerts type={typeFilter} onClearType={() => setTypeFilter(null)} />
        </div>
        <div className="space-y-4 lg:col-span-2">
          <Card title={t('overview.topIps')} icon={Globe}>
            <TopIpsTable rows={stats?.top_ips} />
          </Card>
          <Card title={t('overview.topUsers')} icon={Target}>
            <TopUsersTable rows={stats?.top_users} />
          </Card>
        </div>
      </div>
    </div>
  )
}
