import type { InputHTMLAttributes } from 'react'

/**
 * Text input with a $ prefix. Formats to 2 decimal places on blur.
 * Use compact=true for tighter table cell sizing.
 */
export function CurrencyInput({
  value,
  onChange,
  placeholder = '0.00',
  compact = false,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  compact?: boolean
}) {
  const handleBlur = () => {
    const num = parseFloat(value)
    if (!isNaN(num)) onChange(num.toFixed(2))
  }
  return (
    <div className="flex w-full">
      <span
        className={`inline-flex items-center rounded-l border border-r-0 border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-500 select-none ${compact ? 'px-2 text-xs' : 'px-2.5 text-sm'}`}
      >
        $
      </span>
      <input
        type="text"
        inputMode="decimal"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={handleBlur}
        className={`flex-1 min-w-0 text-right border border-gray-300 dark:border-gray-700 rounded-r bg-white dark:bg-gray-900 tabular-nums focus:outline-none focus:ring-1 focus:ring-gray-400 dark:focus:ring-gray-600 ${compact ? 'px-2 py-1 text-sm max-w-28' : 'px-2.5 py-1.5 text-sm'}`}
      />
    </div>
  )
}

/**
 * Text input with a right-side suffix label (e.g. "%" or "months").
 * Formats to `decimalPlaces` on blur (default 2; pass 0 for whole numbers).
 */
export function SuffixInput({
  value,
  onChange,
  suffix,
  placeholder = '0',
  inputMode = 'decimal',
  decimalPlaces = 2,
}: {
  value: string
  onChange: (v: string) => void
  suffix: string
  placeholder?: string
  inputMode?: InputHTMLAttributes<HTMLInputElement>['inputMode']
  decimalPlaces?: number
}) {
  const handleBlur = () => {
    const num = parseFloat(value)
    if (!isNaN(num)) onChange(num.toFixed(decimalPlaces))
  }
  return (
    <div className="flex w-full">
      <input
        type="text"
        inputMode={inputMode}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={handleBlur}
        className="flex-1 min-w-0 text-right border border-gray-300 dark:border-gray-700 rounded-l px-2.5 py-1.5 text-sm bg-white dark:bg-gray-900 tabular-nums focus:outline-none focus:ring-1 focus:ring-gray-400 dark:focus:ring-gray-600"
      />
      <span className="inline-flex items-center px-2.5 rounded-r border border-l-0 border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-400 dark:text-gray-500 select-none whitespace-nowrap">
        {suffix}
      </span>
    </div>
  )
}
