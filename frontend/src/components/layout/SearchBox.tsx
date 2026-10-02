import { Globe, Search, User } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useI18n } from '../../i18n/context'
import { investigatePath, isIpAddress } from '../../lib/ip'

/** Detects whether the query is an IP or a username and opens the matching investigation. */
export function SearchBox({ autoFocus, large }: { autoFocus?: boolean; large?: boolean }) {
  const { t, dir } = useI18n()
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const kind = q.trim() ? (isIpAddress(q) ? 'ip' : 'user') : null
  const KindIcon = kind === 'ip' ? Globe : kind === 'user' ? User : Search

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!q.trim()) return
    navigate(investigatePath(q))
    setQ('')
  }

  return (
    <form onSubmit={submit} role="search" className="relative w-full">
      <KindIcon
        className={`pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 ${kind ? 'text-primary' : 'text-muted'}`}
        aria-hidden
      />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        autoFocus={autoFocus}
        placeholder={t('top.search')}
        aria-label={t('top.search')}
        dir={q ? 'auto' : dir}
        className={`w-full rounded-lg border border-line bg-surface-2 ps-9 pe-20 text-ink placeholder:text-muted focus:border-primary focus:outline-none ${large ? 'py-3 text-base' : 'py-2 text-sm'}`}
      />
      <button
        type="submit"
        disabled={!kind}
        className="absolute end-1.5 top-1/2 -translate-y-1/2 rounded-md bg-primary px-2.5 py-1 text-xs font-semibold text-white disabled:opacity-40 dark:text-[#04212a]"
      >
        {t('top.searchGo')}
      </button>
    </form>
  )
}
