import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { CashFlowSankeyChart, DonutChart, ExpandableChart } from '../components/charts'
import { HeroStats } from '../components/hero'
import type { TxSuggestion } from '../components/inputs'
import { CurrencyInput, DescriptionAutocomplete, TextInput } from '../components/inputs'
import { MonthSelector, PageHeader, SectionHeading, YearSelector } from '../components/layout'
import { useAppData } from '../context/useAppData'
import { useAuth } from '../context/useAuth'
import { fmt, fmtAxis, fmtCents } from '../lib/finance'
import type { BudgetCategory, ExpenseType, Transaction } from '../lib/types'

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

// Local display type — combines BudgetCategory with per-month budgeted amount
type BudgetRow = {
  id: string
  label: string
  budgeted: string
  expenseType?: ExpenseType
}

const TYPE_STYLES: Record<ExpenseType, string> = {
  need: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800',
  want: 'bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-800',
  debt: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800',
}

// Stable empty budget month — avoids new object reference every render for missing months
const EMPTY_MONTH = Object.freeze({
  budgeted: {} as Record<string, string>,
  transactions: [] as Transaction[],
})

// ─── TypeBadge ───────────────────────────────────────────────────────────────

function TypeBadge({
  value,
  onChange,
}: {
  value: ExpenseType
  onChange: (v: ExpenseType) => void
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as ExpenseType)}
      className={`text-xs px-1.5 py-0.5 rounded border font-medium focus:outline-none cursor-pointer ${TYPE_STYLES[value]}`}
    >
      <option value="need">need</option>
      <option value="want">want</option>
      <option value="debt">debt</option>
    </select>
  )
}

// ─── BudgetTable ─────────────────────────────────────────────────────────────

function BudgetTable({
  title,
  rows,
  actuals,
  hasType,
  isIncome,
  onUpdate,
  onAdd,
}: {
  title: string
  rows: BudgetRow[]
  actuals: Record<string, number>
  hasType: boolean
  isIncome?: boolean
  onUpdate: (id: string, field: string, value: string) => void
  onAdd: () => void
}) {
  const totalBudgeted = rows.reduce((s, r) => s + (parseFloat(r.budgeted) || 0), 0)
  const totalActual = rows.reduce((s, r) => s + (actuals[r.id] ?? 0), 0)
  const totalDiff = isIncome ? totalActual - totalBudgeted : totalBudgeted - totalActual
  const hasTotals = totalBudgeted > 0 || totalActual > 0
  const spanCols = hasType ? 5 : 4

  return (
    <div>
      <SectionHeading>{title}</SectionHeading>
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-x-auto">
        <table className="w-full min-w-max text-sm border-collapse">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-800">
              <th className="text-left py-2 pl-4 pr-2 font-medium text-gray-500 dark:text-gray-400">
                Category
              </th>
              {hasType && (
                <th className="py-2 px-2 font-medium text-gray-500 dark:text-gray-400 w-16 text-center">
                  Type
                </th>
              )}
              <th className="text-right py-2 px-2 font-medium text-gray-500 dark:text-gray-400 w-32">
                Budgeted
              </th>
              <th className="text-right py-2 px-2 font-medium text-gray-500 dark:text-gray-400 w-24">
                Actual
              </th>
              <th className="text-right py-2 pl-2 pr-4 font-medium text-gray-500 dark:text-gray-400 w-24">
                Diff
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const actual = actuals[row.id] ?? 0
              const budgeted = parseFloat(row.budgeted) || 0
              const diff = isIncome ? actual - budgeted : budgeted - actual
              const hasValues = budgeted > 0 || actual > 0
              const diffColor = hasValues
                ? diff >= 0
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-500 dark:text-red-400'
                : 'text-gray-300 dark:text-gray-700'

              return (
                <tr
                  key={row.id}
                  className="border-b border-gray-100 dark:border-gray-800/60 even:bg-gray-50/50 dark:even:bg-gray-900/30"
                >
                  <td className="py-1.5 pl-4 pr-2">
                    <TextInput
                      compact
                      value={row.label}
                      onChange={(v) => onUpdate(row.id, 'label', v)}
                      placeholder="Category name"
                    />
                  </td>
                  {hasType && (
                    <td className="py-1.5 px-2 text-center">
                      <TypeBadge
                        value={(row.expenseType ?? 'need') as ExpenseType}
                        onChange={(v) => onUpdate(row.id, 'expenseType', v)}
                      />
                    </td>
                  )}
                  <td className="py-1.5 px-2">
                    <CurrencyInput
                      compact
                      value={row.budgeted}
                      onChange={(v) => onUpdate(row.id, 'budgeted', v)}
                    />
                  </td>
                  <td className="py-1.5 px-2 text-right tabular-nums text-gray-600 dark:text-gray-400">
                    {actual > 0 ? (
                      fmtCents(actual)
                    ) : (
                      <span className="text-gray-300 dark:text-gray-700">$—</span>
                    )}
                  </td>
                  <td className={`py-1.5 pl-2 pr-4 text-right tabular-nums ${diffColor}`}>
                    {hasValues ? fmtCents(diff) : '$—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800/50 font-semibold">
              <td className="py-2 pl-4 pr-2 text-gray-700 dark:text-gray-200">Total</td>
              {hasType && <td />}
              <td className="py-2 px-2 text-right tabular-nums text-gray-500 dark:text-gray-400">
                {totalBudgeted > 0 ? fmtCents(totalBudgeted) : '$—'}
              </td>
              <td className="py-2 px-2 text-right tabular-nums text-gray-700 dark:text-gray-200">
                {totalActual > 0 ? fmtCents(totalActual) : '$—'}
              </td>
              <td
                className={`py-2 pl-2 pr-4 text-right tabular-nums ${
                  hasTotals
                    ? totalDiff >= 0
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-500 dark:text-red-400'
                    : 'text-gray-700 dark:text-gray-200'
                }`}
              >
                {hasTotals ? fmtCents(totalDiff) : '$—'}
              </td>
            </tr>
            <tr className="bg-white dark:bg-gray-900">
              <td colSpan={spanCols} className="px-4 py-2">
                <button
                  onClick={onAdd}
                  className="text-xs text-gray-400 dark:text-gray-600 hover:text-gray-700 dark:hover:text-gray-400 transition-colors flex items-center gap-1.5"
                >
                  <span className="text-sm font-medium leading-none">+</span> Add row
                </button>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

// ─── TransactionTable ────────────────────────────────────────────────────────

function TransactionTable({
  transactions,
  sections,
  suggestions,
  importHref,
  onUpdate,
  onApplySuggestion,
  onAdd,
  onRemove,
  onCondense,
}: {
  transactions: Transaction[]
  sections: { label: string; rows: BudgetRow[] }[]
  suggestions: TxSuggestion[]
  importHref: string | null
  onUpdate: (id: string, field: keyof Transaction, value: string) => void
  onApplySuggestion: (
    id: string,
    patch: { description: string; categoryId: string; tags: string }
  ) => void
  onAdd: () => void
  onRemove: (id: string) => void
  onCondense: () => void
}) {
  const incomeCatIds = new Set(
    sections.find((s) => s.label === 'Income')?.rows.map((r) => r.id) ?? []
  )
  const incomeTotal = transactions
    .filter((t) => incomeCatIds.has(t.categoryId))
    .reduce((s, t) => s + (parseFloat(t.amount) || 0), 0)
  const expensesTotal = transactions
    .filter((t) => !incomeCatIds.has(t.categoryId))
    .reduce((s, t) => s + (parseFloat(t.amount) || 0), 0)

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
          Transactions
        </p>
        <div className="flex items-center gap-1.5">
          {importHref && (
            <Link
              to={importHref}
              className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 border border-gray-200 dark:border-gray-700 rounded px-2.5 py-1 transition-colors"
            >
              Import
            </Link>
          )}
          <button
            onClick={onCondense}
            className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 border border-gray-200 dark:border-gray-700 rounded px-2.5 py-1 transition-colors"
          >
            Condense
          </button>
          <div className="relative group">
            <svg
              className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600 cursor-default"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="8" cy="8" r="6.5" />
              <line x1="8" y1="7" x2="8" y2="11" />
              <circle cx="8" cy="5" r="0.5" fill="currentColor" stroke="none" />
            </svg>
            <div className="absolute right-0 top-full mt-1.5 w-56 z-20 invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-opacity duration-150">
              <div className="bg-gray-800 dark:bg-gray-700 text-gray-100 text-xs rounded-lg px-3 py-2 shadow-lg leading-relaxed">
                Merges transactions with the same category, description, and tags into one entry.
                Groups that net to zero are removed. This cannot be undone.
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-x-auto">
        <table className="w-full min-w-max text-sm border-collapse">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-800">
              <th className="text-left py-2 pl-4 pr-3 font-medium text-gray-500 dark:text-gray-400">
                Description
              </th>
              <th className="text-right py-2 px-3 font-medium text-gray-500 dark:text-gray-400 w-36">
                Amount
              </th>
              <th className="text-left py-2 px-3 font-medium text-gray-500 dark:text-gray-400 w-56">
                Category
              </th>
              <th className="text-left py-2 px-3 font-medium text-gray-500 dark:text-gray-400 w-44">
                Tags
              </th>
              <th className="w-7 py-2" />
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx) => (
              <tr
                key={tx.id}
                className="border-b border-gray-100 dark:border-gray-800/60 even:bg-gray-50/50 dark:even:bg-gray-900/30"
              >
                <td className="py-1.5 pl-4 pr-3">
                  <DescriptionAutocomplete
                    compact
                    value={tx.description}
                    onChange={(v) => onUpdate(tx.id, 'description', v)}
                    onSelect={(description, categoryId, tags) =>
                      onApplySuggestion(tx.id, { description, categoryId, tags })
                    }
                    suggestions={suggestions}
                  />
                </td>
                <td className="py-1.5 px-3">
                  <CurrencyInput
                    compact
                    value={tx.amount}
                    onChange={(v) => onUpdate(tx.id, 'amount', v)}
                  />
                </td>
                <td className="py-1.5 px-3">
                  <select
                    value={tx.categoryId}
                    onChange={(e) => onUpdate(tx.id, 'categoryId', e.target.value)}
                    className="w-full text-sm border border-gray-300 dark:border-gray-700 rounded px-2 py-1 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-400 dark:focus:ring-gray-600"
                  >
                    <option value="">— Category —</option>
                    {sections.map(({ label, rows }) => (
                      <optgroup key={label} label={label}>
                        {rows
                          .filter((r) => r.label.trim())
                          .map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.label}
                            </option>
                          ))}
                      </optgroup>
                    ))}
                  </select>
                </td>
                <td className="py-1.5 px-3">
                  <TextInput
                    compact
                    value={tx.tags ?? ''}
                    onChange={(v) => onUpdate(tx.id, 'tags', v)}
                    placeholder="tag1 tag2"
                  />
                </td>
                <td className="py-1.5 pr-1">
                  <button
                    onClick={() => onRemove(tx.id)}
                    className="w-6 h-6 flex items-center justify-center rounded text-gray-300 dark:text-gray-700 hover:text-red-400 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-base leading-none"
                  >
                    ×
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800/50 font-semibold">
              <td className="py-2 pl-4 pr-3 text-gray-500 dark:text-gray-400 font-medium">
                Income
              </td>
              <td className="py-2 px-3 text-right tabular-nums text-green-600 dark:text-green-400">
                {incomeTotal !== 0 ? fmtCents(incomeTotal) : '$—'}
              </td>
              <td colSpan={3} />
            </tr>
            <tr className="bg-gray-100 dark:bg-gray-800/50 font-semibold">
              <td className="py-2 pl-4 pr-3 text-gray-500 dark:text-gray-400 font-medium">
                Expenses
              </td>
              <td className="py-2 px-3 text-right tabular-nums text-gray-700 dark:text-gray-200">
                {expensesTotal !== 0 ? fmtCents(expensesTotal) : '$—'}
              </td>
              <td colSpan={3} />
            </tr>
            <tr className="bg-white dark:bg-gray-900">
              <td colSpan={5} className="px-4 py-2">
                <button
                  onClick={onAdd}
                  className="text-xs text-gray-400 dark:text-gray-600 hover:text-gray-700 dark:hover:text-gray-400 transition-colors flex items-center gap-1.5"
                >
                  <span className="text-sm font-medium leading-none">+</span> Add transaction
                </button>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

// ─── Budget vs Actual Chart ───────────────────────────────────────────────────

type BvAPayload = { name: string; value: number; fill: string }

function BvATooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: BvAPayload[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 shadow-md text-xs">
      <p className="font-medium text-gray-700 dark:text-gray-200 mb-1.5">{label}</p>
      {payload
        .filter((p) => p.value > 0)
        .map((p) => (
          <div key={p.name} className="flex items-center justify-between gap-4 mb-0.5">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: p.fill }} />
              <span className="text-gray-500 dark:text-gray-400">{p.name}</span>
            </div>
            <span className="tabular-nums text-gray-700 dark:text-gray-200">{fmt(p.value)}</span>
          </div>
        ))}
    </div>
  )
}

function BudgetComparisonChart({
  data,
}: {
  data: { name: string; budgeted: number; actual: number }[]
}) {
  const hasData = data.some((d) => d.budgeted > 0 || d.actual > 0)
  if (!hasData) {
    return (
      <div className="flex items-center justify-center" style={{ height: 200 }}>
        <p className="text-xs text-gray-400 dark:text-gray-600">
          Enter budgeted amounts or transactions to see comparison
        </p>
      </div>
    )
  }
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart
        data={data}
        margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
        barCategoryGap="28%"
        barGap={3}
      >
        <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 11, fill: '#9ca3af' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={fmtAxis}
          tick={{ fontSize: 10, fill: '#9ca3af' }}
          axisLine={false}
          tickLine={false}
          width={48}
        />
        <Tooltip content={<BvATooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
        <Bar dataKey="budgeted" fill="#6366f1" radius={[3, 3, 0, 0]} name="Budgeted" />
        <Bar dataKey="actual" fill="#10b981" radius={[3, 3, 0, 0]} name="Actual" />
      </BarChart>
    </ResponsiveContainer>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toRows(cats: BudgetCategory[], budgeted: Record<string, string>): BudgetRow[] {
  return cats.map((c) => ({
    id: c.id,
    label: c.label,
    budgeted: budgeted[c.id] ?? '',
    expenseType: c.expenseType,
  }))
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function MonthlyData() {
  const { user, family } = useAuth()
  const {
    data,
    updateCategory,
    addCategory,
    updateBudgeted,
    addTransaction,
    updateTransaction,
    removeTransaction,
    condenseTransactions,
  } = useAppData()

  const now = new Date()
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedYear = searchParams.get('year') ?? String(prevMonth.getFullYear())
  const monthParam = searchParams.get('month')?.toLowerCase()
  const monthParamIdx = MONTHS.findIndex((m) => m.slice(0, 3).toLowerCase() === monthParam)
  const selectedMonthIdx = monthParamIdx !== -1 ? monthParamIdx : prevMonth.getMonth()
  const monthStr = String(selectedMonthIdx + 1).padStart(2, '0')
  const importHref =
    user && family
      ? (() => {
          const lastDay = new Date(parseInt(selectedYear), selectedMonthIdx + 1, 0).getDate()
          const since = `${selectedYear}-${monthStr}-01`
          const until = `${selectedYear}-${monthStr}-${String(lastDay).padStart(2, '0')}`
          return `/import?since=${since}&until=${until}`
        })()
      : null

  function setYear(delta: number) {
    setSearchParams(
      (p) => {
        p.set('year', String(parseInt(selectedYear) + delta))
        return p
      },
      { replace: true }
    )
  }
  function setMonthIdx(i: number) {
    setSearchParams(
      (p) => {
        p.set('month', MONTHS[i].slice(0, 3).toLowerCase())
        return p
      },
      { replace: true }
    )
  }

  const budgetMonth = data.budget.years[selectedYear]?.months[monthStr] ?? EMPTY_MONTH

  // Sort categories by order
  const sortedCats = useMemo(
    () => [...data.budget.categories].sort((a, b) => a.order - b.order),
    [data.budget.categories]
  )

  const incomeCats = useMemo(() => sortedCats.filter((c) => c.section === 'income'), [sortedCats])
  const fixedCats = useMemo(() => sortedCats.filter((c) => c.section === 'fixed'), [sortedCats])
  const varCats = useMemo(() => sortedCats.filter((c) => c.section === 'variable'), [sortedCats])
  const savingsCats = useMemo(() => sortedCats.filter((c) => c.section === 'savings'), [sortedCats])

  const incomeRows = useMemo(
    () => toRows(incomeCats, budgetMonth.budgeted),
    [incomeCats, budgetMonth.budgeted]
  )
  const fixedRows = useMemo(
    () => toRows(fixedCats, budgetMonth.budgeted),
    [fixedCats, budgetMonth.budgeted]
  )
  const varRows = useMemo(
    () => toRows(varCats, budgetMonth.budgeted),
    [varCats, budgetMonth.budgeted]
  )
  const savingsRows = useMemo(
    () => toRows(savingsCats, budgetMonth.budgeted),
    [savingsCats, budgetMonth.budgeted]
  )

  // Shared update handler — routes field to correct context call
  function handleCategoryUpdate(id: string, field: string, value: string) {
    if (field === 'budgeted') {
      updateBudgeted(selectedYear, monthStr, id, value)
    } else if (field === 'label') {
      updateCategory(id, { label: value })
    } else if (field === 'expenseType') {
      updateCategory(id, { expenseType: value as ExpenseType })
    }
  }

  const transactions = budgetMonth.transactions

  function handleTxUpdate(id: string, field: keyof Transaction, value: string) {
    updateTransaction(selectedYear, monthStr, id, { [field]: value })
  }

  const categoryLabelById = useMemo(() => {
    const map: Record<string, string> = {}
    for (const c of data.budget.categories) map[c.id] = c.label
    return map
  }, [data.budget.categories])

  const allTransactionSuggestions = useMemo(() => {
    const seen = new Map<string, TxSuggestion>()
    for (const year of Object.values(data.budget.years)) {
      for (const month of Object.values(year.months)) {
        if (!month) continue
        for (const tx of month.transactions) {
          if (!tx.description.trim()) continue
          const key = `${tx.description}\0${tx.categoryId}\0${tx.tags ?? ''}`
          seen.set(key, {
            description: tx.description,
            categoryId: tx.categoryId,
            tags: tx.tags,
            categoryLabel: categoryLabelById[tx.categoryId] ?? '',
          })
        }
      }
    }
    return Array.from(seen.values())
  }, [data.budget.years, categoryLabelById])

  const actuals = useMemo(() => {
    const map: Record<string, number> = {}
    for (const tx of transactions) {
      if (tx.categoryId) {
        map[tx.categoryId] = (map[tx.categoryId] ?? 0) + (parseFloat(tx.amount) || 0)
      }
    }
    return map
  }, [transactions])

  const totalIncomeActual = useMemo(
    () => incomeRows.reduce((s, r) => s + (actuals[r.id] ?? 0), 0),
    [incomeRows, actuals]
  )
  const totalFixedActual = useMemo(
    () => fixedRows.reduce((s, r) => s + (actuals[r.id] ?? 0), 0),
    [fixedRows, actuals]
  )
  const totalVariableActual = useMemo(
    () => varRows.reduce((s, r) => s + (actuals[r.id] ?? 0), 0),
    [varRows, actuals]
  )
  const totalSavingsActual = useMemo(
    () => savingsRows.reduce((s, r) => s + (actuals[r.id] ?? 0), 0),
    [savingsRows, actuals]
  )
  const totalExpensesActual = totalFixedActual + totalVariableActual

  const totalIncomeBudgeted = useMemo(
    () => incomeRows.reduce((s, r) => s + (parseFloat(r.budgeted) || 0), 0),
    [incomeRows]
  )
  const totalFixedBudgeted = useMemo(
    () => fixedRows.reduce((s, r) => s + (parseFloat(r.budgeted) || 0), 0),
    [fixedRows]
  )
  const totalVariableBudgeted = useMemo(
    () => varRows.reduce((s, r) => s + (parseFloat(r.budgeted) || 0), 0),
    [varRows]
  )
  const totalSavingsBudgeted = useMemo(
    () => savingsRows.reduce((s, r) => s + (parseFloat(r.budgeted) || 0), 0),
    [savingsRows]
  )

  const surplus = totalIncomeActual - totalExpensesActual - totalSavingsActual

  const { needsActual, wantsActual, debtActual } = useMemo(() => {
    let needsActual = 0,
      wantsActual = 0,
      debtActual = 0
    for (const row of [...fixedRows, ...varRows]) {
      const a = actuals[row.id] ?? 0
      if (row.expenseType === 'need') needsActual += a
      else if (row.expenseType === 'want') wantsActual += a
      else if (row.expenseType === 'debt') debtActual += a
    }
    return { needsActual, wantsActual, debtActual }
  }, [fixedRows, varRows, actuals])

  const pctNeeds = totalIncomeActual > 0 ? (needsActual / totalIncomeActual) * 100 : 0
  const pctWants = totalIncomeActual > 0 ? (wantsActual / totalIncomeActual) * 100 : 0
  const pctSavings = totalIncomeActual > 0 ? (totalSavingsActual / totalIncomeActual) * 100 : 0

  const surplusColor =
    surplus > 0
      ? 'text-green-600 dark:text-green-400'
      : surplus < 0
        ? 'text-red-500 dark:text-red-400'
        : ''
  const savingsPctColor = pctSavings >= 20 ? 'text-green-600 dark:text-green-400' : ''

  const donutSegments = useMemo(() => {
    const segs = []
    if (needsActual > 0) segs.push({ label: 'Needs', value: needsActual, color: '#6366f1' })
    if (wantsActual > 0) segs.push({ label: 'Wants', value: wantsActual, color: '#8b5cf6' })
    if (debtActual > 0) segs.push({ label: 'Debt', value: debtActual, color: '#f97316' })
    if (totalSavingsActual > 0)
      segs.push({ label: 'Savings', value: totalSavingsActual, color: '#10b981' })
    if (surplus > 0) segs.push({ label: 'Surplus', value: surplus, color: '#94a3b8' })
    return segs
  }, [needsActual, wantsActual, debtActual, totalSavingsActual, surplus])

  const comparisonData = [
    { name: 'Income', budgeted: totalIncomeBudgeted, actual: totalIncomeActual },
    { name: 'Fixed', budgeted: totalFixedBudgeted, actual: totalFixedActual },
    { name: 'Variable', budgeted: totalVariableBudgeted, actual: totalVariableActual },
    { name: 'Savings', budgeted: totalSavingsBudgeted, actual: totalSavingsActual },
  ]

  const sections = [
    { label: 'Income', rows: incomeRows },
    { label: 'Fixed Expenses', rows: fixedRows },
    { label: 'Variable Expenses', rows: varRows },
    { label: 'Savings & Investments', rows: savingsRows },
  ]

  return (
    <div className="max-w-384">
      <PageHeader
        title="Monthly Budget"
        subtitle={
          <>
            Track income, expenses, and savings for{' '}
            <span className="font-medium text-gray-700 dark:text-gray-300">
              {MONTHS[selectedMonthIdx]} {selectedYear}
            </span>
            .
          </>
        }
      >
        {/* Year + month picker */}
        <div className="flex items-center gap-2 mt-4 flex-wrap">
          <YearSelector year={selectedYear} onChange={setYear} />
          <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-0.5" />
          <MonthSelector selectedIdx={selectedMonthIdx} onChange={setMonthIdx} />
        </div>
      </PageHeader>

      {/* Hero row 1 */}
      <HeroStats
        cols={4}
        stats={[
          { label: 'Total Income', value: totalIncomeActual > 0 ? fmt(totalIncomeActual) : '$—' },
          {
            label: 'Total Expenses',
            value: totalExpensesActual > 0 ? fmt(totalExpensesActual) : '$—',
          },
          {
            label: 'Total Savings',
            value: totalSavingsActual > 0 ? fmt(totalSavingsActual) : '$—',
          },
          {
            label: 'Surplus',
            value: totalIncomeActual > 0 ? fmt(surplus) : '$—',
            colorClass: surplusColor,
          },
        ]}
      />

      {/* Hero row 2 — 50/30/20 */}
      <HeroStats
        cols={3}
        stats={[
          { label: '% Needs', value: totalIncomeActual > 0 ? `${pctNeeds.toFixed(1)}%` : '—%' },
          { label: '% Wants', value: totalIncomeActual > 0 ? `${pctWants.toFixed(1)}%` : '—%' },
          {
            label: '% Savings',
            value: totalIncomeActual > 0 ? `${pctSavings.toFixed(1)}%` : '—%',
            colorClass: savingsPctColor,
          },
        ]}
      />

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-6 mb-8">
        <div className="flex flex-col">
          <SectionHeading>Budget vs Actual</SectionHeading>
          <div className="flex-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
            <div className="flex items-center gap-4 mb-3">
              <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: '#6366f1' }} />
                Budgeted
              </div>
              <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: '#10b981' }} />
                Actual
              </div>
            </div>
            <BudgetComparisonChart data={comparisonData} />
          </div>
        </div>

        <div className="flex flex-col">
          <SectionHeading>Spending Breakdown</SectionHeading>
          <div className="flex-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
            <DonutChart
              segments={donutSegments}
              height={160}
              emptyMessage="Add transactions to see breakdown"
            />
            {donutSegments.length > 0 && (
              <div className="mt-3 space-y-1.5">
                {donutSegments.map((s) => (
                  <div key={s.label} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="w-2 h-2 rounded-sm shrink-0"
                        style={{ backgroundColor: s.color }}
                      />
                      <span className="text-gray-600 dark:text-gray-400">{s.label}</span>
                    </div>
                    <span className="text-gray-500 dark:text-gray-400 tabular-nums">
                      {totalIncomeActual > 0
                        ? `${((s.value / totalIncomeActual) * 100).toFixed(0)}%`
                        : '—'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cash flow Sankey */}
      <div className="mb-8">
        <SectionHeading>Cash Flow</SectionHeading>
        <ExpandableChart
          title="Cash Flow"
          height={400}
          expandedHeight={580}
          renderChart={(h) => (
            <CashFlowSankeyChart
              incomeCats={incomeCats}
              fixedCats={fixedCats}
              variableCats={varCats}
              savingsCats={savingsCats}
              actuals={actuals}
              height={h}
            />
          )}
        />
      </div>

      {/* Budget tables — single column below 2xl */}
      <div className="flex flex-col gap-6 mb-6 2xl:hidden">
        <BudgetTable
          title="Income"
          rows={incomeRows}
          actuals={actuals}
          hasType={false}
          isIncome
          onUpdate={handleCategoryUpdate}
          onAdd={() => addCategory('income')}
        />
        <BudgetTable
          title="Fixed Expenses"
          rows={fixedRows}
          actuals={actuals}
          hasType
          onUpdate={handleCategoryUpdate}
          onAdd={() => addCategory('fixed', 'need')}
        />
        <BudgetTable
          title="Variable Expenses"
          rows={varRows}
          actuals={actuals}
          hasType
          onUpdate={handleCategoryUpdate}
          onAdd={() => addCategory('variable', 'want')}
        />
        <BudgetTable
          title="Savings & Investments"
          rows={savingsRows}
          actuals={actuals}
          hasType={false}
          onUpdate={handleCategoryUpdate}
          onAdd={() => addCategory('savings')}
        />
      </div>

      {/* Budget tables — variable left, others stacked right at 2xl+ */}
      <div className="hidden 2xl:grid 2xl:grid-cols-2 2xl:items-start gap-6 mb-6">
        <BudgetTable
          title="Variable Expenses"
          rows={varRows}
          actuals={actuals}
          hasType
          onUpdate={handleCategoryUpdate}
          onAdd={() => addCategory('variable', 'want')}
        />
        <div className="flex flex-col gap-6">
          <BudgetTable
            title="Income"
            rows={incomeRows}
            actuals={actuals}
            hasType={false}
            isIncome
            onUpdate={handleCategoryUpdate}
            onAdd={() => addCategory('income')}
          />
          <BudgetTable
            title="Fixed Expenses"
            rows={fixedRows}
            actuals={actuals}
            hasType
            onUpdate={handleCategoryUpdate}
            onAdd={() => addCategory('fixed', 'need')}
          />
          <BudgetTable
            title="Savings & Investments"
            rows={savingsRows}
            actuals={actuals}
            hasType={false}
            onUpdate={handleCategoryUpdate}
            onAdd={() => addCategory('savings')}
          />
        </div>
      </div>

      {/* Transactions */}
      <TransactionTable
        transactions={transactions}
        sections={sections}
        suggestions={allTransactionSuggestions}
        importHref={importHref}
        onUpdate={handleTxUpdate}
        onApplySuggestion={(id, patch) => updateTransaction(selectedYear, monthStr, id, patch)}
        onAdd={() => addTransaction(selectedYear, monthStr)}
        onRemove={(id) => removeTransaction(selectedYear, monthStr, id)}
        onCondense={() => condenseTransactions(selectedYear, monthStr)}
      />
    </div>
  )
}
