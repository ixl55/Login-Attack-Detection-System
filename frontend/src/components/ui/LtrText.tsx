import clsx from 'clsx'
import type { ReactNode } from 'react'

/** Technical values (IPs, usernames, user agents) stay left-to-right inside Arabic text. */
export function LtrText({ children, className, mono = true }: { children: ReactNode; className?: string; mono?: boolean }) {
  return (
    <bdi dir="ltr" className={clsx(mono && 'font-mono text-[0.92em]', className)}>
      {children}
    </bdi>
  )
}
