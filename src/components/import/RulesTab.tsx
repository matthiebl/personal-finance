import { useRef, useState } from 'react'
import { DescriptionAutocomplete } from '../inputs'
import type { TxSuggestion } from '../inputs'
import type { BudgetCategory, ImportRule, RuleMatchType } from '../../lib/types'

type RulesTabProps = {
  rules: ImportRule[]
  categories: BudgetCategory[]
  suggestions: TxSuggestion[]
  loading: boolean
  onAdd: (draft: Omit<ImportRule, 'id' | 'familyId' | 'createdAt'>) => Promise<void>
  onUpdate: (
    id: string,
    patch: Partial<Omit<ImportRule, 'id' | 'familyId' | 'createdAt'>>
  ) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

const SECTIONS: BudgetCategory['section'][] = ['income', 'fixed', 'variable', 'savings']
const SECTION_LABELS: Record<BudgetCategory['section'], string> = {
  income: 'Income',
  fixed: 'Fixed',
  variable: 'Variable',
  savings: 'Savings',
}

const MATCH_TYPE_LABELS: Record<RuleMatchType, string> = {
  contains: 'Contains',
  exact: 'Exact',
  starts_with: 'Starts with',
  regex: 'Regex',
}

const inputClass =
  'w-full border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-gray-400 dark:focus:ring-gray-600 px-2 py-1 text-sm'

const selectClass =
  'w-full text-sm border border-gray-300 dark:border-gray-700 rounded px-2 py-1 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-400 dark:focus:ring-gray-600'

function RuleRow({
  rule,
  categories,
  suggestions,
  onUpdate,
  onDelete,
}: {
  rule: ImportRule
  categories: BudgetCategory[]
  suggestions: TxSuggestion[]
  onUpdate: (patch: Partial<Omit<ImportRule, 'id' | 'familyId' | 'createdAt'>>) => void
  onDelete: () => void
}) {
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Local state so keystrokes register immediately without waiting for debounce
  const [localMatchValue, setLocalMatchValue] = useState(rule.matchValue)

  function scheduleUpdate(patch: Partial<Omit<ImportRule, 'id' | 'familyId' | 'createdAt'>>) {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      onUpdate(patch)
    }, 300)
  }

  return (
    <tr className="border-b border-gray-100 dark:border-gray-800/60 group">
      {/* Priority */}
      <td className="py-2 pl-4 pr-2 w-16">
        <input
          type="number"
          defaultValue={rule.priority}
          onBlur={(e) => {
            const v = parseInt(e.target.value)
            if (!isNaN(v)) scheduleUpdate({ priority: v })
          }}
          className={`${inputClass} text-center`}
        />
      </td>

      {/* Match type */}
      <td className="py-2 px-2 w-32">
        <select
          value={rule.matchType}
          onChange={(e) => {
            const v = e.target.value as RuleMatchType
            onUpdate({ matchType: v })
          }}
          className={selectClass}
        >
          {(Object.keys(MATCH_TYPE_LABELS) as RuleMatchType[]).map((t) => (
            <option key={t} value={t}>
              {MATCH_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
      </td>

      {/* Match value */}
      <td className="py-2 px-2">
        <DescriptionAutocomplete
          compact
          portal
          value={localMatchValue}
          suggestions={suggestions}
          onChange={(v) => {
            setLocalMatchValue(v)
            scheduleUpdate({ matchValue: v })
          }}
          onSelect={(description, categoryId, tags) => {
            setLocalMatchValue(description)
            const patch: Partial<Omit<ImportRule, 'id' | 'familyId' | 'createdAt'>> = {
              matchValue: description,
            }
            if (!rule.categoryId) patch.categoryId = categoryId
            if (!rule.tags) patch.tags = tags
            onUpdate(patch)
          }}
        />
      </td>

      {/* Amount range */}
      <td className="py-2 px-2 w-40">
        <div className="flex items-center gap-1">
          <input
            type="text"
            inputMode="decimal"
            defaultValue={rule.amountMin ?? ''}
            onBlur={(e) => {
              const raw = e.target.value.trim()
              scheduleUpdate({ amountMin: raw || null })
            }}
            placeholder="Min"
            className={`${inputClass} w-full`}
          />
          <span className="text-gray-400 dark:text-gray-600 text-xs shrink-0">–</span>
          <input
            type="text"
            inputMode="decimal"
            defaultValue={rule.amountMax ?? ''}
            onBlur={(e) => {
              const raw = e.target.value.trim()
              scheduleUpdate({ amountMax: raw || null })
            }}
            placeholder="Max"
            className={`${inputClass} w-full`}
          />
        </div>
      </td>

      {/* Category */}
      <td className="py-2 px-2 w-44">
        <select
          value={rule.categoryId}
          onChange={(e) => onUpdate({ categoryId: e.target.value })}
          className={selectClass}
        >
          <option value="">— Category —</option>
          {SECTIONS.map((section) => {
            const cats = categories.filter((c) => c.section === section && c.label.trim())
            if (cats.length === 0) return null
            return (
              <optgroup key={section} label={SECTION_LABELS[section]}>
                {cats
                  .sort((a, b) => a.order - b.order)
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

      {/* Tags */}
      <td className="py-2 px-2 w-32">
        <input
          type="text"
          defaultValue={rule.tags}
          onBlur={(e) => scheduleUpdate({ tags: e.target.value })}
          placeholder="tag1 tag2"
          className={inputClass}
        />
      </td>

      {/* Rename to */}
      <td className="py-2 px-2 w-40">
        <input
          type="text"
          defaultValue={rule.renameTo}
          onBlur={(e) => scheduleUpdate({ renameTo: e.target.value })}
          placeholder="Rename to…"
          className={inputClass}
        />
      </td>

      {/* Delete */}
      <td className="py-2 pl-2 pr-4 w-10">
        <button
          onClick={onDelete}
          className="text-gray-300 dark:text-gray-700 hover:text-red-500 dark:hover:text-red-400 transition-colors"
          title="Delete rule"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </button>
      </td>
    </tr>
  )
}

export function RulesTab({
  rules,
  categories,
  suggestions,
  loading,
  onAdd,
  onUpdate,
  onDelete,
}: RulesTabProps) {
  const [adding, setAdding] = useState(false)

  async function handleAdd() {
    setAdding(true)
    const nextPriority = rules.length > 0 ? Math.max(...rules.map((r) => r.priority)) + 10 : 0
    await onAdd({
      priority: nextPriority,
      matchType: 'contains',
      matchValue: '',
      amountMin: null,
      amountMax: null,
      categoryId: '',
      tags: '',
      renameTo: '',
    })
    setAdding(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <svg className="animate-spin h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24">
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
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xl">
          Rules auto-fill category and tags when importing transactions. Applied in priority order
          (lower number = higher priority); first match wins.
        </p>
        <button
          onClick={handleAdd}
          disabled={adding}
          className="shrink-0 px-3 py-1.5 rounded-md bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-40 transition-colors"
        >
          Add rule
        </button>
      </div>

      {rules.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl py-12 text-center">
          <p className="text-sm text-gray-400 dark:text-gray-500">
            No rules yet — add one to auto-categorize transactions during import.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-x-auto">
          <table className="w-full min-w-max text-sm border-collapse">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800">
                <th className="text-left py-2 pl-4 pr-2 font-medium text-gray-500 dark:text-gray-400 w-16">
                  Priority
                </th>
                <th className="text-left py-2 px-2 font-medium text-gray-500 dark:text-gray-400 w-32">
                  Match type
                </th>
                <th className="text-left py-2 px-2 font-medium text-gray-500 dark:text-gray-400">
                  Match value
                </th>
                <th className="text-left py-2 px-2 font-medium text-gray-500 dark:text-gray-400 w-40">
                  Amount range
                </th>
                <th className="text-left py-2 px-2 font-medium text-gray-500 dark:text-gray-400 w-44">
                  Category
                </th>
                <th className="text-left py-2 px-2 font-medium text-gray-500 dark:text-gray-400 w-32">
                  Tags
                </th>
                <th className="text-left py-2 px-2 font-medium text-gray-500 dark:text-gray-400 w-40">
                  Rename to
                </th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {rules.map((rule) => (
                <RuleRow
                  key={rule.id}
                  rule={rule}
                  categories={categories}
                  suggestions={suggestions}
                  onUpdate={(patch) => onUpdate(rule.id, patch)}
                  onDelete={() => onDelete(rule.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
