import { SectionHeading } from '../layout'
import type { ImportColumnMap } from '../../lib/types'
import { ColumnMapper } from './ColumnMapper'

type AdvancedTabProps = {
  headers: string[]
  columnMap: ImportColumnMap
  dateFormat: string
  negateAmount: boolean
  detectedDateFormat: string | null
  onColumnMapChange: (patch: Partial<ImportColumnMap>) => void
  onDateFormatChange: (fmt: string) => void
  onNegateAmountChange: (negate: boolean) => void
}

export function AdvancedTab({
  headers,
  columnMap,
  dateFormat,
  negateAmount,
  detectedDateFormat,
  onColumnMapChange,
  onDateFormatChange,
  onNegateAmountChange,
}: AdvancedTabProps) {
  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <SectionHeading>Column Mapping</SectionHeading>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          Map your CSV columns to the app's fields.
        </p>
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          <ColumnMapper
            fieldLabel="Date"
            headers={headers}
            currentValue={columnMap.date}
            required
            onChange={(v) => onColumnMapChange({ date: v })}
          />
          <ColumnMapper
            fieldLabel="Amount"
            headers={headers}
            currentValue={columnMap.amount}
            required
            onChange={(v) => onColumnMapChange({ amount: v })}
          />
          <ColumnMapper
            fieldLabel="Description"
            headers={headers}
            currentValue={columnMap.description}
            onChange={(v) => onColumnMapChange({ description: v })}
          />
          <ColumnMapper
            fieldLabel="Tags"
            headers={headers}
            currentValue={columnMap.tags}
            onChange={(v) => onColumnMapChange({ tags: v })}
          />
        </div>
      </div>

      <div>
        <SectionHeading>Date Format</SectionHeading>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          Format tokens: YYYY, MM, DD, M, D
          {detectedDateFormat && (
            <span className="ml-2 text-indigo-600 dark:text-indigo-400">
              (auto-detected: {detectedDateFormat})
            </span>
          )}
        </p>
        <input
          type="text"
          value={dateFormat}
          onChange={(e) => onDateFormatChange(e.target.value)}
          placeholder="e.g. DD/MM/YYYY"
          className="w-48 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div>
        <SectionHeading>Amount</SectionHeading>
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={negateAmount}
            onChange={(e) => onNegateAmountChange(e.target.checked)}
            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">
            Negate amounts (bank shows expenses as positive numbers)
          </span>
        </label>
      </div>
    </div>
  )
}
