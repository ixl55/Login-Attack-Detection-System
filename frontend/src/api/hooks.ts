import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from './client'
import type {
  Alert,
  AlertFilters,
  AlertStatus,
  EventFilters,
  IpInvestigation,
  LoginEvent,
  Page,
  Stats,
  StatsRange,
  UserInvestigation,
} from './types'

export const LIVE_INTERVAL_MS = 5_000

export function useStats(range: StatsRange) {
  return useQuery({
    queryKey: ['stats', range],
    queryFn: () => apiFetch<Stats>('/api/stats', { params: { range } }),
    refetchInterval: LIVE_INTERVAL_MS,
    placeholderData: keepPreviousData,
  })
}

export function useAlerts(filters: AlertFilters) {
  return useQuery({
    queryKey: ['alerts', filters],
    queryFn: () => apiFetch<Page<Alert>>('/api/alerts', { params: { ...filters } }),
    refetchInterval: LIVE_INTERVAL_MS,
    placeholderData: keepPreviousData,
  })
}

export function useAlert(id: number | null) {
  return useQuery({
    queryKey: ['alerts', 'detail', id],
    queryFn: () => apiFetch<Alert>(`/api/alerts/${id}`),
    enabled: id !== null,
    refetchInterval: LIVE_INTERVAL_MS,
  })
}

export function useEvents(filters: EventFilters, live: boolean) {
  return useQuery({
    queryKey: ['events', filters],
    queryFn: () => apiFetch<Page<LoginEvent>>('/api/events', { params: { ...filters } }),
    refetchInterval: live ? LIVE_INTERVAL_MS : false,
    placeholderData: keepPreviousData,
  })
}

export function useUserInvestigation(username: string | undefined, range: StatsRange) {
  return useQuery({
    queryKey: ['investigate', 'user', username, range],
    queryFn: () => apiFetch<UserInvestigation>(`/api/investigate/user/${encodeURIComponent(username!)}`, { params: { range } }),
    enabled: !!username,
    refetchInterval: LIVE_INTERVAL_MS * 2,
  })
}

export function useIpInvestigation(ip: string | undefined, range: StatsRange) {
  return useQuery({
    queryKey: ['investigate', 'ip', ip, range],
    queryFn: () => apiFetch<IpInvestigation>(`/api/investigate/ip/${encodeURIComponent(ip!)}`, { params: { range } }),
    enabled: !!ip,
    refetchInterval: LIVE_INTERVAL_MS * 2,
  })
}

export function useUpdateAlertStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: AlertStatus }) =>
      apiFetch<Alert>(`/api/alerts/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
    onSuccess: (alert) => {
      qc.setQueryData(['alerts', 'detail', alert.id], alert)
      qc.invalidateQueries({ queryKey: ['alerts'] })
      qc.invalidateQueries({ queryKey: ['stats'] })
      qc.invalidateQueries({ queryKey: ['investigate'] })
    },
  })
}
