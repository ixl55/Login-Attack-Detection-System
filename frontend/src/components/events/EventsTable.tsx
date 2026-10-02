import { Link } from 'react-router-dom'
import type { LoginEvent } from '../../api/types'
import { useI18n } from '../../i18n/context'
import { ResultBadge } from '../ui/Badges'
import { DataTable, type Column } from '../ui/DataTable'
import { LtrText } from '../ui/LtrText'
import { joinPlace } from '../../lib/place'

export function EventsTable({
  events,
  loading,
  hide = [],
}: {
  events: LoginEvent[] | undefined
  loading?: boolean
  hide?: ('user' | 'ip')[]
}) {
  const { t, fmtDateTime } = useI18n()
  const allColumns: Column<LoginEvent>[] = [
    {
      key: 'time',
      header: t('col.time'),
      render: (e) => (
        <time dateTime={e.timestamp} className="text-ink-2 tabular">
          {fmtDateTime(e.timestamp)}
        </time>
      ),
    },
    {
      key: 'user',
      header: t('col.user'),
      render: (e) => (
        <Link to={`/investigate/user/${encodeURIComponent(e.username)}`} className="hover:text-primary hover:underline">
          <LtrText>{e.username}</LtrText>
        </Link>
      ),
    },
    {
      key: 'ip',
      header: t('col.ip'),
      render: (e) => (
        <Link to={`/investigate/ip/${encodeURIComponent(e.ip_address)}`} className="hover:text-primary hover:underline">
          <LtrText>{e.ip_address}</LtrText>
        </Link>
      ),
    },
    {
      key: 'location',
      header: t('col.location'),
      render: (e) => <span className="text-ink-2">{joinPlace(e.city, e.country) || '—'}</span>,
    },
    { key: 'result', header: t('col.result'), render: (e) => <ResultBadge success={e.success} /> },
    { key: 'app', header: t('col.app'), render: (e) => <span className="text-ink-2">{e.source_app ?? '—'}</span> },
    {
      key: 'agent',
      header: t('col.agent'),
      render: (e) =>
        e.user_agent ? (
          <span title={e.user_agent} dir="ltr" className="inline-block max-w-56 truncate align-middle text-ink-2">
            {e.user_agent}
          </span>
        ) : (
          '—'
        ),
    },
  ]
  const columns = allColumns.filter((c) => !hide.includes(c.key as 'user' | 'ip'))

  return (
    <DataTable
      columns={columns}
      rows={events}
      rowKey={(e) => e.id}
      loading={loading}
      emptyText={t('state.noEvents')}
    />
  )
}
