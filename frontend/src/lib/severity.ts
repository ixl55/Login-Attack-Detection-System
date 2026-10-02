import type { Severity } from '../api/types'

/** Background utility per severity (dots, stripes). Always shown next to a label. */
export const SEVERITY_BG: Record<Severity, string> = {
  critical: 'bg-critical',
  high: 'bg-high',
  medium: 'bg-medium',
  low: 'bg-low',
}
