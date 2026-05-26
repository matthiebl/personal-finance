import { useRef, useState } from 'react'
import { parseCsvText } from '../../lib/csv'

type ImportUploaderProps = {
  onFileParsed: (
    headers: string[],
    rows: Record<string, string>[],
    filename: string,
    noHeaderRow: boolean
  ) => void
  busy: boolean
}

export function ImportUploader({ onFileParsed, busy }: ImportUploaderProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function processFile(file: File) {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('Please upload a .csv file.')
      return
    }
    setError(null)
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const { headers, rows, errors, noHeaderRow } = parseCsvText(text)
      if (errors.length > 0) {
        setError(`Parse warning: ${errors[0]}`)
      }
      onFileParsed(headers, rows, file.name, noHeaderRow)
    }
    reader.readAsText(file)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) processFile(file)
    e.target.value = ''
  }

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => !busy && fileRef.current?.click()}
        className={`relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-8 py-12 text-center cursor-pointer transition-colors
          ${
            dragging
              ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-950/30'
              : 'border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-indigo-300 dark:hover:border-indigo-700'
          }
          ${busy ? 'pointer-events-none opacity-60' : ''}`}
      >
        {busy && (
          <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-white/70 dark:bg-gray-900/70">
            <svg className="animate-spin h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          </div>
        )}

        <svg
          className="w-10 h-10 text-gray-400 dark:text-gray-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>

        <div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Drop a CSV file here, or{' '}
            <span className="text-indigo-600 dark:text-indigo-400">browse</span>
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">CSV files only (.csv)</p>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept=".csv"
          className="sr-only"
          onChange={handleFileChange}
        />
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  )
}
