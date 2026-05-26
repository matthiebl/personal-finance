import { useMemo } from 'react'
import type { BudgetCategory, ImportRow, ImportRule } from '../../lib/types'
import type { TxSuggestion } from '../inputs'
import { CurrencyInput, DescriptionAutocomplete, TextInput } from '../inputs'
import { BulkActionBar } from './BulkActionBar'

type EnrichedDataTabProps = {
  rows: ImportRow[]
  categories: BudgetCategory[]
  suggestions: TxSuggestion[]
  searchQuery: string
  onSearchChange: (q: string) => void
  onRowChange: (id: string, patch: Partial<ImportRow>) => void
  onToggleSelected: (id: string) => void
  onToggleSelectAll: () => void
  selectedCount: number
  rules?: ImportRule[]
  appliedRuleIds?: Record<string, string>
  onApplyRulesToSelected?: () => void
}

const SECTIONS: BudgetCategory['section'][] = ['income', 'fixed', 'variable', 'savings']
const SECTION_LABELS: Record<BudgetCategory['section'], string> = {
  income: 'Income',
  fixed: 'Fixed',
  variable: 'Variable',
  savings: 'Savings',
}

const selectClass =
  'w-full text-sm border border-gray-300 dark:border-gray-700 rounded px-2 py-1 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-400 dark:focus:ring-gray-600'

export function EnrichedDataTab({
  rows,
  categories,
  suggestions,
  searchQuery,
  onSearchChange,
  onRowChange,
  onToggleSelected,
  onToggleSelectAll,
  selectedCount,
  rules,
  appliedRuleIds,
  onApplyRulesToSelected,
}: EnrichedDataTabProps) {
  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return rows
    const q = searchQuery.toLowerCase()
    return rows.filter(
      (r) =>
        r.description.toLowerCase().includes(q) ||
        r.tags.toLowerCase().includes(q) ||
        r.amount.includes(q)
    )
  }, [rows, searchQuery])

  const allVisibleSelected = filteredRows.length > 0 && filteredRows.every((r) => r.selected)

  if (rows.length === 0) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400 py-8 text-center">
        No rows remaining.
      </p>
    )
  }

  const bulkActionBar =
    selectedCount > 0 ? (
      <BulkActionBar
        selectedCount={selectedCount}
        categories={categories}
        onApplyCategory={(categoryId) => {
          rows.filter((r) => r.selected).forEach((r) => onRowChange(r.id, { categoryId }))
        }}
        onApplyTags={(tags) => {
          rows.filter((r) => r.selected).forEach((r) => onRowChange(r.id, { tags }))
        }}
        onApplyMonth={(monthOverride) => {
          rows.filter((r) => r.selected).forEach((r) => onRowChange(r.id, { monthOverride }))
        }}
        onClearSelection={() => {
          rows.filter((r) => r.selected).forEach((r) => onRowChange(r.id, { selected: false }))
        }}
        hasRules={(rules?.length ?? 0) > 0}
        onApplyRules={onApplyRulesToSelected}
      />
    ) : null

  return (
    <div className="space-y-3">
      {/* Bulk action bar — shown above everything when rows are selected */}
      {bulkActionBar}

      {/* Search bar */}
      <div className="flex items-center gap-3">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search description, tags, amount…"
          className="w-full max-w-sm border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 placeholder-gray-300 dark:placeholder-gray-700 focus:outline-none focus:ring-1 focus:ring-gray-400 dark:focus:ring-gray-600 px-2.5 py-1.5 text-sm"
        />
        {searchQuery && (
          <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">
            {filteredRows.length} of {rows.length} rows
          </span>
        )}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-x-auto">
        <table className="w-full min-w-max text-sm border-collapse">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-800">
              <th className="w-10 py-2 pl-1.5">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={onToggleSelectAll}
                  className="rounded border-gray-300 dark:border-gray-700 text-indigo-600 focus:ring-indigo-500"
                />
              </th>
              <th className="w-6 py-2 px-1" />
              <th className="text-left py-2 px-3 font-medium text-gray-500 dark:text-gray-400">
                Description
              </th>
              <th className="text-right py-2 px-3 font-medium text-gray-500 dark:text-gray-400 w-36">
                Amount
              </th>
              <th className="text-left py-2 px-3 font-medium text-gray-500 dark:text-gray-400 w-52">
                Category
              </th>
              <th className="text-left py-2 px-3 font-medium text-gray-500 dark:text-gray-400 w-40">
                Tags
              </th>
              <th className="text-left py-2 pl-3 pr-4 font-medium text-gray-500 dark:text-gray-400 w-40">
                Month
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row) => {
              const missingMonth = !row.monthOverride && !row.parsedDate
              const monthValue =
                row.monthOverride ?? (row.parsedDate ? row.parsedDate.slice(0, 7) : '')
              const matchedRuleId = appliedRuleIds?.[row.id]
              const matchedRule = matchedRuleId
                ? rules?.find((r) => r.id === matchedRuleId)
                : undefined
              return (
                <tr
                  key={row.id}
                  className={
                    row.selected
                      ? 'border-b border-gray-100 dark:border-gray-800/60 bg-indigo-50/60 dark:bg-indigo-900/20'
                      : 'border-b border-gray-100 dark:border-gray-800/60 even:bg-gray-50/50 dark:even:bg-gray-900/30'
                  }
                >
                  <td className="py-1.5 pl-4">
                    <input
                      type="checkbox"
                      checked={row.selected}
                      onChange={() => onToggleSelected(row.id)}
                      className="rounded border-gray-300 dark:border-gray-700 text-indigo-600 focus:ring-indigo-500"
                    />
                  </td>
                  <td className="py-1.5 px-1 w-6">
                    {matchedRule && (
                      <div className="relative group/rule flex justify-center">
                        {/* Wand with sparkle icon */}
                        <svg
                          className="w-3.5 h-3.5 text-violet-500 dark:text-violet-400 cursor-default"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.75"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M15 4V2" />
                          <path d="M15 16v-2" />
                          <path d="M8 9h2" />
                          <path d="M20 9h2" />
                          <path d="M17.8 11.8L19 13" />
                          <path d="M15 9h.01" />
                          <path d="M17.8 6.2L19 5" />
                          <path d="M13 7.2L11.8 6" />
                          <path d="M3 21l9-9" />
                        </svg>
                        {/* Tooltip */}
                        <div className="absolute left-5 top-1/2 -translate-y-1/2 z-50 hidden group-hover/rule:block w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg pointer-events-none">
                          <div className="flex items-center gap-1.5 px-3 py-2 border-b border-gray-100 dark:border-gray-700">
                            <svg
                              className="w-3 h-3 text-violet-500 dark:text-violet-400 shrink-0"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.75"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M15 4V2M15 16v-2M8 9h2M20 9h2M17.8 11.8L19 13M15 9h.01M17.8 6.2L19 5M13 7.2L11.8 6M3 21l9-9" />
                            </svg>
                            <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">
                              Rule applied
                            </span>
                          </div>
                          <div className="px-3 py-2 space-y-1.5">
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {matchedRule.matchValue ? (
                                <>
                                  {matchedRule.matchType === 'contains' && 'Contains '}
                                  {matchedRule.matchType === 'exact' && 'Exactly '}
                                  {matchedRule.matchType === 'starts_with' && 'Starts with '}
                                  <code className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-1 py-0.5 rounded text-[10px]">
                                    {matchedRule.matchValue}
                                  </code>
                                </>
                              ) : (
                                <span className="italic">Any description</span>
                              )}
                            </p>
                            {matchedRule.categoryId && (
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                Category set
                              </p>
                            )}
                            {matchedRule.tags && (
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                Tags:{' '}
                                <span className="text-gray-700 dark:text-gray-200">
                                  {matchedRule.tags}
                                </span>
                              </p>
                            )}
                            {matchedRule.renameTo && (
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                Renamed to:{' '}
                                <span className="text-gray-700 dark:text-gray-200">
                                  {matchedRule.renameTo}
                                </span>
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </td>
                  <td className="py-1.5 px-3">
                    <DescriptionAutocomplete
                      compact
                      portal
                      value={row.description}
                      onChange={(v) => onRowChange(row.id, { description: v })}
                      onSelect={(description, categoryId, tags) =>
                        onRowChange(row.id, { description, categoryId, tags })
                      }
                      suggestions={suggestions}
                    />
                  </td>
                  <td className="py-1.5 px-3">
                    <CurrencyInput
                      compact
                      value={row.amount}
                      onChange={(v) => onRowChange(row.id, { amount: v })}
                    />
                  </td>
                  <td className="py-1.5 px-3">
                    <select
                      value={row.categoryId}
                      onChange={(e) => onRowChange(row.id, { categoryId: e.target.value })}
                      className={selectClass}
                    >
                      <option value="">— Category —</option>
                      {SECTIONS.map((section) => {
                        const cats = categories.filter((c) => c.section === section)
                        if (cats.length === 0) return null
                        return (
                          <optgroup key={section} label={SECTION_LABELS[section]}>
                            {cats
                              .sort((a, b) => a.order - b.order)
                              .filter((c) => c.label.trim())
                              .map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.label}
                                </option>
                              ))}
                          </optgroup>
                        )
                      })}
                    </select>
                  </td>
                  <td className="py-1.5 px-3">
                    <TextInput
                      compact
                      value={row.tags}
                      onChange={(v) => onRowChange(row.id, { tags: v })}
                      placeholder="tag1 tag2"
                    />
                  </td>
                  <td className="py-1.5 pl-3 pr-4">
                    <input
                      type="month"
                      value={monthValue}
                      onChange={(e) =>
                        onRowChange(row.id, { monthOverride: e.target.value || null })
                      }
                      className={`w-full border rounded px-2 py-1 text-sm bg-white dark:bg-gray-900 focus:outline-none focus:ring-1 ${
                        missingMonth
                          ? 'border-amber-300 dark:border-amber-600 text-amber-800 dark:text-amber-200 focus:ring-amber-400 dark:focus:ring-amber-600'
                          : 'border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 focus:ring-gray-400 dark:focus:ring-gray-600'
                      }`}
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
