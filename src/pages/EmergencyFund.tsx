import { useMemo, useState } from 'react'
import { DonutChart, GrowthBarChart } from '../components/charts'
import { HeroStats } from '../components/hero'
import { CurrencyInput, SuffixInput } from '../components/inputs'
import { PageHeader, SectionHeading } from '../components/layout'
import type { DataTableColumn } from '../components/table'
import { DataTable } from '../components/table'
import { calcMonthsToGoal, fmt } from '../lib/finance'

const EXPENSE_ROWS = [
  { label: 'Rent / Mortgage', color: '#6366f1' },
  { label: 'Car Payment', color: '#8b5cf6' },
  { label: 'Insurance', color: '#ec4899' },
  { label: 'Subscriptions', color: '#f43f5e' },
  { label: 'Loan Repayments', color: '#f97316' },
  { label: 'Groceries', color: '#10b981' },
  { label: 'Utilities', color: '#14b8a6' },
  { label: 'Fuel / Transport', color: '#06b6d4' },
  { label: 'Health', color: '#22c55e' },
  { label: 'Other Essentials', color: '#94a3b8' },
]

type ExpenseValues = { budgeted: string; adjustment: string }

export default function EmergencyFund() {
  const [expenses, setExpenses] = useState<Record<string, ExpenseValues>>(() =>
    Object.fromEntries(EXPENSE_ROWS.map((r) => [r.label, { budgeted: '', adjustment: '' }]))
  )
  const [coverageMonths, setCoverageMonths] = useState('6')
  const [currentBalance, setCurrentBalance] = useState('')
  const [monthlyContribution, setMonthlyContribution] = useState('')
  const [annualInterest, setAnnualInterest] = useState('')
  const [startDate, setStartDate] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })

  const rows = useMemo(
    () =>
      EXPENSE_ROWS.map((r) => {
        const budgeted = parseFloat(expenses[r.label].budgeted) || 0
        const adjustment = parseFloat(expenses[r.label].adjustment) || 0
        return { ...r, budgeted, adjustment, effective: budgeted + adjustment }
      }),
    [expenses]
  )

  const totalBudgeted = useMemo(() => rows.reduce((s, r) => s + r.budgeted, 0), [rows])
  const totalAdjustment = useMemo(() => rows.reduce((s, r) => s + r.adjustment, 0), [rows])
  const monthlyTotal = useMemo(() => rows.reduce((s, r) => s + r.effective, 0), [rows])

  type ExpenseRow = (typeof rows)[0]
  const columns = useMemo<DataTableColumn<ExpenseRow>[]>(
    () => [
      {
        header: 'Budgeted',
        width: 'w-36',
        cell: (row) => (
          <CurrencyInput
            compact
            value={expenses[row.label].budgeted}
            onChange={(v) =>
              setExpenses((prev) => ({ ...prev, [row.label]: { ...prev[row.label], budgeted: v } }))
            }
          />
        ),
        footer: totalBudgeted > 0 ? fmt(totalBudgeted) : '$—',
      },
      {
        header: 'Adjustment',
        width: 'w-36',
        cell: (row) => (
          <CurrencyInput
            compact
            value={expenses[row.label].adjustment}
            onChange={(v) =>
              setExpenses((prev) => ({
                ...prev,
                [row.label]: { ...prev[row.label], adjustment: v },
              }))
            }
          />
        ),
        footer: totalAdjustment !== 0 ? fmt(totalAdjustment) : '$—',
      },
      {
        header: 'Effective',
        width: 'w-24',
        cell: (row) =>
          row.effective !== 0 ? (
            <span className="text-gray-700 dark:text-gray-300">{fmt(row.effective)}</span>
          ) : (
            <span className="text-gray-400 dark:text-gray-600">$—</span>
          ),
        footer: monthlyTotal > 0 ? fmt(monthlyTotal) : '$—',
        footerPrimary: true,
      },
    ],
    [expenses, totalBudgeted, totalAdjustment, monthlyTotal]
  )

  const coverageMonthsNum = parseInt(coverageMonths) || 0
  const targetBalance = monthlyTotal * coverageMonthsNum
  const balance = parseFloat(currentBalance) || 0
  const contribution = parseFloat(monthlyContribution) || 0
  const interest = parseFloat(annualInterest) || 0
  const progressPct = targetBalance > 0 ? Math.min((balance / targetBalance) * 100, 100) : 0
  const monthsToGoal = calcMonthsToGoal(balance, targetBalance, contribution, interest)

  const pieSegments = rows
    .filter((r) => r.effective > 0)
    .map((r) => ({ label: r.label, value: r.effective, color: r.color }))

  const progressColor =
    progressPct >= 100
      ? 'bg-green-500 dark:bg-green-400'
      : progressPct >= 50
        ? 'bg-amber-500 dark:bg-amber-400'
        : 'bg-blue-500 dark:bg-blue-400'

  const progressTextColor =
    progressPct >= 100
      ? 'text-green-600 dark:text-green-400'
      : progressPct >= 50
        ? 'text-amber-600 dark:text-amber-400'
        : ''

  return (
    <div className="max-w-7xl">
      <PageHeader
        title="Emergency Fund"
        subtitle="Calculate your target emergency fund and track your progress toward it."
      />

      <HeroStats
        stats={[
          { label: 'Monthly Expenses', value: monthlyTotal > 0 ? fmt(monthlyTotal) : '$—' },
          {
            label: 'Coverage Target',
            value: coverageMonthsNum > 0 ? `${coverageMonthsNum} mo` : '— mo',
          },
          { label: 'Current Balance', value: balance > 0 ? fmt(balance) : '$—' },
          { label: 'Target Balance', value: targetBalance > 0 ? fmt(targetBalance) : '$—' },
          {
            label: 'Progress',
            value: targetBalance > 0 ? `${progressPct.toFixed(1)}%` : '—%',
            progress: { pct: progressPct, colorClass: progressTextColor },
          },
        ]}
      />

      <div className="grid grid-cols-2 gap-6 mb-8">
        <div>
          <SectionHeading>Expense Breakdown</SectionHeading>
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 flex gap-6 items-center">
            <div className="shrink-0 w-44">
              <DonutChart segments={pieSegments} />
            </div>
            {pieSegments.length > 0 ? (
              <div className="flex-1 space-y-1.5 min-w-0">
                {pieSegments.map((s) => (
                  <div key={s.label} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span
                        className="w-2 h-2 rounded-sm shrink-0"
                        style={{ backgroundColor: s.color }}
                      />
                      <span className="text-gray-600 dark:text-gray-400 truncate">{s.label}</span>
                    </div>
                    <span className="text-gray-500 dark:text-gray-400 tabular-nums ml-2 shrink-0">
                      {((s.value / monthlyTotal) * 100).toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400 dark:text-gray-600">
                Enter expenses to see breakdown
              </p>
            )}
          </div>
        </div>

        <div>
          <SectionHeading>Progress</SectionHeading>
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 h-[calc(100%-28px)] flex flex-col justify-center gap-4">
            <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
              <span>{balance > 0 ? fmt(balance) : '$—'} saved</span>
              <span>{targetBalance > 0 ? fmt(targetBalance) : '$—'} target</span>
            </div>
            <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${progressColor}`}
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-gray-400 dark:text-gray-600">
              <span>
                {targetBalance > 0 ? `${progressPct.toFixed(1)}% complete` : '—% complete'}
              </span>
              <span>
                {monthsToGoal !== null && `${monthsToGoal} months to goal`}
                {progressPct >= 100 && 'Goal reached!'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_296px] gap-8">
        <DataTable title="Monthly Essential Expenses" rows={rows} columns={columns} />

        <div>
          <SectionHeading>Fund Target</SectionHeading>
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                Months of coverage
              </label>
              <SuffixInput
                value={coverageMonths}
                onChange={setCoverageMonths}
                suffix="months"
                placeholder="6"
                inputMode="numeric"
                decimalPlaces={0}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                Current balance
              </label>
              <CurrencyInput value={currentBalance} onChange={setCurrentBalance} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                Monthly contribution
              </label>
              <CurrencyInput value={monthlyContribution} onChange={setMonthlyContribution} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                Annual interest rate
              </label>
              <SuffixInput
                value={annualInterest}
                onChange={setAnnualInterest}
                suffix="%"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                Start month
              </label>
              <input
                type="month"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-700 rounded px-2.5 py-1.5 text-sm bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-400 dark:focus:ring-gray-600"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <SectionHeading>Growth Projection</SectionHeading>
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: '#6366f1' }} />
              Initial
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: '#8b5cf6' }} />
              Deposits
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: '#10b981' }} />
              Interest
            </div>
          </div>
          <GrowthBarChart
            initialBalance={balance}
            monthlyContribution={contribution}
            annualRate={interest}
            target={targetBalance > 0 ? targetBalance : undefined}
            startDate={startDate}
          />
        </div>
      </div>
    </div>
  )
}
