import { useState } from 'react'
import type { BudgetCategory } from '../../lib/types'

type BulkActionBarProps = {
  selectedCount: number
  categories: BudgetCategory[]
  onApplyCategory: (categoryId: string) => void
  onApplyTags: (tags: string) => void
  onApplyMonth: (month: string) => void
  onClearSelection: () => void
  hasRules?: boolean
  onApplyRules?: () => void
}

const SECTIONS: BudgetCategory['section'][] = ['income', 'fixed', 'variable', 'savings']
const SECTION_LABELS: Record<BudgetCategory['section'], string> = {
  income: 'Income',
  fixed: 'Fixed',
  variable: 'Variable',
  savings: 'Savings',
}

const selectClass =
  'text-sm border border-gray-300 dark:border-gray-700 rounded px-2 py-1 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-400 dark:focus:ring-gray-600'

const inputClass =
  'border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 placeholder-gray-300 dark:placeholder-gray-700 focus:outline-none focus:ring-1 focus:ring-gray-400 dark:focus:ring-gray-600 px-2 py-1 text-sm'

export function BulkActionBar({
  selectedCount,
  categories,
  onApplyCategory,
  onApplyTags,
  onApplyMonth,
  onClearSelection,
  hasRules,
  onApplyRules,
}: BulkActionBarProps) {
  const [bulkCategory, setBulkCategory] = useState('')
  const [bulkTags, setBulkTags] = useState('')
  const [bulkMonth, setBulkMonth] = useState('')

  function handleApply() {
    if (bulkCategory) onApplyCategory(bulkCategory)
    if (bulkTags) onApplyTags(bulkTags)
    if (bulkMonth) onApplyMonth(bulkMonth)
  }

  const canApply = !!(bulkCategory || bulkTags || bulkMonth)

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 flex flex-wrap items-center gap-3">
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300 shrink-0">
        {selectedCount} row{selectedCount !== 1 ? 's' : ''} selected
      </span>

      <div className="flex flex-wrap items-center gap-2 flex-1">
        <select
          value={bulkCategory}
          onChange={(e) => setBulkCategory(e.target.value)}
          className={selectClass}
        >
          <option value="">Category…</option>
          {SECTIONS.map((section) => {
            const cats = categories.filter((c) => c.section === section)
            if (cats.length === 0) return null
            return (
              <optgroup key={section} label={SECTION_LABELS[section]}>
                {cats
                  .sort((a, b) => a.order - b.order)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label || '(unnamed)'}
                    </option>
                  ))}
              </optgroup>
            )
          })}
        </select>

        <input
          type="text"
          value={bulkTags}
          onChange={(e) => setBulkTags(e.target.value)}
          placeholder="Tags…"
          className={`${inputClass} w-28`}
        />

        <input
          type="month"
          value={bulkMonth}
          onChange={(e) => setBulkMonth(e.target.value)}
          className={inputClass}
        />

        {hasRules && onApplyRules && (
          <button
            onClick={onApplyRules}
            className="text-xs text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 rounded px-2.5 py-1 transition-colors hover:bg-indigo-50 dark:hover:bg-indigo-950/30"
          >
            Apply rules
          </button>
        )}

        <button
          onClick={handleApply}
          disabled={!canApply}
          className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 border border-gray-200 dark:border-gray-700 rounded px-2.5 py-1 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Apply to {selectedCount}
        </button>
      </div>

      <button
        onClick={onClearSelection}
        className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors shrink-0"
      >
        Clear selection
      </button>
    </div>
  )
}
