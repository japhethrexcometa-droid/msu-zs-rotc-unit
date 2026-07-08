import type { ReactNode } from 'react'
import { Skeleton } from './Skeleton'

export interface ColumnDef<T> {
  key: keyof T | string
  header: string
  render?: (row: T) => ReactNode
  width?: string
  align?: 'left' | 'center' | 'right'
}

/* ── Column-based table (original API) ── */
interface ColumnTableProps<T> {
  columns: ColumnDef<T>[]
  data: T[]
  loading?: boolean
  emptyMessage?: string
  onRowClick?: (row: T) => void
  className?: string
  // discriminator – must NOT have `headers` or `renderRow`
  headers?: never
  renderRow?: never
}

/* ── Header+renderRow table (Phase 5 API) ── */
interface RenderRowTableProps<T> {
  headers: ReactNode[]
  data: T[]
  isLoading?: boolean
  emptyMessage?: string
  keyExtractor: (row: T, index?: number) => string
  renderRow: (row: T, index?: number) => ReactNode
  className?: string
  rowClassName?: (row: T, index: number) => string
  // discriminator
  columns?: never
  loading?: never
}

type TableProps<T> = ColumnTableProps<T> | RenderRowTableProps<T>

const alignClass = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
}

export function Table<T extends Record<string, unknown>>(props: TableProps<T>) {
  const {
    data,
    emptyMessage = 'No data available.',
    className = '',
  } = props

  // ── Render-row API ──
  if ('headers' in props && props.headers) {
    const { headers, isLoading, keyExtractor, renderRow } = props as RenderRowTableProps<T>

    return (
      <div className={`overflow-x-auto ${className}`}>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-rotc-bg/60 border-b border-rotc-border">
              {headers.map((h, i) => (
                <th
                  key={i}
                  className="px-4 py-3 font-medium text-rotc-textMuted text-xs uppercase tracking-wider text-left"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-rotc-border/50">
            {isLoading &&
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={`skel-${i}`} className="bg-rotc-card">
                  {headers.map((h) => (
                    <td key={h} className="px-4 py-3">
                      <Skeleton className="h-4 w-3/4" />
                    </td>
                  ))}
                </tr>
              ))}

            {!isLoading && data.length === 0 && (
              <tr>
                <td colSpan={headers.length} className="px-4 py-12 text-center text-rotc-textMuted">
                  <div className="flex flex-col items-center gap-2">
                    <svg className="h-10 w-10 text-rotc-border" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                    </svg>
                    <p>{emptyMessage}</p>
                  </div>
                </td>
              </tr>
            )}

            {!isLoading &&
              data.map((row, i) => (
                <tr
                  key={keyExtractor(row, i)}
                  className={`bg-rotc-card hover:bg-rotc-cardHover transition-colors duration-100 ${props.rowClassName?.(row, i) || ''}`}
                >
                  {renderRow(row, i)}
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    )
  }

  // ── Column-based API (original) ──
  const { columns, loading = false, onRowClick } = props as ColumnTableProps<T>

  return (
    <div className={`overflow-x-auto rounded-xl border border-rotc-border ${className}`}>
      <table className="w-full text-sm">
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
        <tbody className="divide-y divide-rotc-border/50">
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

          {!loading && data.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-4 py-12 text-center text-rotc-textMuted">
                <div className="flex flex-col items-center gap-2">
                  <svg className="h-10 w-10 text-rotc-border" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                  </svg>
                  <p>{emptyMessage}</p>
                </div>
              </td>
            </tr>
          )}

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
