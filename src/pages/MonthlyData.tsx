import { useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { DonutChart } from '../components/charts'
import { HeroStats } from '../components/hero'
import { CurrencyInput, TextInput } from '../components/inputs'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function fmt(n: number): string {
  const abs = Math.abs(Math.round(n))
  return (n < 0 ? '-$' : '$') + abs.toLocaleString('en-US')
}

function fmtAxis(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(0)}k`
  return `$${Math.round(n)}`
}

let _uid = 0
function uid() { return `r${++_uid}` }

type ExpenseType = 'need' | 'want' | 'debt'

type BudgetRow = {
  id: string
  label: string
  budgeted: string
  expenseType?: ExpenseType
}

type Transaction = {
  id: string
  categoryId: string
  amount: string
  description: string
}

const TYPE_STYLES: Record<ExpenseType, string> = {
  need: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800',
  want: 'bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-800',
  debt: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800',
}

function makeInitRows(
  defs: { label: string; type?: ExpenseType }[],
  defaultType?: ExpenseType,
  total = 10,
): BudgetRow[] {
  const rows: BudgetRow[] = defs.map((d) => ({
    id: uid(), label: d.label, budgeted: '', expenseType: d.type,
  }))
  while (rows.length < total) {
    rows.push({ id: uid(), label: '', budgeted: '', expenseType: defaultType })
  }
  return rows
}

const INIT_INCOME = makeInitRows([
  { label: 'Salary / Wages' },
  { label: 'Freelance / Side Income' },
  { label: 'Other Income' },
])

const INIT_FIXED = makeInitRows([
  { label: 'Rent / Mortgage', type: 'need' },
  { label: 'Car Payment', type: 'need' },
  { label: 'Insurance', type: 'need' },
  { label: 'Subscriptions', type: 'want' },
  { label: 'Loan Repayments', type: 'debt' },
], 'need')

const INIT_VARIABLE = makeInitRows([
  { label: 'Groceries', type: 'need' },
  { label: 'Utilities', type: 'need' },
  { label: 'Fuel / Transport', type: 'need' },
  { label: 'Dining Out', type: 'want' },
  { label: 'Entertainment', type: 'want' },
  { label: 'Health', type: 'need' },
  { label: 'Clothing', type: 'want' },
  { label: 'Miscellaneous', type: 'want' },
], 'want')

const INIT_SAVINGS = makeInitRows([
  { label: 'Emergency Fund' },
  { label: 'Retirement / Super' },
  { label: 'Brokerage' },
  { label: 'Sinking Funds' },
])

// ─── Helpers ────────────────────────────────────────────────────────────────

function rowHandlers(
  setter: (fn: (prev: BudgetRow[]) => BudgetRow[]) => void,
  defaultType?: ExpenseType,
) {
  return {
    update: (id: string, field: string, value: string) =>
      setter((prev) => prev.map((r) => r.id === id ? { ...r, [field]: value } : r)),
    add: () =>
      setter((prev) => [...prev, { id: uid(), label: '', budgeted: '', expenseType: defaultType }]),
    remove: (id: string) =>
      setter((prev) => prev.filter((r) => r.id !== id)),
  }
}

// ─── TypeBadge ───────────────────────────────────────────────────────────────

function TypeBadge({ value, onChange }: { value: ExpenseType; onChange: (v: ExpenseType) => void }) {
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
  onRemove,
}: {
  title: string
  rows: BudgetRow[]
  actuals: Record<string, number>
  hasType: boolean
  isIncome?: boolean
  onUpdate: (id: string, field: string, value: string) => void
  onAdd: () => void
  onRemove: (id: string) => void
}) {
  const totalBudgeted = rows.reduce((s, r) => s + (parseFloat(r.budgeted) || 0), 0)
  const totalActual = rows.reduce((s, r) => s + (actuals[r.id] ?? 0), 0)
  const totalDiff = isIncome ? totalActual - totalBudgeted : totalBudgeted - totalActual
  const hasTotals = totalBudgeted > 0 || totalActual > 0
  const spanCols = hasType ? 6 : 5

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">
        {title}
      </p>
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm border-collapse">
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
              <th className="w-7 py-2" />
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
                    {actual > 0 ? fmt(actual) : <span className="text-gray-300 dark:text-gray-700">$—</span>}
                  </td>
                  <td className={`py-1.5 pl-2 pr-4 text-right tabular-nums ${diffColor}`}>
                    {hasValues ? fmt(diff) : '$—'}
                  </td>
                  <td className="py-1.5 pr-1">
                    <button
                      onClick={() => onRemove(row.id)}
                      className="w-6 h-6 flex items-center justify-center rounded text-gray-300 dark:text-gray-700 hover:text-red-400 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-base leading-none"
                    >
                      ×
                    </button>
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
                {totalBudgeted > 0 ? fmt(totalBudgeted) : '$—'}
              </td>
              <td className="py-2 px-2 text-right tabular-nums text-gray-700 dark:text-gray-200">
                {totalActual > 0 ? fmt(totalActual) : '$—'}
              </td>
              <td className={`py-2 pl-2 pr-4 text-right tabular-nums ${
                hasTotals
                  ? totalDiff >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'
                  : 'text-gray-700 dark:text-gray-200'
              }`}>
                {hasTotals ? fmt(totalDiff) : '$—'}
              </td>
              <td />
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
  onUpdate,
  onAdd,
  onRemove,
}: {
  transactions: Transaction[]
  sections: { label: string; rows: BudgetRow[] }[]
  onUpdate: (id: string, field: keyof Transaction, value: string) => void
  onAdd: () => void
  onRemove: (id: string) => void
}) {
  const totalAmount = transactions.reduce((s, t) => s + (parseFloat(t.amount) || 0), 0)

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">
        Transactions
      </p>
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-800">
              <th className="text-left py-2 pl-4 pr-3 font-medium text-gray-500 dark:text-gray-400 w-56">
                Category
              </th>
              <th className="text-right py-2 px-3 font-medium text-gray-500 dark:text-gray-400 w-36">
                Amount
              </th>
              <th className="text-left py-2 px-3 font-medium text-gray-500 dark:text-gray-400">
                Description
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
                  <select
                    value={tx.categoryId}
                    onChange={(e) => onUpdate(tx.id, 'categoryId', e.target.value)}
                    className="w-full text-sm border border-gray-300 dark:border-gray-700 rounded px-2 py-1 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-400 dark:focus:ring-gray-600"
                  >
                    <option value="">— Category —</option>
                    {sections.map(({ label, rows }) => (
                      <optgroup key={label} label={label}>
                        {rows.filter((r) => r.label.trim()).map((r) => (
                          <option key={r.id} value={r.id}>{r.label}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </td>
                <td className="py-1.5 px-3">
                  <CurrencyInput
                    compact
                    value={tx.amount}
                    onChange={(v) => onUpdate(tx.id, 'amount', v)}
                  />
                </td>
                <td className="py-1.5 px-3">
                  <TextInput
                    compact
                    value={tx.description}
                    onChange={(v) => onUpdate(tx.id, 'description', v)}
                    placeholder="Description"
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
              <td className="py-2 pl-4 pr-3 text-gray-700 dark:text-gray-200">Total</td>
              <td className="py-2 px-3 text-right tabular-nums text-gray-700 dark:text-gray-200">
                {totalAmount > 0 ? fmt(totalAmount) : '$—'}
              </td>
              <td colSpan={2} />
            </tr>
            <tr className="bg-white dark:bg-gray-900">
              <td colSpan={4} className="px-4 py-2">
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
      {payload.filter((p) => p.value > 0).map((p) => (
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
      <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }} barCategoryGap="28%" barGap={3}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={fmtAxis} tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={48} />
        <Tooltip content={<BvATooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
        <Bar dataKey="budgeted" fill="#6366f1" radius={[3, 3, 0, 0]} name="Budgeted" />
        <Bar dataKey="actual" fill="#10b981" radius={[3, 3, 0, 0]} name="Actual" />
      </BarChart>
    </ResponsiveContainer>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function MonthlyData() {
  const currentMonth = new Date().getMonth()
  const [selectedMonth, setSelectedMonth] = useState(currentMonth)
  const [incomeRows, setIncomeRows] = useState<BudgetRow[]>(INIT_INCOME)
  const [fixedRows, setFixedRows] = useState<BudgetRow[]>(INIT_FIXED)
  const [variableRows, setVariableRows] = useState<BudgetRow[]>(INIT_VARIABLE)
  const [savingsRows, setSavingsRows] = useState<BudgetRow[]>(INIT_SAVINGS)
  const [transactions, setTransactions] = useState<Transaction[]>([
    { id: uid(), categoryId: '', amount: '', description: '' },
  ])

  const income = rowHandlers(setIncomeRows)
  const fixed = rowHandlers(setFixedRows, 'need')
  const variable = rowHandlers(setVariableRows, 'want')
  const savings = rowHandlers(setSavingsRows)

  function updateTx(id: string, field: keyof Transaction, value: string) {
    setTransactions((prev) => prev.map((t) => t.id === id ? { ...t, [field]: value } : t))
  }
  function addTx() {
    setTransactions((prev) => [...prev, { id: uid(), categoryId: '', amount: '', description: '' }])
  }
  function removeTx(id: string) {
    setTransactions((prev) => prev.filter((t) => t.id !== id))
  }

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
    () => incomeRows.reduce((s, r) => s + (actuals[r.id] ?? 0), 0), [incomeRows, actuals]
  )
  const totalFixedActual = useMemo(
    () => fixedRows.reduce((s, r) => s + (actuals[r.id] ?? 0), 0), [fixedRows, actuals]
  )
  const totalVariableActual = useMemo(
    () => variableRows.reduce((s, r) => s + (actuals[r.id] ?? 0), 0), [variableRows, actuals]
  )
  const totalSavingsActual = useMemo(
    () => savingsRows.reduce((s, r) => s + (actuals[r.id] ?? 0), 0), [savingsRows, actuals]
  )
  const totalExpensesActual = totalFixedActual + totalVariableActual

  const totalIncomeBudgeted = useMemo(
    () => incomeRows.reduce((s, r) => s + (parseFloat(r.budgeted) || 0), 0), [incomeRows]
  )
  const totalFixedBudgeted = useMemo(
    () => fixedRows.reduce((s, r) => s + (parseFloat(r.budgeted) || 0), 0), [fixedRows]
  )
  const totalVariableBudgeted = useMemo(
    () => variableRows.reduce((s, r) => s + (parseFloat(r.budgeted) || 0), 0), [variableRows]
  )
  const totalSavingsBudgeted = useMemo(
    () => savingsRows.reduce((s, r) => s + (parseFloat(r.budgeted) || 0), 0), [savingsRows]
  )

  const surplus = totalIncomeActual - totalExpensesActual - totalSavingsActual

  const { needsActual, wantsActual, debtActual } = useMemo(() => {
    let needsActual = 0, wantsActual = 0, debtActual = 0
    for (const row of [...fixedRows, ...variableRows]) {
      const a = actuals[row.id] ?? 0
      if (row.expenseType === 'need') needsActual += a
      else if (row.expenseType === 'want') wantsActual += a
      else if (row.expenseType === 'debt') debtActual += a
    }
    return { needsActual, wantsActual, debtActual }
  }, [fixedRows, variableRows, actuals])

  const pctNeeds = totalIncomeActual > 0 ? (needsActual / totalIncomeActual) * 100 : 0
  const pctWants = totalIncomeActual > 0 ? (wantsActual / totalIncomeActual) * 100 : 0
  const pctSavings = totalIncomeActual > 0 ? (totalSavingsActual / totalIncomeActual) * 100 : 0

  const surplusColor = surplus > 0
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
    if (totalSavingsActual > 0) segs.push({ label: 'Savings', value: totalSavingsActual, color: '#10b981' })
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
    { label: 'Variable Expenses', rows: variableRows },
    { label: 'Savings & Investments', rows: savingsRows },
  ]

  return (
    <div className="max-w-7xl">
      {/* Header + month selector */}
      <div className="mb-6 pb-5 border-b border-gray-200 dark:border-gray-800">
        <h1 className="text-2xl font-bold mb-1">Monthly Budget</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Track income, expenses, and savings for{' '}
          <span className="font-medium text-gray-700 dark:text-gray-300">{MONTHS[selectedMonth]}</span>.
        </p>
        <div className="flex gap-2 flex-wrap">
          {MONTHS.map((month, i) => (
            <button
              key={month}
              onClick={() => setSelectedMonth(i)}
              className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                i === selectedMonth
                  ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-medium'
                  : 'border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              {month.slice(0, 3)}
            </button>
          ))}
        </div>
      </div>

      {/* Hero row 1 */}
      <HeroStats
        cols={4}
        stats={[
          { label: 'Total Income', value: totalIncomeActual > 0 ? fmt(totalIncomeActual) : '$—' },
          { label: 'Total Expenses', value: totalExpensesActual > 0 ? fmt(totalExpensesActual) : '$—' },
          { label: 'Total Savings', value: totalSavingsActual > 0 ? fmt(totalSavingsActual) : '$—' },
          { label: 'Surplus', value: totalIncomeActual > 0 ? fmt(surplus) : '$—', colorClass: surplusColor },
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
      <div className="grid grid-cols-[2fr_1fr] gap-6 mb-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">
            Budget vs Actual
          </p>
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
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

        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">
            Spending Breakdown
          </p>
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
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
                      <span className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: s.color }} />
                      <span className="text-gray-600 dark:text-gray-400">{s.label}</span>
                    </div>
                    <span className="text-gray-500 dark:text-gray-400 tabular-nums">
                      {totalIncomeActual > 0 ? `${((s.value / totalIncomeActual) * 100).toFixed(0)}%` : '—'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Budget tables — 2-column grid */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <BudgetTable
          title="Income"
          rows={incomeRows}
          actuals={actuals}
          hasType={false}
          isIncome
          onUpdate={income.update}
          onAdd={income.add}
          onRemove={income.remove}
        />
        <BudgetTable
          title="Fixed Expenses"
          rows={fixedRows}
          actuals={actuals}
          hasType
          onUpdate={fixed.update}
          onAdd={fixed.add}
          onRemove={fixed.remove}
        />
        <BudgetTable
          title="Variable Expenses"
          rows={variableRows}
          actuals={actuals}
          hasType
          onUpdate={variable.update}
          onAdd={variable.add}
          onRemove={variable.remove}
        />
        <BudgetTable
          title="Savings & Investments"
          rows={savingsRows}
          actuals={actuals}
          hasType={false}
          onUpdate={savings.update}
          onAdd={savings.add}
          onRemove={savings.remove}
        />
      </div>

      {/* Transactions */}
      <TransactionTable
        transactions={transactions}
        sections={sections}
        onUpdate={updateTx}
        onAdd={addTx}
        onRemove={removeTx}
      />
    </div>
  )
}
