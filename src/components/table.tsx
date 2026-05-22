import type { ReactNode } from 'react'
import { useState } from 'react'
import { fmt, fmtCents } from '../lib/finance'

// ─── Shared Primitive ─────────────────────────────────────────────────────────

type ShellHeader = {
  label: string
  align?: 'left' | 'right'
  /** Bolder dark text — use for the primary "Total" column */
  primary?: boolean
  width?: string
  /** Sticky left-column header (for horizontally scrollable tables) */
  sticky?: boolean
  minWidth?: string
}

function TableShell({
  headers,
  minWidth,
  children,
}: {
  headers: ShellHeader[]
  /** Inline min-width for wide tables that need a fixed minimum (e.g. 960) */
  minWidth?: number
  children: ReactNode
}) {
  const last = headers.length - 1
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-x-auto">
      <table
        className="w-full min-w-max text-sm border-collapse"
        style={minWidth ? { minWidth } : undefined}
      >
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-800">
            {headers.map((h, i) => (
              <th
                key={i}
                className={[
                  'py-2 font-medium',
                  h.align === 'right' ? 'text-right' : 'text-left',
                  h.primary
                    ? 'text-gray-700 dark:text-gray-300 font-semibold'
                    : 'text-gray-500 dark:text-gray-400',
                  h.width ?? '',
                  h.minWidth ?? '',
                  h.sticky ? 'sticky left-0 z-10 bg-white dark:bg-gray-900' : '',
                  i === 0 ? 'pl-4 pr-3' : i === last ? 'pl-3 pr-4' : 'px-3',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                {h.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}

// ─── DataTable ────────────────────────────────────────────────────────────────

export type DataTableColumn<R> = {
  header: string
  /** Tailwind width class, e.g. 'w-36' */
  width?: string
  /** Defaults to 'right' */
  align?: 'left' | 'right'
  cell: (row: R) => ReactNode
  /** Content shown in the totals row. Omit to leave that cell blank. */
  footer?: ReactNode
  /** Use bold/dark text in the totals row — for the primary result column */
  footerPrimary?: boolean
}

export type TableRowData = {
  id?: string
  label: string
  color?: string
}

export function DataTable<R extends TableRowData>({
  title,
  rows,
  columns,
  rowHeader = 'Category',
  footerLabel = 'Total',
  className = '',
}: {
  title?: string
  rows: R[]
  columns: DataTableColumn<R>[]
  /** Header text for the label column. Defaults to 'Category'. */
  rowHeader?: string
  /** Label shown in the totals row. Defaults to 'Total'. */
  footerLabel?: string
  className?: string
}) {
  const hasFooter = columns.some((c) => c.footer !== undefined)
  const lastColIndex = columns.length - 1

  const headers: ShellHeader[] = [
    { label: rowHeader, align: 'left' },
    ...columns.map((col) => ({
      label: col.header,
      align: col.align,
      width: col.width,
    })),
  ]

  return (
    <div className={className}>
      {title && (
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">
          {title}
        </p>
      )}
      <TableShell headers={headers}>
        {rows.map((row) => (
          <tr
            key={row.id ?? row.label}
            className="border-b border-gray-100 dark:border-gray-800/60 even:bg-gray-50/50 dark:even:bg-gray-900/30"
          >
            <td className="py-1.5 pl-4 pr-3">
              <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                {row.color && (
                  <span
                    className="w-2.5 h-2.5 rounded-sm shrink-0"
                    style={{ backgroundColor: row.color }}
                  />
                )}
                {row.label}
              </div>
            </td>
            {columns.map((col, i) => (
              <td
                key={i}
                className={`py-1.5 ${col.align === 'left' ? 'text-left' : 'text-right'} ${i === lastColIndex ? 'pl-3 pr-4' : 'px-3'}`}
              >
                {col.cell(row)}
              </td>
            ))}
          </tr>
        ))}
        {hasFooter && (
          <tr className="border-t-2 border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800/50 font-semibold">
            <td className="py-2 pl-4 pr-3 text-gray-700 dark:text-gray-200">{footerLabel}</td>
            {columns.map((col, i) => (
              <td
                key={i}
                className={`py-2 tabular-nums ${col.align === 'left' ? 'text-left' : 'text-right'} ${i === lastColIndex ? 'pl-3 pr-4' : 'px-3'} ${col.footerPrimary ? 'text-gray-700 dark:text-gray-200' : 'text-gray-500 dark:text-gray-400'}`}
              >
                {col.footer ?? null}
              </td>
            ))}
          </tr>
        )}
      </TableShell>
    </div>
  )
}

// ─── Annual Breakdown Table ───────────────────────────────────────────────────

export type AnnualTableRow = {
  categoryId: string
  label: string
  monthlyTotals: number[]
  annualTotal: number
}

export type AnnualSectionConfig = {
  title: string
  rows: AnnualTableRow[]
  accentClass: string
}

export type AnnualSummaryRow = {
  label: string
  months: ReactNode[]
  total: ReactNode
  rowClass: string
  stickyClass: string
  labelClass?: string
  monthClass?: string
  totalClass?: string
}

function AnnualSection({
  title,
  rows,
  onRowClick,
  accentClass,
  monthCount,
}: {
  title: string
  rows: AnnualTableRow[]
  onRowClick: (categoryId: string) => void
  accentClass: string
  monthCount: number
}) {
  const [open, setOpen] = useState(true)
  const sectionTotals = Array.from({ length: monthCount }, (_, i) =>
    rows.reduce((s, r) => s + r.monthlyTotals[i], 0)
  )
  const sectionAnnual = rows.reduce((s, r) => s + r.annualTotal, 0)

  return (
    <>
      <tr
        onClick={() => setOpen((o) => !o)}
        className="cursor-pointer bg-gray-50 dark:bg-gray-800/40 border-b border-gray-200 dark:border-gray-800"
      >
        <td className="sticky left-0 z-10 bg-gray-50 dark:bg-gray-800/40 py-2 pr-4 pl-3">
          <span className="text-xs mr-1.5 text-gray-400">{open ? '▾' : '▸'}</span>
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            {title}
          </span>
        </td>
        {sectionTotals.map((v, i) => (
          <td
            key={i}
            className="py-2 px-3 text-right tabular-nums text-xs font-medium text-gray-500 dark:text-gray-400"
          >
            {v > 0 ? fmt(v) : <span className="text-gray-300 dark:text-gray-700">—</span>}
          </td>
        ))}
        <td
          className={`py-2 pl-3 pr-4 text-right tabular-nums text-xs font-semibold ${accentClass}`}
        >
          {sectionAnnual > 0 ? (
            fmt(sectionAnnual)
          ) : (
            <span className="text-gray-300 dark:text-gray-700">—</span>
          )}
        </td>
      </tr>
      {open &&
        rows.map((row) => (
          <tr
            key={row.categoryId}
            onClick={() => onRowClick(row.categoryId)}
            className="cursor-pointer border-b border-gray-100 dark:border-gray-800/60 even:bg-gray-50/50 dark:even:bg-gray-900/30 hover:bg-indigo-50/40 dark:hover:bg-indigo-900/10 transition-colors"
          >
            <td className="sticky left-0 z-10 bg-white dark:bg-gray-900 even-row:bg-gray-50/50 py-2 pr-4 pl-6 text-gray-700 dark:text-gray-300 text-sm">
              {row.label}
              <span className="ml-1.5 text-[10px] text-gray-300 dark:text-gray-700">↗</span>
            </td>
            {row.monthlyTotals.map((v, i) => (
              <td
                key={i}
                className="py-2 px-3 text-right tabular-nums text-sm text-gray-600 dark:text-gray-400"
              >
                {v > 0 ? fmtCents(v) : <span className="text-gray-300 dark:text-gray-700">—</span>}
              </td>
            ))}
            <td className="py-2 pl-3 pr-4 text-right tabular-nums text-sm font-medium text-gray-700 dark:text-gray-200">
              {row.annualTotal > 0 ? (
                fmtCents(row.annualTotal)
              ) : (
                <span className="text-gray-300 dark:text-gray-700">—</span>
              )}
            </td>
          </tr>
        ))}
    </>
  )
}

export function AnnualBreakdownTable({
  monthHeaders,
  sections,
  summaryRows = [],
  onRowClick,
}: {
  monthHeaders: string[]
  sections: AnnualSectionConfig[]
  summaryRows?: AnnualSummaryRow[]
  onRowClick: (categoryId: string) => void
}) {
  const headers: ShellHeader[] = [
    { label: 'Category', align: 'left', sticky: true, width: 'w-40' },
    ...monthHeaders.map((m) => ({ label: m, align: 'right' as const, minWidth: 'min-w-18' })),
    { label: 'Total', align: 'right', primary: true, minWidth: 'min-w-21' },
  ]

  return (
    <TableShell headers={headers} minWidth={960}>
      {sections.map((section) => (
        <AnnualSection
          key={section.title}
          title={section.title}
          rows={section.rows}
          onRowClick={onRowClick}
          accentClass={section.accentClass}
          monthCount={monthHeaders.length}
        />
      ))}
      {summaryRows.map((row, i) => (
        <tr key={i} className={row.rowClass}>
          <td
            className={`sticky left-0 z-10 py-2 pr-4 pl-4 text-sm ${row.stickyClass} ${row.labelClass ?? ''}`}
          >
            {row.label}
          </td>
          {row.months.map((cell, j) => (
            <td
              key={j}
              className={`py-2 px-3 text-right tabular-nums text-sm ${row.monthClass ?? ''}`}
            >
              {cell}
            </td>
          ))}
          <td className={`py-2 pl-3 pr-4 text-right tabular-nums text-sm ${row.totalClass ?? ''}`}>
            {row.total}
          </td>
        </tr>
      ))}
    </TableShell>
  )
}
