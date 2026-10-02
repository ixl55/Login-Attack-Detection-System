import { Filter, ListTree, PauseCircle, X } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useEvents } from '../api/hooks'
import { EventsTable } from '../components/events/EventsTable'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Pagination } from '../components/ui/Pagination'
import { ErrorBanner } from '../components/ui/States'
import { useI18n } from '../i18n/context'

const PAGE_SIZE = 50

// <input type="datetime-local"> works in local time; the API expects UTC.
function localToIso(value: string): string | undefined {
  return value ? new Date(value).toISOString() : undefined
}

const inputClass =
  'w-full rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-primary focus:outline-none'

export function EventsPage() {
  const { t, fmtNumber } = useI18n()
  const [params, setParams] = useSearchParams()

  // Filters live in the URL so a filtered view can be shared or bookmarked.
  const applied = {
    username: params.get('username') ?? '',
    ip: params.get('ip') ?? '',
    result: params.get('result') ?? '',
    from: params.get('from') ?? '',
    to: params.get('to') ?? '',
  }
  const offset = Number(params.get('offset') ?? 0) || 0
  const [draft, setDraft] = useState(applied)
  const appliedKey = JSON.stringify(applied)
  useEffect(() => setDraft(JSON.parse(appliedKey)), [appliedKey])

  const live = offset === 0
  const { data, isLoading, isError, refetch } = useEvents(
    {
      username: applied.username || undefined,
      ip: applied.ip || undefined,
      success: applied.result === '' ? undefined : applied.result === 'success',
      from: localToIso(applied.from),
      to: localToIso(applied.to),
      limit: PAGE_SIZE,
      offset,
    },
    live,
  )

  const update = (next: Record<string, string>) =>
    setParams((p) => {
      const out = new URLSearchParams(p)
      for (const [k, v] of Object.entries(next)) {
        if (v) out.set(k, v)
        else out.delete(k)
      }
      return out
    })

  const submit = (e: FormEvent) => {
    e.preventDefault()
    update({ ...draft, offset: '' })
  }
  const clear = () => update({ username: '', ip: '', result: '', from: '', to: '', offset: '' })
  const hasFilters = Object.values(applied).some(Boolean)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">{t('nav.events')}</h1>
        {data && <p className="text-sm text-muted tabular">{t('events.total', { count: fmtNumber(data.total) })}</p>}
      </div>

      <Card title={t('events.filters')} icon={Filter}>
        <form onSubmit={submit} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <input
            className={inputClass}
            placeholder={t('col.user')}
            aria-label={t('col.user')}
            dir="auto"
            value={draft.username}
            onChange={(e) => setDraft({ ...draft, username: e.target.value })}
          />
          <input
            className={inputClass}
            placeholder={t('col.ip')}
            aria-label={t('col.ip')}
            dir="ltr"
            value={draft.ip}
            onChange={(e) => setDraft({ ...draft, ip: e.target.value })}
          />
          <select
            className={inputClass}
            aria-label={t('col.result')}
            value={draft.result}
            onChange={(e) => setDraft({ ...draft, result: e.target.value })}
          >
            <option value="">{t('events.result.all')}</option>
            <option value="success">{t('result.success')}</option>
            <option value="failed">{t('result.failed')}</option>
          </select>
          <label className="flex flex-col gap-1 text-xs text-muted">
            {t('events.from')}
            <input
              type="datetime-local"
              className={inputClass}
              value={draft.from}
              onChange={(e) => setDraft({ ...draft, from: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted">
            {t('events.to')}
            <input
              type="datetime-local"
              className={inputClass}
              value={draft.to}
              onChange={(e) => setDraft({ ...draft, to: e.target.value })}
            />
          </label>
          <div className="flex items-end gap-2">
            <Button type="submit" variant="primary" className="flex-1">
              {t('action.apply')}
            </Button>
            {hasFilters && (
              <Button type="button" onClick={clear} aria-label={t('action.clear')}>
                <X className="size-4" aria-hidden />
                {t('action.clear')}
              </Button>
            )}
          </div>
        </form>
      </Card>

      {isError && <ErrorBanner onRetry={() => refetch()} />}

      <Card
        title={t('nav.events')}
        icon={ListTree}
        actions={
          !live && (
            <span className="flex items-center gap-1.5 text-xs text-muted">
              <PauseCircle className="size-4" aria-hidden />
              {t('events.pausedLive')}
            </span>
          )
        }
      >
        <EventsTable events={data?.items} loading={isLoading} />
        {data && (
          <Pagination
            offset={offset}
            limit={PAGE_SIZE}
            total={data.total}
            onChange={(o) => update({ offset: o ? String(o) : '' })}
          />
        )}
      </Card>
    </div>
  )
}
