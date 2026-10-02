import clsx from 'clsx'
import type { AlertType } from '../../api/types'
import { useI18n } from '../../i18n/context'
import { AlertTypeIcon } from '../ui/AlertTypeIcon'

/** Labelled horizontal bars (one hue): each row doubles as a filter toggle for the alerts feed. */
export function AlertsByType({
  data,
  selected,
  onSelect,
}: {
  data: { type: AlertType; count: number }[]
  selected: AlertType | null
  onSelect: (type: AlertType | null) => void
}) {
  const { t, fmtNumber } = useI18n()
  const max = Math.max(1, ...data.map((d) => d.count))
  return (
    <ul className="space-y-1">
      {data.map((d) => {
        const active = selected === d.type
        return (
          <li key={d.type}>
            <button
              onClick={() => onSelect(active ? null : d.type)}
              aria-pressed={active}
              className={clsx(
                'group w-full rounded-lg px-2 py-2 text-start transition',
                active ? 'bg-primary-soft' : 'hover:bg-surface-2',
              )}
            >
              <span className="flex items-center justify-between gap-2 text-sm">
                <span className="flex items-center gap-2 text-ink">
                  <AlertTypeIcon type={d.type} className="size-4 text-muted" />
                  {t(`alertType.${d.type}`)}
                </span>
                <span className="font-semibold text-ink tabular">{fmtNumber(d.count)}</span>
              </span>
              <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-surface-2">
                <span
                  className="block h-full rounded-full bg-success-series transition-[width]"
                  style={{ width: `${d.count ? Math.max(3, (d.count / max) * 100) : 0}%` }}
                />
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
