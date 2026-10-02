import clsx from 'clsx'
import type { MessageKey } from '../../i18n/en'
import { useI18n } from '../../i18n/context'

function level(score: number): { key: MessageKey; color: string } {
  if (score >= 80) return { key: 'inv.risk.critical', color: 'var(--sev-critical)' }
  if (score >= 50) return { key: 'inv.risk.high', color: 'var(--sev-high)' }
  if (score >= 25) return { key: 'inv.risk.medium', color: 'var(--sev-medium)' }
  return { key: 'inv.risk.low', color: 'var(--ok)' }
}

/** Half-ring gauge, 0–100. */
export function RiskGauge({ score, className }: { score: number; className?: string }) {
  const { t } = useI18n()
  const { key, color } = level(score)
  const r = 40
  const arc = Math.PI * r
  return (
    <div className={clsx('flex flex-col items-center', className)} role="meter" aria-valuemin={0}
      aria-valuemax={100} aria-valuenow={score} aria-label={t('inv.risk')}>
      <svg viewBox="0 0 100 58" className="w-32" aria-hidden>
        <path d="M10 50 A40 40 0 0 1 90 50" fill="none" stroke="var(--border)" strokeWidth="9" strokeLinecap="round" />
        <path
          d="M10 50 A40 40 0 0 1 90 50"
          fill="none"
          stroke={color}
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={`${(arc * score) / 100} ${arc}`}
        />
        <text x="50" y="48" textAnchor="middle" fontSize="20" fontWeight="600" fill="var(--text)" className="tabular">
          {score}
        </text>
      </svg>
      <span className="mt-0.5 inline-flex items-center gap-1.5 text-xs text-ink-2">
        <span className="size-2 rounded-full" style={{ background: color }} aria-hidden />
        {t('inv.risk')}: {t(key)}
      </span>
    </div>
  )
}
