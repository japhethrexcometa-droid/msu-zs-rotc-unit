import type { ReactNode } from 'react'
import { Skeleton } from './Skeleton'

export interface ColumnDef<T> {
  key: keyof T | string
  header: string
  render?: (row: T) => ReactNode
  width?: string
  align?: 'left' | 'center' | 'right'
}

interface TableProps<T> {
  columns: ColumnDef<T>[]
  data: T[]
  loading?: boolean
  emptyMessage?: string
  onRowClick?: (row: T) => void
  className?: string
}

const alignClass = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
}

export function Table<T extends Record<string, unknown>>({
  columns,
  data,
  loading = false,
  emptyMessage = 'No data available.',
  onRowClick,
  className = '',
}: TableProps<T>) {
  return (
    <div className={`overflow-x-auto rounded-xl border border-rotc-border ${className}`}>
      <table className="w-full text-sm">
        {/* Header */}
        <thead>
          <tr className="bg-rotc-bg/60 border-b border-rotc-border">
            {columns.map((col) => (
              <th
                key={String(col.key)}
                className={[
                  'px-4 py-3 font-medium text-rotc-textMuted text-xs uppercase tracking-wider',
                  alignClass[col.align ?? 'left'],
                ].join(' ')}
                style={col.width ? { width: col.width } : undefined}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>

        {/* Body */}
        <tbody className="divide-y divide-rotc-border/50">
          {/* Loading skeleton */}
          {loading &&
            Array.from({ length: 6 }).map((_, rowIdx) => (
              <tr key={`skeleton-${rowIdx}`} className="bg-rotc-card">
                {columns.map((col) => (
                  <td key={String(col.key)} className="px-4 py-3">
                    <Skeleton className="h-4 w-3/4" />
                  </td>
                ))}
              </tr>
            ))}

          {/* Empty state */}
          {!loading && data.length === 0 && (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-12 text-center text-rotc-textMuted"
              >
                <div className="flex flex-col items-center gap-2">
                  <svg className="h-10 w-10 text-rotc-border" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                  </svg>
                  <p>{emptyMessage}</p>
                </div>
              </td>
            </tr>
          )}

          {/* Data rows */}
          {!loading &&
            data.map((row, rowIdx) => (
              <tr
                key={rowIdx}
                className={[
                  'bg-rotc-card transition-colors duration-100',
                  onRowClick ? 'cursor-pointer hover:bg-rotc-cardHover' : '',
                ].join(' ')}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((col) => (
                  <td
                    key={String(col.key)}
                    className={[
                      'px-4 py-3 text-rotc-text',
                      alignClass[col.align ?? 'left'],
                    ].join(' ')}
                  >
                    {col.render
                      ? col.render(row)
                      : String(row[col.key as keyof T] ?? '—')}
                  </td>
                ))}
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  )
}

export default Table
