import { useEffect, useMemo, useRef, useState } from 'react'
import { PageHeader, SectionHeading } from '../components/layout'
import { useAppData } from '../context/AppDataContext'
import type { BudgetCategory } from '../lib/types'

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  return `${(bytes / 1024).toFixed(1)} KB`
}

function formatMonthKey(key: string): string {
  const [year, month] = key.split('-')
  const date = new Date(parseInt(year), parseInt(month) - 1)
  return date.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' })
}

const SECTIONS = ['income', 'fixed', 'variable', 'savings'] as const
const SECTION_LABELS: Record<string, string> = {
  income: 'Income',
  fixed: 'Fixed Expenses',
  variable: 'Variable Expenses',
  savings: 'Savings & Investments',
}

type PendingDelete = {
  id: string
  label: string
  budgetCount: number
  transactionCount: number
}

export default function Settings() {
  const { data, setStorageMode, storageUsage, condenseTransactions, removeCategory, reorderCategories } =
    useAppData()

  // ─── Condense ─────────────────────────────────────────────────────────────

  const monthKeys: string[] = []
  for (const [year, yearData] of Object.entries(data.budget.years)) {
    for (const month of Object.keys(yearData.months)) {
      monthKeys.push(`${year}-${month}`)
    }
  }
  monthKeys.sort()

  const [condenseMonth, setCondenseMonth] = useState('all')
  const [condenseDone, setCondenseDone] = useState(false)

  useEffect(() => {
    if (!condenseDone) return
    const id = setTimeout(() => setCondenseDone(false), 2500)
    return () => clearTimeout(id)
  }, [condenseDone])

  function handleCondense() {
    if (condenseMonth === 'all') {
      for (const key of monthKeys) {
        const [year, month] = key.split('-')
        condenseTransactions(year, month)
      }
    } else {
      const [year, month] = condenseMonth.split('-')
      condenseTransactions(year, month)
    }
    setCondenseDone(true)
  }

  const usagePct =
    storageUsage.totalBytes && storageUsage.totalBytes > 0
      ? Math.min((storageUsage.usedBytes / storageUsage.totalBytes) * 100, 100)
      : null

  // ─── Categories ───────────────────────────────────────────────────────────

  const sortedCats = useMemo(
    () => [...data.budget.categories].sort((a, b) => a.order - b.order),
    [data.budget.categories]
  )

  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null)
  const dragId = useRef<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)

  function countCategoryUsage(id: string) {
    let budgetCount = 0
    let transactionCount = 0
    for (const yearData of Object.values(data.budget.years)) {
      for (const month of Object.values(yearData.months)) {
        if (!month) continue
        if (month.budgeted[id]) budgetCount++
        transactionCount += month.transactions.filter((t) => t.categoryId === id).length
      }
    }
    return { budgetCount, transactionCount }
  }

  function handleDeleteClick(cat: BudgetCategory) {
    const { budgetCount, transactionCount } = countCategoryUsage(cat.id)
    setPendingDelete({ id: cat.id, label: cat.label, budgetCount, transactionCount })
  }

  function handleDrop(targetId: string, sectionCats: BudgetCategory[]) {
    const dragged = dragId.current
    setDragOverId(null)
    dragId.current = null
    if (!dragged || dragged === targetId) return
    const ids = sectionCats.map((c) => c.id)
    const fromIdx = ids.indexOf(dragged)
    const toIdx = ids.indexOf(targetId)
    if (fromIdx === -1 || toIdx === -1) return
    const newIds = [...ids]
    newIds.splice(fromIdx, 1)
    newIds.splice(toIdx, 0, dragged)
    reorderCategories(newIds)
  }

  function buildDeleteMessage({ budgetCount, transactionCount }: PendingDelete) {
    const parts: string[] = []
    if (budgetCount > 0) parts.push(`${budgetCount} budget month${budgetCount !== 1 ? 's' : ''}`)
    if (transactionCount > 0)
      parts.push(`${transactionCount} transaction${transactionCount !== 1 ? 's' : ''}`)
    if (parts.length === 0)
      return 'This category has no associated data and can be safely deleted.'
    return `This category is referenced in ${parts.join(' and ')}. The data will remain but the category will no longer appear.`
  }

  return (
    <div className="max-w-2xl">
      <PageHeader title="Settings" subtitle="Manage how your data is stored." />

      {/* Storage mode */}
      <div className="mb-8">
        <SectionHeading>Storage</SectionHeading>
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl divide-y divide-gray-100 dark:divide-gray-800">
          <div className="p-4">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-3">Storage mode</p>
            <div className="space-y-2">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="storageMode"
                  value="local"
                  checked={data.storageMode === 'local'}
                  onChange={() => setStorageMode('local')}
                  className="mt-0.5"
                />
                <div>
                  <p className="text-sm text-gray-700 dark:text-gray-300">Local browser storage</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    Data is saved in this browser only. Nothing leaves your device.
                  </p>
                </div>
              </label>
              <label className="flex items-start gap-3 cursor-not-allowed opacity-50">
                <input
                  type="radio"
                  name="storageMode"
                  value="account"
                  disabled
                  className="mt-0.5"
                />
                <div>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    Account sync
                    <span className="ml-2 text-xs bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 px-1.5 py-0.5 rounded">
                      Coming soon
                    </span>
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    Sync across devices with a free account.
                  </p>
                </div>
              </label>
            </div>
          </div>

          <div className="p-4">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Storage usage</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
              {formatBytes(storageUsage.usedBytes)} used
              {storageUsage.totalBytes ? ` of ${formatBytes(storageUsage.totalBytes)}` : ''}
            </p>
            {usagePct !== null && (
              <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    usagePct > 90
                      ? 'bg-red-500'
                      : usagePct > 70
                        ? 'bg-amber-500'
                        : 'bg-indigo-500'
                  }`}
                  style={{ width: `${usagePct}%` }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Budget Categories */}
      <div className="mb-8">
        <SectionHeading>Budget Categories</SectionHeading>
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
          Drag to reorder. Changes apply across all months.
        </p>
        <div className="space-y-4">
          {SECTIONS.map((section) => {
            const cats = sortedCats.filter((c) => c.section === section)
            return (
              <div key={section}>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                  {SECTION_LABELS[section]}
                </p>
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden divide-y divide-gray-100 dark:divide-gray-800">
                  {cats.length === 0 ? (
                    <p className="px-4 py-3 text-sm text-gray-400 dark:text-gray-600">
                      No categories
                    </p>
                  ) : (
                    cats.map((cat) => (
                      <div
                        key={cat.id}
                        draggable
                        onDragStart={() => { dragId.current = cat.id }}
                        onDragOver={(e) => { e.preventDefault(); setDragOverId(cat.id) }}
                        onDragLeave={() => setDragOverId((prev) => (prev === cat.id ? null : prev))}
                        onDrop={() => handleDrop(cat.id, cats)}
                        onDragEnd={() => { dragId.current = null; setDragOverId(null) }}
                        className={`flex items-center gap-3 px-4 py-2.5 select-none transition-colors ${
                          dragOverId === cat.id && dragId.current !== cat.id
                            ? 'bg-indigo-50 dark:bg-indigo-900/20'
                            : ''
                        }`}
                        style={{ opacity: dragId.current === cat.id ? 0.4 : 1 }}
                      >
                        {/* Drag handle */}
                        <svg
                          className="w-4 h-4 text-gray-300 dark:text-gray-700 cursor-grab shrink-0"
                          viewBox="0 0 16 16"
                          fill="currentColor"
                        >
                          <circle cx="5.5" cy="4" r="1.2" />
                          <circle cx="5.5" cy="8" r="1.2" />
                          <circle cx="5.5" cy="12" r="1.2" />
                          <circle cx="10.5" cy="4" r="1.2" />
                          <circle cx="10.5" cy="8" r="1.2" />
                          <circle cx="10.5" cy="12" r="1.2" />
                        </svg>

                        {/* Label */}
                        <span className="flex-1 text-sm text-gray-700 dark:text-gray-300 truncate">
                          {cat.label || (
                            <span className="text-gray-400 dark:text-gray-600 italic">Unnamed</span>
                          )}
                        </span>

                        {/* Delete */}
                        <button
                          onClick={() => handleDeleteClick(cat)}
                          className="shrink-0 text-gray-300 dark:text-gray-700 hover:text-red-400 dark:hover:text-red-500 transition-colors"
                          title="Delete category"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <line x1="3" y1="3" x2="13" y2="13" />
                            <line x1="13" y1="3" x2="3" y2="13" />
                          </svg>
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Data maintenance */}
      <div>
        <SectionHeading>Data</SectionHeading>
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
            Condense transactions
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
            Groups multiple transactions per category into one per month to reduce storage size.
            This cannot be undone.
          </p>
          <div className="flex items-center gap-3">
            <select
              value={condenseMonth}
              onChange={(e) => setCondenseMonth(e.target.value)}
              className="border border-gray-300 dark:border-gray-700 rounded px-2.5 py-1.5 text-sm bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-400 dark:focus:ring-gray-600"
            >
              <option value="all">All months</option>
              {monthKeys.map((key) => (
                <option key={key} value={key}>
                  {formatMonthKey(key)}
                </option>
              ))}
            </select>
            <button
              onClick={handleCondense}
              disabled={monthKeys.length === 0}
              className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Condense
            </button>
            {condenseDone && (
              <span className="text-xs text-green-600 dark:text-green-400">Done.</span>
            )}
          </div>
          {monthKeys.length === 0 && (
            <p className="text-xs text-gray-400 dark:text-gray-600 mt-3">No transaction data yet.</p>
          )}
        </div>
      </div>

      {/* Delete confirmation modal */}
      {pendingDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setPendingDelete(null)}
        >
          <div
            className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 max-w-sm w-full mx-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
              Delete &ldquo;{pendingDelete.label || 'Unnamed'}&rdquo;?
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-5 leading-relaxed">
              {buildDeleteMessage(pendingDelete)}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setPendingDelete(null)}
                className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  removeCategory(pendingDelete.id)
                  setPendingDelete(null)
                }}
                className="px-3 py-1.5 text-sm text-white bg-red-500 hover:bg-red-600 rounded transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
