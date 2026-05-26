import type { ImportRow } from '../../lib/types'

type RawDataTabProps = {
  rows: ImportRow[]
  headers: string[]
  onDeleteRow: (id: string) => void
}

export function RawDataTab({ rows, headers, onDeleteRow }: RawDataTabProps) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400 py-8 text-center">
        No rows remaining.
      </p>
    )
  }

  const last = headers.length - 1

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-x-auto">
      <table className="w-full min-w-max text-sm border-collapse">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-800">
            {headers.map((h, i) => (
              <th
                key={h}
                className={`py-2 text-left font-medium text-gray-500 dark:text-gray-400 ${
                  i === 0 ? 'pl-4 pr-3' : i === last ? 'pl-3 pr-3' : 'px-3'
                }`}
              >
                {h}
              </th>
            ))}
            <th className="w-10 py-2" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              className="border-b border-gray-100 dark:border-gray-800/60 even:bg-gray-50/50 dark:even:bg-gray-900/30"
            >
              {headers.map((h, i) => (
                <td
                  key={h}
                  title={row.rawData[h] ?? ''}
                  className={`py-1.5 text-gray-700 dark:text-gray-300 whitespace-nowrap max-w-64 truncate ${
                    i === 0 ? 'pl-4 pr-3' : i === last ? 'pl-3 pr-3' : 'px-3'
                  }`}
                >
                  {row.rawData[h] ?? ''}
                </td>
              ))}
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
          ))}
        </tbody>
      </table>
    </div>
  )
}
