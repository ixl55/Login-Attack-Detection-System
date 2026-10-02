// Mirrors app/schemas.py. All timestamps are ISO-8601 UTC strings ending in "Z".

export type StatsRange = '1h' | '24h' | '7d'
export type AlertType = 'brute_force' | 'password_spraying' | 'impossible_travel' | 'suspicious_ip'
export type Severity = 'low' | 'medium' | 'high' | 'critical'
export type AlertStatus = 'open' | 'acknowledged' | 'resolved'

export const ALERT_TYPES: AlertType[] = ['brute_force', 'password_spraying', 'impossible_travel', 'suspicious_ip']
export const SEVERITIES: Severity[] = ['critical', 'high', 'medium', 'low']

export interface Page<T> {
  items: T[]
  total: number
}

export interface LoginEvent {
  id: number
  timestamp: string
  username: string
  ip_address: string
  success: boolean
  user_agent: string | null
  source_app: string | null
  country: string | null
  city: string | null
  latitude: number | null
  longitude: number | null
}

export interface TravelPlace {
  ip_address: string
  country: string | null
  city: string | null
  latitude: number
  longitude: number
  timestamp: string
}

// Detector-specific payloads (see app/detection/*). All fields optional: the shape depends on `type`.
export interface AlertDetails {
  scope?: 'account' | 'ip'
  failed_attempts?: number
  window_minutes?: number
  source_ips?: number
  last_ip?: string
  possible_compromise?: boolean
  targeted_users?: number
  distinct_users?: number
  attempts?: number
  failure_ratio?: number
  usernames?: string[]
  compromised_users?: string[]
  from?: TravelPlace
  to?: TravelPlace
  distance_km?: number
  elapsed_minutes?: number
  speed_kmh?: number | null
  max_speed_kmh?: number
  matched_range?: string
  successful_users?: string[]
}

export interface Alert {
  id: number
  type: AlertType
  severity: Severity
  username: string | null
  ip_address: string | null
  description: string
  details: AlertDetails
  event_count: number
  first_seen: string
  last_seen: string
  status: AlertStatus
  created_at: string
  updated_at: string
}

export interface TimelinePoint {
  bucket: string
  success: number
  failed: number
}

export interface Totals {
  attempts: number
  successful: number
  failed: number
  failure_rate: number
  new_alerts: number
}

export interface TopIp {
  ip_address: string
  attempts: number
  failed: number
  failure_rate: number
  distinct_users: number
}

export interface TopUser {
  username: string
  attempts: number
  failed: number
  failure_rate: number
  distinct_ips: number
}

export interface Stats {
  range: StatsRange
  generated_at: string
  bucket_minutes: number
  totals: Totals
  previous: Totals
  open_alerts: number
  critical_open_alerts: number
  timeline: TimelinePoint[]
  alerts_by_type: { type: AlertType; count: number }[]
  alerts_by_severity: { severity: Severity; count: number }[]
  top_ips: TopIp[]
  top_users: TopUser[]
}

export interface EntitySummary {
  attempts: number
  successful: number
  failed: number
  first_seen: string | null
  last_seen: string | null
  risk_score: number
  open_alerts: number
}

export interface LocationPoint {
  timestamp: string
  ip_address: string
  country: string | null
  city: string | null
  latitude: number | null
  longitude: number | null
  success: boolean
  impossible_travel: boolean
  distance_km: number | null
  speed_kmh: number | null
}

export interface UserInvestigation {
  username: string
  summary: EntitySummary
  distinct_ips: number
  countries: string[]
  timeline: TimelinePoint[]
  bucket_minutes: number
  locations: LocationPoint[]
  ips: { ip_address: string; attempts: number; failed: number; successful: number; country: string | null }[]
  alerts: Alert[]
}

export interface IpInvestigation {
  ip_address: string
  summary: EntitySummary
  distinct_users: number
  country: string | null
  city: string | null
  blocklisted: boolean
  blocklist_match: string | null
  timeline: TimelinePoint[]
  bucket_minutes: number
  usernames: { username: string; attempts: number; failed: number; successful: number }[]
  alerts: Alert[]
}

export interface EventFilters {
  username?: string
  ip?: string
  success?: boolean
  from?: string
  to?: string
  limit?: number
  offset?: number
}

export interface AlertFilters {
  type?: AlertType
  severity?: Severity
  status?: AlertStatus
  username?: string
  ip?: string
  limit?: number
  offset?: number
}
