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
      <div className={actions ? 'flex items-end justify-between' : ''}>
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
