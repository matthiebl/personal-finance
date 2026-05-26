type ColumnMapperProps = {
  fieldLabel: string
  headers: string[]
  currentValue: string
  required?: boolean
  onChange: (value: string) => void
}

export function ColumnMapper({
  fieldLabel,
  headers,
  currentValue,
  required,
  onChange,
}: ColumnMapperProps) {
  return (
    <div className="flex items-center gap-4 py-2">
      <label className="w-32 text-sm font-medium text-gray-700 dark:text-gray-300 shrink-0">
        {fieldLabel}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <select
        value={currentValue}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        <option value="">— Not mapped —</option>
        {headers.map((h) => (
          <option key={h} value={h}>
            {h}
          </option>
        ))}
      </select>
    </div>
  )
}
