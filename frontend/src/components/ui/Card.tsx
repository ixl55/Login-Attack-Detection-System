import clsx from 'clsx'
import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

interface CardProps {
  title?: ReactNode
  icon?: LucideIcon
  actions?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
}

export function Card({ title, icon: Icon, actions, children, className, bodyClassName }: CardProps) {
  return (
    <section className={clsx('rounded-xl border border-line bg-surface shadow-sm', className)}>
      {(title || actions) && (
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
            {Icon && <Icon className="size-4 text-primary" aria-hidden />}
            {title}
          </h2>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={clsx('p-4', bodyClassName)}>{children}</div>
    </section>
  )
}
