import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipProps } from 'recharts'
import type { TimelinePoint } from '../../api/types'
import { useI18n } from '../../i18n/context'

const SERIES = [
  { key: 'failed', color: 'var(--series-failed)', label: 'series.failed' },
  { key: 'success', color: 'var(--series-success)', label: 'series.success' },
] as const

function ChartTooltip({ active, payload, label, bucketMinutes }: TooltipProps<number, string> & { bucketMinutes: number }) {
  const { t, fmtNumber, fmtDateTime } = useI18n()
  if (!active || !payload?.length) return null
  const point = payload[0].payload as TimelinePoint
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-lg" dir="auto">
      <p className="mb-1 font-medium text-ink">
        {fmtDateTime(label as string)}
        {bucketMinutes > 1 && <span className="text-muted"> · {bucketMinutes}m</span>}
      </p>
      {SERIES.map((s) => (
        <p key={s.key} className="flex items-center justify-between gap-4 text-ink-2">
          <span className="flex items-center gap-1.5">
            <span className="h-0.5 w-3 rounded" style={{ background: s.color }} aria-hidden />
            {t(s.label)}
          </span>
          <span className="font-medium text-ink tabular">{fmtNumber(point[s.key])}</span>
        </p>
      ))}
    </div>
  )
}

export function ChartLegend() {
  const { t } = useI18n()
  return (
    <div className="flex items-center gap-4 text-xs text-ink-2">
      {SERIES.map((s) => (
        <span key={s.key} className="flex items-center gap-1.5">
          <span className="h-0.5 w-3.5 rounded" style={{ background: s.color }} aria-hidden />
          {t(s.label)}
        </span>
      ))}
    </div>
  )
}

export function AttemptsTimelineChart({
  data,
  bucketMinutes,
  height = 260,
}: {
  data: TimelinePoint[]
  bucketMinutes: number
  height?: number
}) {
  const { fmtAxisTime, fmtNumber } = useI18n()
  return (
    // Time always runs left→right, also in Arabic (keeps the axis consistent with clocks and logs).
    <div dir="ltr" style={{ height }} className="tabular">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
          <defs>
            {SERIES.map((s) => (
              <linearGradient key={s.key} id={`fill-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={s.color} stopOpacity={0.14} />
                <stop offset="100%" stopColor={s.color} stopOpacity={0.04} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid vertical={false} stroke="var(--grid)" strokeWidth={1} />
          <XAxis
            dataKey="bucket"
            tickFormatter={(v) => fmtAxisTime(v, bucketMinutes)}
            tick={{ fill: 'var(--muted)', fontSize: 11 }}
            axisLine={{ stroke: 'var(--border)' }}
            tickLine={false}
            minTickGap={28}
          />
          <YAxis
            allowDecimals={false}
            tickFormatter={(v) => fmtNumber(v)}
            tick={{ fill: 'var(--muted)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={44}
          />
          <Tooltip
            content={<ChartTooltip bucketMinutes={bucketMinutes} />}
            cursor={{ stroke: 'var(--muted)', strokeWidth: 1 }}
          />
          {SERIES.map((s) => (
            <Area
              key={s.key}
              type="monotone"
              dataKey={s.key}
              stroke={s.color}
              strokeWidth={2}
              fill={`url(#fill-${s.key})`}
              activeDot={{ r: 4, stroke: 'var(--surface)', strokeWidth: 2, fill: s.color }}
              dot={false}
              isAnimationActive={false}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
