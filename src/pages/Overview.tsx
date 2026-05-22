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
import { useSearchParams } from 'react-router-dom'
import { DonutChart, ExpandableChart, IncomeVsOutgoingChart, MonthlyTrendChart } from '../components/charts'
import type { DonutSegment, IncomeOutgoingDatum, TrendDatum } from '../components/charts'
import { HeroStats } from '../components/hero'
import { PageHeader, SectionHeading } from '../components/layout'
import { useAppData } from '../context/AppDataContext'
import { fmt, fmtAxis, fmtCents } from '../lib/finance'
import type { BudgetCategory, BudgetYear, Transaction } from '../lib/types'

const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTH_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const MONTH_KEYS = MONTH_ABBR.map((_, i) => String(i + 1).padStart(2, '0'))

const PALETTE = ['#6366f1', '#8b5cf6', '#f97316', '#10b981', '#14b8a6', '#f43f5e', '#ec4899', '#06b6d4', '#22c55e', '#94a3b8']

// ─── Types ────────────────────────────────────────────────────────────────────

type AnnualTableRow = {
  categoryId: string
  label: string
  monthlyTotals: number[]
  annualTotal: number
  section: BudgetCategory['section']
}

type StackedDatum = { month: string; needs: number; wants: number; debt: number; savings: number }

type DeepDiveCategory = {
  categoryId: string
  label: string
  section: BudgetCategory['section']
}

// ─── YearSelector ─────────────────────────────────────────────────────────────

function YearSelector({ year, onChange }: { year: string; onChange: (delta: number) => void }) {
  return (
    <div className="flex items-center rounded-full border border-gray-200 dark:border-gray-700">
      <button
        onClick={() => onChange(-1)}
        className="px-2.5 py-1.5 text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-l-full transition-colors text-sm leading-none"
      >
        ‹
      </button>
      <span className="px-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 tabular-nums select-none">
        {year}
      </span>
      <button
        onClick={() => onChange(1)}
        className="px-2.5 py-1.5 text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-r-full transition-colors text-sm leading-none"
      >
        ›
      </button>
    </div>
  )
}

// ─── MonthlyStackedChart ──────────────────────────────────────────────────────

type StackedTooltipPayload = { name: string; value: number; fill: string }

function StackedTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: StackedTooltipPayload[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  const nonZero = payload.filter((p) => p.value > 0)
  const total = nonZero.reduce((s, p) => s + p.value, 0)
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 shadow-md text-xs">
      <p className="font-medium text-gray-700 dark:text-gray-200 mb-1.5">{label}</p>
      {nonZero.map((p) => (
        <div key={p.name} className="flex items-center justify-between gap-4 mb-0.5">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: p.fill }} />
            <span className="text-gray-500 dark:text-gray-400">{p.name}</span>
          </div>
          <span className="tabular-nums text-gray-700 dark:text-gray-200">{fmt(p.value)}</span>
        </div>
      ))}
      {nonZero.length > 1 && (
        <div className="border-t border-gray-200 dark:border-gray-700 mt-1.5 pt-1.5 flex justify-between">
          <span className="font-medium text-gray-700 dark:text-gray-200">Total</span>
          <span className="font-medium tabular-nums text-gray-700 dark:text-gray-200">{fmt(total)}</span>
        </div>
      )}
    </div>
  )
}

function MonthlyStackedChart({ data, height = 260 }: { data: StackedDatum[]; height?: number }) {
  const hasData = data.some((d) => d.needs > 0 || d.wants > 0 || d.debt > 0 || d.savings > 0)
  if (!hasData) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <p className="text-xs text-gray-400 dark:text-gray-600">Add transactions to see breakdown</p>
      </div>
    )
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap="25%">
        <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={fmtAxis} tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={48} />
        <Tooltip content={<StackedTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
        <Bar dataKey="needs" stackId="a" fill="#6366f1" name="Needs" />
        <Bar dataKey="wants" stackId="a" fill="#8b5cf6" name="Wants" />
        <Bar dataKey="debt" stackId="a" fill="#f97316" name="Debt" />
        <Bar dataKey="savings" stackId="a" fill="#10b981" name="Savings" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

// ─── AnnualTableSection ───────────────────────────────────────────────────────

function AnnualTableSection({
  title,
  rows,
  onRowClick,
  accentClass,
}: {
  title: string
  rows: AnnualTableRow[]
  onRowClick: (categoryId: string) => void
  accentClass: string
}) {
  const [open, setOpen] = useState(true)
  const sectionTotals = MONTH_ABBR.map((_, i) => rows.reduce((s, r) => s + r.monthlyTotals[i], 0))
  const sectionAnnual = rows.reduce((s, r) => s + r.annualTotal, 0)

  return (
    <>
      <tr
        onClick={() => setOpen((o) => !o)}
        className="cursor-pointer bg-gray-50 dark:bg-gray-900/60 border-b border-gray-200 dark:border-gray-800"
      >
        <td className="sticky left-0 z-10 bg-gray-50 dark:bg-gray-900/60 py-2 pr-4 pl-3">
          <span className="text-xs mr-1.5 text-gray-400">{open ? '▾' : '▸'}</span>
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            {title}
          </span>
        </td>
        {sectionTotals.map((v, i) => (
          <td key={i} className="py-2 px-3 text-right tabular-nums text-xs font-medium text-gray-500 dark:text-gray-400">
            {v > 0 ? fmt(v) : <span className="text-gray-300 dark:text-gray-700">—</span>}
          </td>
        ))}
        <td className={`py-2 pl-3 pr-4 text-right tabular-nums text-xs font-semibold ${accentClass}`}>
          {sectionAnnual > 0 ? fmt(sectionAnnual) : <span className="text-gray-300 dark:text-gray-700">—</span>}
        </td>
      </tr>
      {open &&
        rows.map((row) => (
          <tr
            key={row.categoryId}
            onClick={() => onRowClick(row.categoryId)}
            className="cursor-pointer border-b border-gray-100 dark:border-gray-800/60 even:bg-gray-50/50 dark:even:bg-gray-900/30 hover:bg-indigo-50/40 dark:hover:bg-indigo-900/10 transition-colors"
          >
            <td className="sticky left-0 z-10 bg-white dark:bg-gray-950 even-row:bg-gray-50/50 py-2 pr-4 pl-6 text-gray-700 dark:text-gray-300 text-sm">
              {row.label}
              <span className="ml-1.5 text-[10px] text-gray-300 dark:text-gray-700 group-hover:text-indigo-300">↗</span>
            </td>
            {row.monthlyTotals.map((v, i) => (
              <td key={i} className="py-2 px-3 text-right tabular-nums text-sm text-gray-600 dark:text-gray-400">
                {v > 0 ? fmtCents(v) : <span className="text-gray-300 dark:text-gray-700">—</span>}
              </td>
            ))}
            <td className="py-2 pl-3 pr-4 text-right tabular-nums text-sm font-medium text-gray-700 dark:text-gray-200">
              {row.annualTotal > 0 ? fmtCents(row.annualTotal) : <span className="text-gray-300 dark:text-gray-700">—</span>}
            </td>
          </tr>
        ))}
    </>
  )
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
      <span className="tabular-nums text-gray-600 dark:text-gray-300">{fmtCents(payload[0].value)}</span>
    </div>
  )
}

function CategoryDeepDive({
  category,
  yearData,
  onClose,
}: {
  category: DeepDiveCategory
  yearData: BudgetYear
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
        } else if (txTags.every((tag) => excludedTags.has(tag))) {
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
    return MONTH_ABBR.map((month, i) => ({ month, amount: totals[i] }))
  }, [filteredTxWithMonth])

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
    const groups: { monthIdx: number; label: string; transactions: Transaction[]; total: number }[] = []
    for (let i = 0; i < 12; i++) {
      const txs = filteredTxWithMonth.filter((x) => x.monthIdx === i).map((x) => x.tx)
      if (txs.length > 0) {
        const total = txs.reduce((s, t) => s + (parseFloat(t.amount) || 0), 0)
        groups.push({ monthIdx: i, label: MONTH_FULL[i], transactions: txs, total })
      }
    }
    return groups
  }, [filteredTxWithMonth])

  const grandTotal = filteredTxWithMonth.reduce((s, { tx }) => s + (parseFloat(tx.amount) || 0), 0)

  function toggleTag(tag: string) {
    setExcludedTags((prev) => {
      const next = new Set(prev)
      next.has(tag) ? next.delete(tag) : next.add(tag)
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
            <p className="font-semibold text-gray-800 dark:text-gray-100 text-base">{category.label}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 tabular-nums">
              {grandTotal > 0 ? fmtCents(grandTotal) : '$—'} across {filteredTxWithMonth.length} transaction{filteredTxWithMonth.length !== 1 ? 's' : ''}
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
                  <BarChart data={monthlyBarData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barCategoryGap="30%">
                    <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={fmtAxis} tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={44} />
                    <Tooltip content={<DeepDiveTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
                    <Bar dataKey="amount" fill="#6366f1" radius={[3, 3, 0, 0]} name={category.label} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-45">
                  <p className="text-xs text-gray-400 dark:text-gray-600">No transactions in this year</p>
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
                          <span className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: seg.color }} />
                          <span className="text-gray-600 dark:text-gray-400">{seg.label}</span>
                        </div>
                        <span className="tabular-nums text-gray-700 dark:text-gray-300">{fmtCents(seg.value)}</span>
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
                      <p className="text-xs font-medium text-gray-400 dark:text-gray-500">{group.label}</p>
                      <span className="text-xs tabular-nums text-gray-400 dark:text-gray-500">{fmtCents(group.total)}</span>
                    </div>
                    <div className="rounded-lg border border-gray-100 dark:border-gray-800 overflow-hidden">
                      {group.transactions.map((tx, i) => {
                        const isSelected = descriptionFilter === tx.description
                        return (
                          <div
                            key={tx.id}
                            onClick={() => tx.description && toggleDescriptionFilter(tx.description)}
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
                              <span className={`truncate block ${isSelected ? 'text-indigo-700 dark:text-indigo-300 font-medium' : 'text-gray-700 dark:text-gray-300'}`}>
                                {tx.description || <span className="text-gray-300 dark:text-gray-700">—</span>}
                              </span>
                              {tx.tags && (
                                <span className="text-xs text-gray-400 dark:text-gray-600 mt-0.5 block">{tx.tags}</span>
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
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedYear = searchParams.get('year') ?? String(new Date().getFullYear())
  const [deepDiveCategory, setDeepDiveCategory] = useState<DeepDiveCategory | null>(null)

  function setYear(delta: number) {
    setSearchParams(
      (p) => {
        p.set('year', String(parseInt(selectedYear) + delta))
        return p
      },
      { replace: true }
    )
  }

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

  // Year data
  const yearData = useMemo(
    () => data.budget.years[selectedYear] ?? { months: {} },
    [data.budget.years, selectedYear]
  )

  // Monthly actuals — Record<'01'..'12', Record<catId, number>>
  const monthlyActuals = useMemo(() => {
    const result: Record<string, Record<string, number>> = {}
    for (const key of MONTH_KEYS) {
      const bm = yearData.months[key]
      const map: Record<string, number> = {}
      if (bm) {
        for (const tx of bm.transactions) {
          if (tx.categoryId) map[tx.categoryId] = (map[tx.categoryId] ?? 0) + (parseFloat(tx.amount) || 0)
        }
      }
      result[key] = map
    }
    return result
  }, [yearData])

  // Annual totals per category
  const annualCategoryTotals = useMemo(() => {
    const totals: Record<string, number> = {}
    for (const map of Object.values(monthlyActuals)) {
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
    return MONTH_KEYS.map((key, i) => {
      const actuals = monthlyActuals[key]
      const income = [...catSets.incomeIds].reduce((s, id) => s + (actuals[id] ?? 0), 0)
      const expenses = [...catSets.expenseIds].reduce((s, id) => s + (actuals[id] ?? 0), 0)
      const savings = [...catSets.savingsIds].reduce((s, id) => s + (actuals[id] ?? 0), 0)
      return { month: MONTH_ABBR[i], income, expenses, savings }
    })
  }, [monthlyActuals, catSets])

  // Monthly income vs outgoing (expenses + savings)
  const monthlyIncomeOutgoingData = useMemo((): IncomeOutgoingDatum[] => {
    return MONTH_KEYS.map((key, i) => {
      const actuals = monthlyActuals[key]
      const income = [...catSets.incomeIds].reduce((s, id) => s + (actuals[id] ?? 0), 0)
      const outgoing = [...catSets.expenseIds].reduce((s, id) => s + (actuals[id] ?? 0), 0)
      return { month: MONTH_ABBR[i], income, outgoing }
    })
  }, [monthlyActuals, catSets])

  // Monthly stacked breakdown
  const monthlyBreakdownData = useMemo((): StackedDatum[] => {
    return MONTH_KEYS.map((key, i) => {
      const actuals = monthlyActuals[key]
      let needs = 0, wants = 0, debt = 0, savings = 0
      for (const [id, amt] of Object.entries(actuals)) {
        if (catSets.incomeIds.has(id)) continue
        if (catSets.savingsIds.has(id)) {
          savings += amt
        } else {
          const et = catSets.catToExpenseType[id]
          if (et === 'need') needs += amt
          else if (et === 'want') wants += amt
          else if (et === 'debt') debt += amt
          // uncategorised non-income expenses are intentionally omitted
        }
      }
      return { month: MONTH_ABBR[i], needs, wants, debt, savings }
    })
  }, [monthlyActuals, catSets])

  // Annual table rows per section
  function buildRows(cats: BudgetCategory[]): AnnualTableRow[] {
    return cats.map((c) => ({
      categoryId: c.id,
      label: c.label,
      monthlyTotals: MONTH_KEYS.map((key) => monthlyActuals[key][c.id] ?? 0),
      annualTotal: annualCategoryTotals[c.id] ?? 0,
      section: c.section,
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

  // Annual column totals for summary row
  const annualMonthlyIncome = MONTH_KEYS.map((key) =>
    [...catSets.incomeIds].reduce((s, id) => s + (monthlyActuals[key][id] ?? 0), 0)
  )
  const annualMonthlyExpenses = MONTH_KEYS.map((key) =>
    [...catSets.expenseIds].reduce((s, id) => s + (monthlyActuals[key][id] ?? 0), 0)
  )
  const annualMonthlySavings = MONTH_KEYS.map((key) =>
    [...catSets.savingsIds].reduce((s, id) => s + (monthlyActuals[key][id] ?? 0), 0)
  )

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

  return (
    <div>
      <PageHeader
        title="Annual Overview"
        subtitle={`Income, expenses, and savings for ${selectedYear}.`}
        actions={<YearSelector year={selectedYear} onChange={setYear} />}
      />

      {/* Hero stats */}
      <HeroStats
        cols={5}
        stats={[
          { label: 'Annual Income', value: annualIncome > 0 ? fmt(annualIncome) : '$—' },
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

      {/* Income vs outgoing */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <SectionHeading>Income vs Outgoing</SectionHeading>
          <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: '#10b981' }} />
              Income
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: '#f43f5e' }} />
              Outgoing
            </span>
          </div>
        </div>
        <ExpandableChart
          title="Income vs Outgoing"
          renderChart={(h) => <IncomeVsOutgoingChart data={monthlyIncomeOutgoingData} height={h} />}
        />
      </div>

      {/* Stacked spending breakdown */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <SectionHeading>Spending by Type</SectionHeading>
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
        </div>
        <ExpandableChart
          title="Spending by Type"
          renderChart={(h) => <MonthlyStackedChart data={monthlyBreakdownData} height={h} />}
        />
      </div>

      {/* Annual breakdown table */}
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">
          Annual Breakdown
          <span className="normal-case font-normal tracking-normal text-gray-400 dark:text-gray-600 ml-2">
            — click any row to deep dive
          </span>
        </p>
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
          <table className="w-full text-sm border-collapse" style={{ minWidth: 960 }}>
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800">
                <th className="sticky left-0 z-10 bg-white dark:bg-gray-950 text-left py-2.5 pr-4 pl-4 font-medium text-gray-500 dark:text-gray-400 w-40">
                  Category
                </th>
                {MONTH_ABBR.map((m) => (
                  <th key={m} className="text-right py-2.5 px-3 font-medium text-gray-500 dark:text-gray-400 min-w-18">
                    {m}
                  </th>
                ))}
                <th className="text-right py-2.5 pl-3 pr-4 font-semibold text-gray-700 dark:text-gray-300 min-w-21">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              <AnnualTableSection
                title="Income"
                rows={incomeRows}
                onRowClick={handleRowClick}
                accentClass="text-green-600 dark:text-green-400"
              />
              <AnnualTableSection
                title="Fixed Expenses"
                rows={fixedRows}
                onRowClick={handleRowClick}
                accentClass="text-gray-600 dark:text-gray-300"
              />
              <AnnualTableSection
                title="Variable Expenses"
                rows={varRows}
                onRowClick={handleRowClick}
                accentClass="text-gray-600 dark:text-gray-300"
              />
              <AnnualTableSection
                title="Savings & Investments"
                rows={savingsRows}
                onRowClick={handleRowClick}
                accentClass="text-indigo-600 dark:text-indigo-400"
              />

              {/* Summary: Total Expenses */}
              <tr className="border-t-2 border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800/50 font-semibold">
                <td className="sticky left-0 z-10 bg-gray-100 dark:bg-gray-800/50 py-2.5 pr-4 pl-4 text-gray-700 dark:text-gray-200 text-sm">
                  Total Expenses
                </td>
                {annualMonthlyExpenses.map((v, i) => (
                  <td key={i} className="py-2.5 px-3 text-right tabular-nums text-sm text-gray-600 dark:text-gray-300">
                    {v > 0 ? fmt(v) : <span className="text-gray-300 dark:text-gray-700">—</span>}
                  </td>
                ))}
                <td className="py-2.5 pl-3 pr-4 text-right tabular-nums text-sm text-gray-700 dark:text-gray-200">
                  {annualExpenses > 0 ? fmt(annualExpenses) : '—'}
                </td>
              </tr>

              {/* Summary: Net Savings */}
              <tr className="bg-gray-100 dark:bg-gray-800/50 font-semibold border-b border-gray-200 dark:border-gray-700">
                <td className="sticky left-0 z-10 bg-gray-100 dark:bg-gray-800/50 py-2.5 pr-4 pl-4 text-gray-700 dark:text-gray-200 text-sm">
                  Total Savings
                </td>
                {annualMonthlySavings.map((v, i) => (
                  <td key={i} className="py-2.5 px-3 text-right tabular-nums text-sm text-indigo-600 dark:text-indigo-400">
                    {v > 0 ? fmt(v) : <span className="text-gray-300 dark:text-gray-700">—</span>}
                  </td>
                ))}
                <td className="py-2.5 pl-3 pr-4 text-right tabular-nums text-sm text-indigo-600 dark:text-indigo-400">
                  {annualSavings > 0 ? fmt(annualSavings) : '—'}
                </td>
              </tr>

              {/* Summary: Savings Rate */}
              <tr className="bg-gray-50 dark:bg-gray-900/40 border-b border-gray-200 dark:border-gray-700">
                <td className="sticky left-0 z-10 bg-gray-50 dark:bg-gray-900/40 py-2.5 pr-4 pl-4 text-gray-500 dark:text-gray-400 text-xs font-medium">
                  Savings Rate
                </td>
                {MONTH_KEYS.map((_, i) => {
                  const inc = annualMonthlyIncome[i]
                  const sav = annualMonthlySavings[i]
                  const rate = inc > 0 ? (sav / inc) * 100 : null
                  return (
                    <td key={i} className="py-2.5 px-3 text-right tabular-nums text-xs text-gray-400 dark:text-gray-500">
                      {rate !== null ? `${rate.toFixed(0)}%` : <span className="text-gray-300 dark:text-gray-700">—</span>}
                    </td>
                  )
                })}
                <td
                  className={`py-2.5 pl-3 pr-4 text-right tabular-nums text-xs font-medium ${
                    savingsRate >= 20 ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {annualIncome > 0 ? `${savingsRate.toFixed(1)}%` : '—'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Deep dive overlay */}
      {deepDiveCategory && (
        <CategoryDeepDive
          category={deepDiveCategory}
          yearData={yearData}
          onClose={() => setDeepDiveCategory(null)}
        />
      )}
    </div>
  )
}
