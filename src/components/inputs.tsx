import type { InputHTMLAttributes } from 'react'
import { useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

export type TxSuggestion = {
  description: string
  categoryId: string
  tags?: string
  categoryLabel: string
}

export function DescriptionAutocomplete({
  value,
  onChange,
  onSelect,
  suggestions,
  compact = false,
  portal = false,
}: {
  value: string
  onChange: (v: string) => void
  onSelect: (description: string, categoryId: string, tags: string) => void
  suggestions: TxSuggestion[]
  compact?: boolean
  portal?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [highlightIdx, setHighlightIdx] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 })

  const filtered = useMemo(() => {
    if (!value.trim()) return []
    const lower = value.toLowerCase()
    return suggestions.filter((s) => s.description.toLowerCase().includes(lower)).slice(0, 8)
  }, [value, suggestions])

  const showDropdown = open && filtered.length > 0

  function measureInput() {
    if (portal && inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect()
      setDropdownPos({ top: rect.bottom + 4, left: rect.left, width: rect.width })
    }
  }

  function select(s: TxSuggestion) {
    onSelect(s.description, s.categoryId, s.tags ?? '')
    setOpen(false)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      setOpen(false)
      return
    }
    if (!showDropdown) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightIdx((i) => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightIdx((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && highlightIdx >= 0) {
      e.preventDefault()
      select(filtered[highlightIdx])
    } else if (e.metaKey) {
      const n = parseInt(e.key)
      if (n >= 1 && n <= filtered.length) {
        e.preventDefault()
        select(filtered[n - 1])
      }
    }
  }

  const dropdown = showDropdown ? (
    <div
      className={`z-9999 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl shadow-2xl ring-1 ring-black/5 dark:ring-white/10 min-w-64 ${portal ? 'fixed' : 'absolute top-full left-0 right-0 mt-1'}`}
      style={
        portal
          ? { top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width }
          : undefined
      }
    >
      <p className="px-3 pt-2.5 pb-1 text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 select-none">
        Suggestions
      </p>
      <ul className="pb-1.5">
        {filtered.map((s, i) => (
          <li
            key={`${s.description}\0${s.categoryId}\0${s.tags ?? ''}`}
            onMouseDown={(e) => {
              e.preventDefault()
              select(s)
            }}
            onMouseEnter={() => setHighlightIdx(i)}
            className={`mx-1.5 px-2.5 py-2 rounded-lg cursor-pointer flex items-start gap-2.5 ${i === highlightIdx ? 'bg-gray-100 dark:bg-gray-700' : 'hover:bg-gray-50 dark:hover:bg-gray-700/60'}`}
          >
            <span className="mt-0.5 shrink-0 rounded text-center text-xs leading-4 font-medium bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 select-none px-1 py-0.5 whitespace-nowrap">
              ⌘{i + 1}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
                {s.description}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">
                {s.categoryLabel}
                {s.tags && <span className="ml-2 text-gray-300 dark:text-gray-600">{s.tags}</span>}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  ) : null

  return (
    <div className="relative w-full">
      <input
        ref={inputRef}
        type="text"
        placeholder="Description"
        value={value}
        onChange={(e) => {
          onChange(e.target.value)
          measureInput()
          setOpen(true)
          setHighlightIdx(-1)
        }}
        onFocus={() => {
          measureInput()
          setOpen(true)
        }}
        onBlur={() => setOpen(false)}
        onKeyDown={handleKeyDown}
        className={`w-full border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 placeholder-gray-300 dark:placeholder-gray-700 focus:outline-none focus:ring-1 focus:ring-gray-400 dark:focus:ring-gray-600 ${compact ? 'px-2 py-1 text-sm' : 'px-2.5 py-1.5 text-sm'}`}
      />
      {portal ? createPortal(dropdown, document.body) : dropdown}
    </div>
  )
}

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
    const cleaned = value.replace(/[$,\s]/g, '')
    const num = parseFloat(cleaned)
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
  compact = false,
}: {
  value: string
  onChange: (v: string) => void
  suffix: string
  placeholder?: string
  inputMode?: InputHTMLAttributes<HTMLInputElement>['inputMode']
  decimalPlaces?: number
  compact?: boolean
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
        className={`flex-1 min-w-0 text-right border border-gray-300 dark:border-gray-700 rounded-l bg-white dark:bg-gray-900 tabular-nums focus:outline-none focus:ring-1 focus:ring-gray-400 dark:focus:ring-gray-600 ${compact ? 'px-2 py-1 text-sm max-w-28' : 'px-2.5 py-1.5 text-sm'}`}
      />
      <span
        className={`inline-flex items-center rounded-r border border-l-0 border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-500 select-none whitespace-nowrap ${compact ? 'px-2 text-xs' : 'px-2.5 text-sm'}`}
      >
        {suffix}
      </span>
    </div>
  )
}

/**
 * Plain text input. Use compact=true for tighter table cell sizing.
 */
export function TextInput({
  value,
  onChange,
  placeholder = '',
  compact = false,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  compact?: boolean
}) {
  return (
    <input
      type="text"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 placeholder-gray-300 dark:placeholder-gray-700 focus:outline-none focus:ring-1 focus:ring-gray-400 dark:focus:ring-gray-600 ${compact ? 'px-2 py-1 text-sm' : 'px-2.5 py-1.5 text-sm'}`}
    />
  )
}
