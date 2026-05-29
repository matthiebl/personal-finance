import type { ReactNode } from 'react'
import type { ViewMode } from '../lib/annualPicker'

export function YearSelector({
  year,
  onChange,
}: {
  year: string
  onChange: (delta: number) => void
}) {
  return (
    <div className="flex items-center rounded-full border border-gray-200 dark:border-gray-700">
      <button
        onClick={() => onChange(-1)}
        className="px-2.5 py-1.5 text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-l-full transition-colors text-sm"
      >
        ‹
      </button>
      <span className="px-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 tabular-nums select-none">
        {year}
      </span>
      <button
        onClick={() => onChange(1)}
        className="px-2.5 py-1.5 text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-r-full transition-colors text-sm"
      >
        ›
      </button>
    </div>
  )
}

const MONTH_ABBRS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

export function MonthSelector({
  selectedIdx,
  onChange,
}: {
  selectedIdx: number
  onChange: (i: number) => void
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {MONTH_ABBRS.map((month, i) => (
        <button
          key={month}
          onClick={() => onChange(i)}
          className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
            i === selectedIdx
              ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-medium'
              : 'border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
        >
          {month}
        </button>
      ))}
    </div>
  )
}

export function ViewToggle({
  mode,
  onChange,
}: {
  mode: ViewMode
  onChange: (m: ViewMode) => void
}) {
  return (
    <div className="flex items-center rounded-full border border-gray-200 dark:border-gray-700 overflow-hidden">
      <button
        onClick={() => onChange('year')}
        className={`px-3 py-1.5 text-sm transition-colors rounded-l-full ${
          mode === 'year'
            ? 'bg-indigo-600 text-white'
            : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
        }`}
      >
        Year
      </button>
      <button
        onClick={() => onChange('rolling12')}
        className={`px-3 py-1.5 text-sm transition-colors rounded-r-full ${
          mode === 'rolling12'
            ? 'bg-indigo-600 text-white'
            : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
        }`}
      >
        Rolling 12M
      </button>
    </div>
  )
}

export function PageHeader({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string
  subtitle?: ReactNode
  actions?: ReactNode
  children?: ReactNode
}) {
  return (
    <div className="mb-6 pb-5 border-b border-gray-200 dark:border-gray-800">
      <div
        className={actions ? 'flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between' : ''}
      >
        <div>
          <h1 className="text-2xl font-bold mb-1">{title}</h1>
          {subtitle && <p className="text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>}
        </div>
        {actions}
      </div>
      {children}
    </div>
  )
}

export function SectionHeading({ children }: { children: ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">
      {children}
    </p>
  )
}

export function TabBar<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: T; label: string }[]
  active: T
  onChange: (t: T) => void
}) {
  return (
    <div className="flex gap-1 mb-8 overflow-x-auto border-b border-gray-200 dark:border-gray-800">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px shrink-0 ${
            active === t.id
              ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}

export function TagFilterBar({
  tags,
  selectedTags,
  negated,
  onToggleTag,
  onToggleNegate,
  onClearAll,
}: {
  tags: string[]
  selectedTags: Set<string>
  negated: boolean
  onToggleTag: (tag: string) => void
  onToggleNegate: () => void
  onClearAll: () => void
}) {
  if (tags.length === 0) return null
  const hasSelection = selectedTags.size > 0
  return (
    <div className="flex items-center gap-2 mb-6 flex-wrap">
      <span className="text-xs font-medium text-gray-400 dark:text-gray-500 shrink-0">
        View by tag:
      </span>
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={onClearAll}
          className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
            !hasSelection
              ? 'bg-indigo-600 border-indigo-600 text-white'
              : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500'
          }`}
        >
          All
        </button>
        {tags.map((tag) => (
          <button
            key={tag}
            onClick={() => onToggleTag(tag)}
            className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
              selectedTags.has(tag)
                ? 'bg-indigo-600 border-indigo-600 text-white'
                : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-indigo-300 dark:hover:border-indigo-700'
            }`}
          >
            {tag}
          </button>
        ))}
        <button
          onClick={onToggleNegate}
          disabled={!hasSelection}
          className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
            negated && hasSelection
              ? 'bg-indigo-600 border-indigo-600 text-white'
              : hasSelection
                ? 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-indigo-300 dark:hover:border-indigo-700'
                : 'border-gray-100 dark:border-gray-800 text-gray-300 dark:text-gray-700 cursor-not-allowed'
          }`}
        >
          ≠ Negate
        </button>
      </div>
    </div>
  )
}
