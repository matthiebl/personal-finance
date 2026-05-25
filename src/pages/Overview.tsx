import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { DonutSegment, StackedDatum, TrendDatum } from '../components/charts'
import {
  CashFlowSankeyChart,
  DonutChart,
  ExpandableChart,
  MonthlyStackedChart,
  MonthlyTrendChart,
} from '../components/charts'
import { HeroStats } from '../components/hero'
import { PageHeader, SectionHeading, ViewToggle, YearSelector } from '../components/layout'
import type { AnnualSectionConfig, AnnualSummaryRow, AnnualTableRow } from '../components/table'
import { AnnualBreakdownTable } from '../components/table'
import { useAppData } from '../context/useAppData'
import type { MonthSlot } from '../lib/annualPicker'
import { useAnnualPicker } from '../lib/annualPicker'
import { fmt, fmtAxis, fmtCents } from '../lib/finance'
import type { BudgetCategory, BudgetYear, Transaction } from '../lib/types'

const MONTH_ABBR = [
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
const MONTH_FULL = [
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
const MONTH_KEYS = MONTH_ABBR.map((_, i) => String(i + 1).padStart(2, '0'))

const PALETTE = [
  '#6366f1',
  '#8b5cf6',
  '#f97316',
  '#10b981',
  '#14b8a6',
  '#f43f5e',
  '#ec4899',
  '#06b6d4',
  '#22c55e',
  '#94a3b8',
]

// ─── Types ────────────────────────────────────────────────────────────────────

type DeepDiveCategory = {
  categoryId: string
  label: string
  section: BudgetCategory['section']
}

// ─── CategoryDeepDive ─────────────────────────────────────────────────────────

type TxWithMonth = { tx: Transaction; monthIdx: number }

type DeepDiveTooltipPayload = { name: string; value: number; fill: string }

function DeepDiveTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: DeepDiveTooltipPayload[]
  label?: string
}) {
  if (!active || !payload?.length || !payload[0].value) return null
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 shadow-md text-xs">
      <p className="font-medium text-gray-700 dark:text-gray-200 mb-1">{label}</p>
      <span className="tabular-nums text-gray-600 dark:text-gray-300">
        {fmtCents(payload[0].value)}
      </span>
    </div>
  )
}

function CategoryDeepDive({
  category,
  yearData,
  monthAbbr = MONTH_ABBR,
  monthFull = MONTH_FULL,
  totalActiveMonths,
  onClose,
}: {
  category: DeepDiveCategory
  yearData: BudgetYear
  monthAbbr?: string[]
  monthFull?: string[]
  totalActiveMonths: number
  onClose: () => void
}) {
  const [excludedTags, setExcludedTags] = useState<Set<string>>(new Set())
  const [descriptionFilter, setDescriptionFilter] = useState<string | null>(null)

  const allTxWithMonth = useMemo((): TxWithMonth[] => {
    const result: TxWithMonth[] = []
    for (let m = 1; m <= 12; m++) {
      const key = String(m).padStart(2, '0')
      const bm = yearData.months[key]
      if (!bm) continue
      for (const tx of bm.transactions) {
        if (tx.categoryId === category.categoryId) {
          result.push({ tx, monthIdx: m - 1 })
        }
      }
    }
    return result
  }, [yearData, category.categoryId])

  const allTags = useMemo(() => {
    const set = new Set<string>()
    for (const { tx } of allTxWithMonth) {
      const txTags = (tx.tags ?? '').split(/\s+/).filter(Boolean)
      if (txTags.length === 0) set.add('(no tag)')
      else for (const tag of txTags) set.add(tag)
    }
    return [...set].sort()
  }, [allTxWithMonth])

  const filteredTxWithMonth = useMemo(() => {
    return allTxWithMonth.filter(({ tx }) => {
      if (descriptionFilter !== null && tx.description !== descriptionFilter) return false
      if (excludedTags.size > 0) {
        const txTags = (tx.tags ?? '').split(/\s+/).filter(Boolean)
        if (txTags.length === 0) {
          if (excludedTags.has('(no tag)')) return false
        } else if (txTags.some((tag) => excludedTags.has(tag))) {
          return false
        }
      }
      return true
    })
  }, [allTxWithMonth, excludedTags, descriptionFilter])

  const monthlyBarData = useMemo(() => {
    const totals = new Array(12).fill(0)
    for (const { tx, monthIdx } of filteredTxWithMonth) {
      totals[monthIdx] += parseFloat(tx.amount) || 0
    }
    return monthAbbr.map((month, i) => ({ month, amount: totals[i] }))
  }, [filteredTxWithMonth, monthAbbr])

  const tagSegments = useMemo((): DonutSegment[] => {
    const map = new Map<string, number>()
    for (const { tx } of filteredTxWithMonth) {
      const txTags = (tx.tags ?? '').split(/\s+/).filter(Boolean)
      const amt = parseFloat(tx.amount) || 0
      if (txTags.length === 0) {
        map.set('(no tag)', (map.get('(no tag)') ?? 0) + amt)
      } else {
        const share = amt / txTags.length
        for (const tag of txTags) map.set(tag, (map.get(tag) ?? 0) + share)
      }
    }
    return [...map.entries()].map(([label, value], i) => ({
      label,
      value,
      color: PALETTE[i % PALETTE.length],
    }))
  }, [filteredTxWithMonth])

  const txByMonth = useMemo(() => {
    const groups: {
      monthIdx: number
      label: string
      transactions: Transaction[]
      total: number
    }[] = []
    for (let i = 0; i < 12; i++) {
      const txs = filteredTxWithMonth.filter((x) => x.monthIdx === i).map((x) => x.tx)
      if (txs.length > 0) {
        const total = txs.reduce((s, t) => s + (parseFloat(t.amount) || 0), 0)
        groups.push({ monthIdx: i, label: monthFull[i], transactions: txs, total })
      }
    }
    return groups
  }, [filteredTxWithMonth, monthFull])

  const grandTotal = filteredTxWithMonth.reduce((s, { tx }) => s + (parseFloat(tx.amount) || 0), 0)
  const avgPerMonth = totalActiveMonths > 0 ? grandTotal / totalActiveMonths : 0

  function toggleTag(tag: string) {
    setExcludedTags((prev) => {
      const next = new Set(prev)
      if (next.has(tag)) {
        next.delete(tag)
      } else {
        next.add(tag)
      }
      return next
    })
  }

  function toggleDescriptionFilter(desc: string) {
    setDescriptionFilter((prev) => (prev === desc ? null : desc))
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40" onClick={onClose}>
      <div
        className="fixed inset-y-0 right-0 w-full max-w-2xl bg-white dark:bg-gray-950 shadow-2xl flex flex-col overflow-hidden border-l border-gray-200 dark:border-gray-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 shrink-0">
          <div>
            <p className="font-semibold text-gray-800 dark:text-gray-100 text-base">
              {category.label}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 tabular-nums">
              {grandTotal > 0 ? fmtCents(grandTotal) : '$—'} across {filteredTxWithMonth.length}{' '}
              transaction{filteredTxWithMonth.length !== 1 ? 's' : ''}
              {totalActiveMonths > 1 && (
                <span className="ml-2 text-gray-300 dark:text-gray-600">
                  · avg {fmtCents(avgPerMonth)}/mo
                </span>
              )}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Monthly bar chart */}
          <div>
            <SectionHeading>Monthly Activity</SectionHeading>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-3 border border-gray-100 dark:border-gray-800">
              {monthlyBarData.some((d) => d.amount > 0) ? (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart
                    data={monthlyBarData}
                    margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
                    barCategoryGap="30%"
                  >
                    <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 10, fill: '#9ca3af' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tickFormatter={fmtAxis}
                      tick={{ fontSize: 10, fill: '#9ca3af' }}
                      axisLine={false}
                      tickLine={false}
                      width={44}
                    />
                    <Tooltip content={<DeepDiveTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
                    <Bar
                      dataKey="amount"
                      fill="#6366f1"
                      radius={[3, 3, 0, 0]}
                      name={category.label}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-45">
                  <p className="text-xs text-gray-400 dark:text-gray-600">
                    No transactions in this year
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Tag breakdown */}
          {allTags.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <SectionHeading>Tag Breakdown</SectionHeading>
                {excludedTags.size > 0 && (
                  <button
                    onClick={() => setExcludedTags(new Set())}
                    className="text-xs text-gray-400 dark:text-gray-500 hover:text-indigo-500 transition-colors"
                  >
                    Reset filters
                  </button>
                )}
              </div>
              <div className="grid grid-cols-[160px_1fr] gap-4 items-start">
                <DonutChart segments={tagSegments} height={160} emptyMessage="No data" />
                <div>
                  {/* Tag chips */}
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {allTags.map((tag) => {
                      const excluded = excludedTags.has(tag)
                      return (
                        <button
                          key={tag}
                          onClick={() => toggleTag(tag)}
                          className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                            excluded
                              ? 'border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-600 line-through'
                              : 'border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                          }`}
                        >
                          {tag}
                        </button>
                      )
                    })}
                  </div>
                  {/* Per-tag totals */}
                  <div className="space-y-1">
                    {tagSegments.map((seg) => (
                      <div key={seg.label} className="flex justify-between items-center text-xs">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-2 h-2 rounded-sm shrink-0"
                            style={{ backgroundColor: seg.color }}
                          />
                          <span className="text-gray-600 dark:text-gray-400">{seg.label}</span>
                        </div>
                        <span className="tabular-nums text-gray-700 dark:text-gray-300">
                          {fmtCents(seg.value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Transactions by month */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <SectionHeading>Transactions</SectionHeading>
              {descriptionFilter && (
                <button
                  onClick={() => setDescriptionFilter(null)}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400"
                >
                  <span className="max-w-35 truncate">{descriptionFilter}</span>
                  <span className="ml-0.5 opacity-60">×</span>
                </button>
              )}
            </div>
            {txByMonth.length === 0 ? (
              <p className="text-xs text-gray-400 dark:text-gray-600 py-4 text-center">
                {allTxWithMonth.length === 0
                  ? 'No transactions recorded this year.'
                  : 'No transactions match active filters.'}
              </p>
            ) : (
              <div className="space-y-4">
                {txByMonth.map((group) => (
                  <div key={group.monthIdx}>
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-xs font-medium text-gray-400 dark:text-gray-500">
                        {group.label}
                      </p>
                      <span className="text-xs tabular-nums text-gray-400 dark:text-gray-500">
                        {fmtCents(group.total)}
                      </span>
                    </div>
                    <div className="rounded-lg border border-gray-100 dark:border-gray-800 overflow-hidden">
                      {group.transactions.map((tx, i) => {
                        const isSelected = descriptionFilter === tx.description
                        return (
                          <div
                            key={tx.id}
                            onClick={() =>
                              tx.description && toggleDescriptionFilter(tx.description)
                            }
                            className={`flex items-center justify-between py-2 px-3 text-sm transition-colors ${
                              tx.description ? 'cursor-pointer' : ''
                            } ${
                              isSelected
                                ? 'bg-indigo-50 dark:bg-indigo-900/20'
                                : i % 2 === 0
                                  ? 'bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/60'
                                  : 'bg-gray-50/60 dark:bg-gray-900/60 hover:bg-gray-100/60 dark:hover:bg-gray-800/60'
                            }`}
                          >
                            <div className="flex-1 min-w-0 mr-3">
                              <span
                                className={`truncate block ${isSelected ? 'text-indigo-700 dark:text-indigo-300 font-medium' : 'text-gray-700 dark:text-gray-300'}`}
                              >
                                {tx.description || (
                                  <span className="text-gray-300 dark:text-gray-700">—</span>
                                )}
                              </span>
                              {tx.tags && (
                                <span className="text-xs text-gray-400 dark:text-gray-600 mt-0.5 block">
                                  {tx.tags}
                                </span>
                              )}
                            </div>
                            <span className="tabular-nums text-gray-600 dark:text-gray-400 shrink-0">
                              {fmtCents(parseFloat(tx.amount) || 0)}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Overview() {
  const { data } = useAppData()
  const { selectedYear, viewMode, setYear, setViewMode } = useAnnualPicker()
  const [deepDiveCategory, setDeepDiveCategory] = useState<DeepDiveCategory | null>(null)

  // Sorted categories
  const sortedCats = useMemo(
    () => [...data.budget.categories].sort((a, b) => a.order - b.order),
    [data.budget.categories]
  )

  // Category sets for fast lookup
  const catSets = useMemo(() => {
    const incomeIds = new Set(sortedCats.filter((c) => c.section === 'income').map((c) => c.id))
    const savingsIds = new Set(sortedCats.filter((c) => c.section === 'savings').map((c) => c.id))
    const expenseIds = new Set(
      sortedCats.filter((c) => c.section === 'fixed' || c.section === 'variable').map((c) => c.id)
    )
    const catToExpenseType: Record<string, string> = {}
    for (const c of sortedCats) {
      if (c.expenseType) catToExpenseType[c.id] = c.expenseType
    }
    return { incomeIds, savingsIds, expenseIds, catToExpenseType }
  }, [sortedCats])

  // Active month slots — 12 entries, either the selected calendar year or rolling 12M
  const activeMonthSlots = useMemo((): MonthSlot[] => {
    if (viewMode === 'rolling12') {
      const now = new Date()
      return Array.from({ length: 12 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - 12 + i, 1)
        return {
          year: String(d.getFullYear()),
          monthKey: String(d.getMonth() + 1).padStart(2, '0'),
          abbr: `${MONTH_ABBR[d.getMonth()]} '${String(d.getFullYear()).slice(2)}`,
          full: `${MONTH_FULL[d.getMonth()]} ${d.getFullYear()}`,
        }
      })
    }
    return MONTH_KEYS.map((key, i) => ({
      year: selectedYear,
      monthKey: key,
      abbr: MONTH_ABBR[i],
      full: MONTH_FULL[i],
    }))
  }, [viewMode, selectedYear])

  // Monthly totals — array indexed 0-11 by slot, each entry is catId -> amount
  const monthlyActuals = useMemo(() => {
    return activeMonthSlots.map(({ year, monthKey }) => {
      const bm = (data.budget.years[year] ?? { months: {} }).months[monthKey]
      const map: Record<string, number> = {}
      if (bm) {
        for (const tx of bm.transactions) {
          if (tx.categoryId)
            map[tx.categoryId] = (map[tx.categoryId] ?? 0) + (parseFloat(tx.amount) || 0)
        }
      }
      return map
    })
  }, [activeMonthSlots, data.budget.years])

  // Annual totals per category
  const annualCategoryTotals = useMemo(() => {
    const totals: Record<string, number> = {}
    for (const map of monthlyActuals) {
      for (const [id, amt] of Object.entries(map)) {
        totals[id] = (totals[id] ?? 0) + amt
      }
    }
    return totals
  }, [monthlyActuals])

  // Hero scalars
  const annualIncome = useMemo(
    () => [...catSets.incomeIds].reduce((s, id) => s + (annualCategoryTotals[id] ?? 0), 0),
    [catSets.incomeIds, annualCategoryTotals]
  )
  const annualExpenses = useMemo(
    () => [...catSets.expenseIds].reduce((s, id) => s + (annualCategoryTotals[id] ?? 0), 0),
    [catSets.expenseIds, annualCategoryTotals]
  )
  const annualSavings = useMemo(
    () => [...catSets.savingsIds].reduce((s, id) => s + (annualCategoryTotals[id] ?? 0), 0),
    [catSets.savingsIds, annualCategoryTotals]
  )
  const savingsRate = annualIncome > 0 ? (annualSavings / annualIncome) * 100 : 0
  const surplus = annualIncome - annualExpenses - annualSavings

  // Monthly trend data
  const monthlyTrendData = useMemo((): TrendDatum[] => {
    return activeMonthSlots.map(({ abbr }, i) => {
      const actuals = monthlyActuals[i]
      const income = [...catSets.incomeIds].reduce((s, id) => s + (actuals[id] ?? 0), 0)
      const expenses = [...catSets.expenseIds].reduce((s, id) => s + (actuals[id] ?? 0), 0)
      const savings = [...catSets.savingsIds].reduce((s, id) => s + (actuals[id] ?? 0), 0)
      return { month: abbr, income, expenses, savings }
    })
  }, [monthlyActuals, catSets, activeMonthSlots])

  // Monthly stacked breakdown
  const monthlyBreakdownData = useMemo((): StackedDatum[] => {
    return activeMonthSlots.map(({ abbr }, i) => {
      const actuals = monthlyActuals[i]
      let needs = 0,
        wants = 0,
        debt = 0,
        savings = 0
      for (const [id, amt] of Object.entries(actuals)) {
        if (catSets.incomeIds.has(id)) continue
        if (catSets.savingsIds.has(id)) {
          savings += amt
        } else {
          const et = catSets.catToExpenseType[id]
          if (et === 'need') needs += amt
          else if (et === 'want') wants += amt
          else if (et === 'debt') debt += amt
        }
      }
      return { month: abbr, needs, wants, debt, savings }
    })
  }, [monthlyActuals, catSets, activeMonthSlots])

  // Average spending by type (over months that have any transaction)
  const spendingTypeAverages = useMemo(() => {
    const totals = monthlyBreakdownData.reduce(
      (acc, d) => ({
        needs: acc.needs + d.needs,
        wants: acc.wants + d.wants,
        debt: acc.debt + d.debt,
        savings: acc.savings + d.savings,
      }),
      { needs: 0, wants: 0, debt: 0, savings: 0 }
    )
    const active = monthlyActuals.filter((m) => Object.keys(m).length > 0).length
    const n = active || 1
    return {
      needs: totals.needs / n,
      wants: totals.wants / n,
      debt: totals.debt / n,
      savings: totals.savings / n,
    }
  }, [monthlyBreakdownData, monthlyActuals])

  // Annual table rows per section
  function buildRows(cats: BudgetCategory[]): AnnualTableRow[] {
    return cats.map((c) => ({
      categoryId: c.id,
      label: c.label,
      monthlyTotals: activeMonthSlots.map((_, i) => monthlyActuals[i][c.id] ?? 0),
      annualTotal: annualCategoryTotals[c.id] ?? 0,
    }))
  }

  const incomeRows = useMemo(
    () => buildRows(sortedCats.filter((c) => c.section === 'income')),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sortedCats, monthlyActuals, annualCategoryTotals]
  )
  const fixedRows = useMemo(
    () => buildRows(sortedCats.filter((c) => c.section === 'fixed')),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sortedCats, monthlyActuals, annualCategoryTotals]
  )
  const varRows = useMemo(
    () => buildRows(sortedCats.filter((c) => c.section === 'variable')),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sortedCats, monthlyActuals, annualCategoryTotals]
  )
  const savingsRows = useMemo(
    () => buildRows(sortedCats.filter((c) => c.section === 'savings')),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sortedCats, monthlyActuals, annualCategoryTotals]
  )

  // Column totals for summary row
  const annualMonthlyIncome = activeMonthSlots.map((_, i) =>
    [...catSets.incomeIds].reduce((s, id) => s + (monthlyActuals[i][id] ?? 0), 0)
  )
  const annualMonthlyExpenses = activeMonthSlots.map((_, i) =>
    [...catSets.expenseIds].reduce((s, id) => s + (monthlyActuals[i][id] ?? 0), 0)
  )
  const annualMonthlySavings = activeMonthSlots.map((_, i) =>
    [...catSets.savingsIds].reduce((s, id) => s + (monthlyActuals[i][id] ?? 0), 0)
  )

  // Synthetic BudgetYear for deep dive — maps active slots into month keys '01'-'12'
  const activeBudgetYearData = useMemo((): BudgetYear => {
    if (viewMode === 'year') return data.budget.years[selectedYear] ?? { months: {} }
    const months: BudgetYear['months'] = {}
    for (let i = 0; i < activeMonthSlots.length; i++) {
      const { year, monthKey } = activeMonthSlots[i]
      const bm = (data.budget.years[year] ?? { months: {} }).months[monthKey]
      if (bm) months[String(i + 1).padStart(2, '0')] = bm
    }
    return { months }
  }, [viewMode, selectedYear, activeMonthSlots, data.budget.years])

  function handleRowClick(categoryId: string) {
    const cat = sortedCats.find((c) => c.id === categoryId)
    if (!cat) return
    setDeepDiveCategory({ categoryId: cat.id, label: cat.label, section: cat.section })
  }

  const surplusColor =
    surplus > 0
      ? 'text-green-600 dark:text-green-400'
      : surplus < 0
        ? 'text-red-500 dark:text-red-400'
        : ''

  const pageTitle = viewMode === 'rolling12' ? 'Rolling 12 Months' : 'Annual Overview'
  const pageSubtitle =
    viewMode === 'rolling12'
      ? `${activeMonthSlots[0].full} – ${activeMonthSlots[11].full}`
      : `Income, expenses, and savings for ${selectedYear}.`

  return (
    <div>
      <PageHeader
        title={pageTitle}
        subtitle={pageSubtitle}
        actions={
          <div className="flex items-center gap-2">
            <ViewToggle mode={viewMode} onChange={setViewMode} />
            {viewMode === 'year' && <YearSelector year={selectedYear} onChange={setYear} />}
          </div>
        }
      />

      {/* Hero stats */}
      <HeroStats
        cols={5}
        stats={[
          { label: 'Total Income', value: annualIncome > 0 ? fmt(annualIncome) : '$—' },
          { label: 'Total Expenses', value: annualExpenses > 0 ? fmt(annualExpenses) : '$—' },
          { label: 'Total Savings', value: annualSavings > 0 ? fmt(annualSavings) : '$—' },
          {
            label: 'Savings Rate',
            value: annualIncome > 0 ? `${savingsRate.toFixed(1)}%` : '—%',
            colorClass: savingsRate >= 20 ? 'text-green-600 dark:text-green-400' : '',
          },
          {
            label: 'Surplus',
            value: annualIncome > 0 ? fmt(surplus) : '$—',
            colorClass: surplusColor,
          },
        ]}
      />

      {/* Monthly trend chart */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <SectionHeading>Monthly Trends</SectionHeading>
          <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: '#10b981' }} />
              Income
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: '#f43f5e' }} />
              Expenses
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: '#6366f1' }} />
              Savings
            </span>
          </div>
        </div>
        <ExpandableChart
          title="Monthly Trends"
          renderChart={(h) => <MonthlyTrendChart data={monthlyTrendData} height={h} />}
        />
      </div>

      {/* Stacked spending breakdown + Cash flow Sankey — side by side on large screens */}
      <div className="grid xl:grid-cols-2 items-start gap-6 mb-8">
        <div>
          <SectionHeading>Spending by Type</SectionHeading>
          <ExpandableChart
            title="Spending by Type"
            height={320}
            toolbar={
              <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                {[
                  { label: 'Needs', color: '#6366f1' },
                  { label: 'Wants', color: '#8b5cf6' },
                  { label: 'Debt', color: '#f97316' },
                  { label: 'Savings', color: '#10b981' },
                ].map((s) => (
                  <span key={s.label} className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: s.color }} />
                    {s.label}
                  </span>
                ))}
              </div>
            }
            renderChart={(h) => <MonthlyStackedChart data={monthlyBreakdownData} height={h} />}
          />
        </div>

        <div>
          <SectionHeading>Cash Flow</SectionHeading>
          <ExpandableChart
            title="Cash Flow"
            height={348}
            expandedHeight={580}
            renderChart={(h) => (
              <CashFlowSankeyChart
                incomeCats={sortedCats.filter((c) => c.section === 'income')}
                fixedCats={sortedCats.filter((c) => c.section === 'fixed')}
                variableCats={sortedCats.filter((c) => c.section === 'variable')}
                savingsCats={sortedCats.filter((c) => c.section === 'savings')}
                actuals={annualCategoryTotals}
                height={h}
              />
            )}
          />
        </div>
      </div>

      {/* Average spending by type */}
      <HeroStats
        cols={4}
        stats={[
          {
            label: 'Avg Needs / mo',
            value: spendingTypeAverages.needs > 0 ? fmt(spendingTypeAverages.needs) : '$—',
          },
          {
            label: 'Avg Wants / mo',
            value: spendingTypeAverages.wants > 0 ? fmt(spendingTypeAverages.wants) : '$—',
          },
          {
            label: 'Avg Debt / mo',
            value: spendingTypeAverages.debt > 0 ? fmt(spendingTypeAverages.debt) : '$—',
          },
          {
            label: 'Avg Savings / mo',
            value: spendingTypeAverages.savings > 0 ? fmt(spendingTypeAverages.savings) : '$—',
          },
        ]}
      />

      {/* Breakdown table */}
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">
          {viewMode === 'rolling12' ? 'Rolling Breakdown' : 'Annual Breakdown'}
          <span className="normal-case font-normal tracking-normal text-gray-400 dark:text-gray-600 ml-2">
            — click any row to deep dive
          </span>
        </p>
        <AnnualBreakdownTable
          monthHeaders={activeMonthSlots.map((s) => s.abbr)}
          sections={
            [
              {
                title: 'Income',
                rows: incomeRows,
                accentClass: 'text-green-600 dark:text-green-400',
              },
              {
                title: 'Fixed Expenses',
                rows: fixedRows,
                accentClass: 'text-gray-600 dark:text-gray-300',
              },
              {
                title: 'Variable Expenses',
                rows: varRows,
                accentClass: 'text-gray-600 dark:text-gray-300',
              },
              {
                title: 'Savings & Investments',
                rows: savingsRows,
                accentClass: 'text-indigo-600 dark:text-indigo-400',
              },
            ] satisfies AnnualSectionConfig[]
          }
          summaryRows={
            [
              {
                label: 'Total Expenses',
                rowClass:
                  'border-t-2 border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800/50 font-semibold',
                stickyClass: 'bg-gray-100 dark:bg-gray-800/50',
                labelClass: 'text-gray-700 dark:text-gray-200',
                monthClass: 'text-gray-600 dark:text-gray-300',
                months: annualMonthlyExpenses.map((v) =>
                  v > 0 ? fmt(v) : <span className="text-gray-300 dark:text-gray-700">—</span>
                ),
                total: annualExpenses > 0 ? fmt(annualExpenses) : '—',
                totalClass: 'text-gray-700 dark:text-gray-200',
              },
              {
                label: 'Total Savings',
                rowClass:
                  'bg-gray-100 dark:bg-gray-800/50 font-semibold border-b border-gray-200 dark:border-gray-700',
                stickyClass: 'bg-gray-100 dark:bg-gray-800/50',
                labelClass: 'text-gray-700 dark:text-gray-200',
                monthClass: 'text-indigo-600 dark:text-indigo-400',
                months: annualMonthlySavings.map((v) =>
                  v > 0 ? fmt(v) : <span className="text-gray-300 dark:text-gray-700">—</span>
                ),
                total: annualSavings > 0 ? fmt(annualSavings) : '—',
                totalClass: 'text-indigo-600 dark:text-indigo-400',
              },
              {
                label: 'Savings Rate',
                rowClass:
                  'bg-gray-50 dark:bg-gray-900/40 border-b border-gray-200 dark:border-gray-700',
                stickyClass: 'bg-gray-50 dark:bg-gray-900/40',
                labelClass: 'text-gray-500 dark:text-gray-400 text-xs font-medium',
                monthClass: 'text-xs text-gray-400 dark:text-gray-500',
                months: activeMonthSlots.map((_, i) => {
                  const inc = annualMonthlyIncome[i]
                  const sav = annualMonthlySavings[i]
                  const rate = inc > 0 ? (sav / inc) * 100 : null
                  return rate !== null ? (
                    `${rate.toFixed(0)}%`
                  ) : (
                    <span className="text-gray-300 dark:text-gray-700">—</span>
                  )
                }),
                total: annualIncome > 0 ? `${savingsRate.toFixed(1)}%` : '—',
                totalClass: `text-xs font-medium ${savingsRate >= 20 ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`,
              },
            ] satisfies AnnualSummaryRow[]
          }
          onRowClick={handleRowClick}
        />
      </div>

      {/* Deep dive overlay */}
      {deepDiveCategory && (
        <CategoryDeepDive
          category={deepDiveCategory}
          yearData={activeBudgetYearData}
          monthAbbr={activeMonthSlots.map((s) => s.abbr)}
          monthFull={activeMonthSlots.map((s) => s.full)}
          totalActiveMonths={monthlyActuals.filter((m) => Object.keys(m).length > 0).length}
          onClose={() => setDeepDiveCategory(null)}
        />
      )}
    </div>
  )
}
