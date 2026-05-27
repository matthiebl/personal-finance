type ImportSourcePickerProps = {
  onPickCsv: () => void
  onPickApi: () => void
  busy: boolean
}

export function ImportSourcePicker({ onPickCsv, onPickApi, busy }: ImportSourcePickerProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
      <button
        onClick={onPickCsv}
        disabled={busy}
        className="flex flex-col items-start gap-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 text-left hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-sm transition-all disabled:opacity-50"
      >
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">CSV File</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Import from a spreadsheet or bank export
          </p>
        </div>
        <span className="mt-auto text-xs font-medium text-indigo-600 dark:text-indigo-400">
          Upload file →
        </span>
      </button>

      <button
        onClick={onPickApi}
        disabled={busy}
        className="flex flex-col items-start gap-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 text-left hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-sm transition-all disabled:opacity-50"
      >
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
            />
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Bank API</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Connect directly to Up Bank
          </p>
        </div>
        <span className="mt-auto text-xs font-medium text-indigo-600 dark:text-indigo-400">
          Connect →
        </span>
      </button>
    </div>
  )
}
