import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useI18n } from '../../i18n/context'
import { Button } from './Button'

export function Pagination({
  offset,
  limit,
  total,
  onChange,
}: {
  offset: number
  limit: number
  total: number
  onChange: (offset: number) => void
}) {
  const { t, fmtNumber, dir } = useI18n()
  if (total <= limit && offset === 0) return null
  // Chevrons point in the reading direction.
  const Prev = dir === 'rtl' ? ChevronRight : ChevronLeft
  const Next = dir === 'rtl' ? ChevronLeft : ChevronRight
  return (
    <div className="flex items-center justify-between gap-3 pt-3 text-sm text-muted">
      <span className="tabular">
        {t('page.range', {
          from: fmtNumber(total ? offset + 1 : 0),
          to: fmtNumber(Math.min(offset + limit, total)),
          total: fmtNumber(total),
        })}
      </span>
      <div className="flex gap-2">
        <Button size="sm" disabled={offset === 0} onClick={() => onChange(Math.max(0, offset - limit))}>
          <Prev className="size-4" aria-hidden />
          {t('page.prev')}
        </Button>
        <Button size="sm" disabled={offset + limit >= total} onClick={() => onChange(offset + limit)}>
          {t('page.next')}
          <Next className="size-4" aria-hidden />
        </Button>
      </div>
    </div>
  )
}
