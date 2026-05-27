import { Fragment, useState } from 'react'
import type { ImportRow } from '../../lib/types'

type ApiRawDataTabProps = {
  rows: ImportRow[]
  onDeleteRow: (id: string) => void
}

export function ApiRawDataTab({ rows, onDeleteRow }: ApiRawDataTabProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  if (rows.length === 0) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400 py-8 text-center">
        No rows remaining.
      </p>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-800">
            <th className="py-2 pl-4 pr-3 text-left font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
              Date
            </th>
            <th className="py-2 px-3 text-left font-medium text-gray-500 dark:text-gray-400">
              Description
            </th>
            <th className="py-2 px-3 text-right font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
              Amount
            </th>
            <th className="py-2 px-3 text-center font-medium text-gray-500 dark:text-gray-400 w-16">
              Raw
            </th>
            <th className="w-10 py-2" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const isExpanded = expandedId === row.id
            const rawJson = row.rawData['_raw'] ?? ''
            let prettyJson = rawJson
            try {
              prettyJson = JSON.stringify(JSON.parse(rawJson), null, 2)
            } catch {
              // leave as-is
            }
            const amount = parseFloat(row.amount)

            return (
              <Fragment key={row.id}>
                <tr className="border-b border-gray-100 dark:border-gray-800/60 even:bg-gray-50/50 dark:even:bg-gray-900/30">
                  <td className="py-1.5 pl-4 pr-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                    {row.parsedDate ?? '—'}
                  </td>
                  <td className="py-1.5 px-3 text-gray-700 dark:text-gray-300 max-w-xs truncate">
                    {row.description}
                  </td>
                  <td
                    className={`py-1.5 px-3 text-right font-mono whitespace-nowrap ${
                      amount < 0
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-green-600 dark:text-green-400'
                    }`}
                  >
                    {row.amount}
                  </td>
                  <td className="py-1.5 px-3 text-center">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : row.id)}
                      title={isExpanded ? 'Collapse JSON' : 'View raw JSON'}
                      className={`inline-flex items-center justify-center w-7 h-7 rounded text-xs font-mono transition-colors ${
                        isExpanded
                          ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400'
                          : 'text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-300'
                      }`}
                    >
                      {'{}'}
                    </button>
                  </td>
                  <td className="py-1.5 pr-1 text-right">
                    <button
                      onClick={() => onDeleteRow(row.id)}
                      title="Delete row"
                      className="w-6 h-6 flex items-center justify-center rounded text-gray-300 dark:text-gray-700 hover:text-red-400 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-base leading-none"
                    >
                      ×
                    </button>
                  </td>
                </tr>
                {isExpanded && (
                  <tr className="border-b border-gray-100 dark:border-gray-800/60">
                    <td colSpan={5} className="px-4 py-3 bg-gray-50 dark:bg-gray-800/40">
                      <pre className="text-xs text-gray-700 dark:text-gray-300 font-mono leading-relaxed overflow-x-auto max-h-72 whitespace-pre">
                        {prettyJson}
                      </pre>
                    </td>
                  </tr>
                )}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
