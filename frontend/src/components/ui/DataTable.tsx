import clsx from 'clsx'
import type { ReactNode } from 'react'
import { EmptyState, SkeletonRows } from './States'

export interface Column<T> {
  key: string
  header: ReactNode
  render: (row: T) => ReactNode
  className?: string
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading,
  emptyText,
  rowClassName,
}: {
  columns: Column<T>[]
  rows: T[] | undefined
  rowKey: (row: T) => string | number
  loading?: boolean
  emptyText: string
  rowClassName?: (row: T) => string | undefined
}) {
  if (loading && !rows) return <SkeletonRows />
  if (!rows?.length) return <EmptyState title={emptyText} compact />
  return (
    // Only the table scrolls horizontally on small screens, never the page.
    <div className="-mx-4 overflow-x-auto px-4">
      <table className="w-full min-w-max text-sm">
        <thead>
          <tr className="border-b border-line text-xs text-muted">
            {columns.map((c) => (
              <th key={c.key} scope="col" className={clsx('px-3 py-2 text-start font-medium whitespace-nowrap', c.className)}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((row) => (
            <tr key={rowKey(row)} className={clsx('hover:bg-surface-2/60', rowClassName?.(row))}>
              {columns.map((c) => (
                <td key={c.key} className={clsx('px-3 py-2 align-middle whitespace-nowrap text-ink', c.className)}>
                  {c.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
