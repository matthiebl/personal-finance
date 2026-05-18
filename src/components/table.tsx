import type { ReactNode } from 'react'

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
}: {
  title?: string
  rows: R[]
  columns: DataTableColumn<R>[]
  /** Header text for the label column. Defaults to 'Category'. */
  rowHeader?: string
  /** Label shown in the totals row. Defaults to 'Total'. */
  footerLabel?: string
}) {
  const hasFooter = columns.some(c => c.footer !== undefined)
  const lastColIndex = columns.length - 1

  return (
    <div>
      {title && (
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">
          {title}
        </p>
      )}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-800">
              <th className="text-left py-2 pl-4 pr-3 font-medium text-gray-500 dark:text-gray-400">
                {rowHeader}
              </th>
              {columns.map((col, i) => (
                <th
                  key={i}
                  className={`py-2 font-medium text-gray-500 dark:text-gray-400 ${col.width ?? ''} ${col.align === 'left' ? 'text-left' : 'text-right'} ${i === lastColIndex ? 'pl-3 pr-4' : 'px-3'}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
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
          </tbody>
        </table>
      </div>
    </div>
  )
}
