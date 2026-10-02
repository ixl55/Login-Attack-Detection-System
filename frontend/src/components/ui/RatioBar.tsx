/** Thin horizontal bar for a 0–1 ratio; grows from the inline-start edge. */
export function RatioBar({ ratio, color = 'var(--series-failed)' }: { ratio: number; color?: string }) {
  return (
    <div className="h-1.5 w-20 shrink-0 overflow-hidden rounded-full bg-surface-2" aria-hidden>
      <div className="h-full rounded-full" style={{ width: `${ratio > 0 ? Math.max(2, Math.min(100, ratio * 100)) : 0}%`, background: color }} />
    </div>
  )
}
