import clsx from 'clsx'
import { X } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'
import { useI18n } from '../../i18n/context'

/** Side panel that slides in from the inline-end edge (left in Arabic, right in English). */
export function Drawer({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean
  onClose: () => void
  title: ReactNode
  children: ReactNode
}) {
  const { t } = useI18n()
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const previous = document.activeElement as HTMLElement | null
    panelRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
      previous?.focus()
    }
  }, [open, onClose])

  return (
    <div className={clsx('fixed inset-0 z-50', !open && 'pointer-events-none')} aria-hidden={!open}>
      <div
        className={clsx('absolute inset-0 bg-black/50 transition-opacity', open ? 'opacity-100' : 'opacity-0')}
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        className={clsx(
          'absolute inset-y-0 end-0 flex w-full max-w-xl flex-col border-s border-line bg-surface shadow-2xl transition-transform duration-200 outline-none',
          open ? 'translate-x-0' : 'ltr:translate-x-full rtl:-translate-x-full',
        )}
      >
        <header className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
          <h2 className="text-base font-semibold text-ink">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted hover:bg-surface-2 hover:text-ink"
            aria-label={t('action.close')}
          >
            <X className="size-5" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-4">{open && children}</div>
      </div>
    </div>
  )
}
