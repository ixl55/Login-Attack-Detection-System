import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'

/** The open alert lives in the URL (?alert=ID) so any page can open it and links are shareable. */
export function useAlertParam() {
  const [params, setParams] = useSearchParams()
  const raw = params.get('alert')
  const alertId = raw && /^\d+$/.test(raw) ? Number(raw) : null

  const openAlert = useCallback(
    (id: number) =>
      setParams((p) => {
        const next = new URLSearchParams(p)
        next.set('alert', String(id))
        return next
      }),
    [setParams],
  )
  const closeAlert = useCallback(
    () =>
      setParams((p) => {
        const next = new URLSearchParams(p)
        next.delete('alert')
        return next
      }),
    [setParams],
  )
  return { alertId, openAlert, closeAlert }
}
