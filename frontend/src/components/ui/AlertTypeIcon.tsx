import { Hammer, MapPinned, ShieldAlert, Users, type LucideIcon } from 'lucide-react'
import type { AlertType } from '../../api/types'

// eslint-disable-next-line react-refresh/only-export-components
export const ALERT_TYPE_ICON: Record<AlertType, LucideIcon> = {
  brute_force: Hammer,
  password_spraying: Users,
  impossible_travel: MapPinned,
  suspicious_ip: ShieldAlert,
}

export function AlertTypeIcon({ type, className }: { type: AlertType; className?: string }) {
  const Icon = ALERT_TYPE_ICON[type]
  return <Icon className={className} aria-hidden />
}
