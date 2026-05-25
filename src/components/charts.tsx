import type { ReactNode } from 'react'
import { useMemo, useState } from 'react'
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Sankey,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { PayoffPeriodDatum } from '../lib/finance'
import { fmt, fmtAxis } from '../lib/finance'
import type { BudgetCategory } from '../lib/types'

export type DonutSegment = { label: string; value: number; color: string }

type TooltipEntry = { name: string; value?: number; payload: { color: string } }

function DonutTooltip({ active, payload }: { active?: boolean; payload?: TooltipEntry[] }) {
  if (!active || !payload?.length) return null
  const item = payload[0]
  const formatted = fmt(item.value ?? 0)
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 shadow-md text-xs">
      <div className="flex items-center gap-1.5 mb-1">
        <span
          className="w-2 h-2 rounded-sm shrink-0"
          style={{ backgroundColor: item.payload.color }}
        />
        <span className="font-medium text-gray-700 dark:text-gray-200">{item.name}</span>
      </div>
      <p className="text-gray-500 dark:text-gray-400">{formatted}</p>
    </div>
  )
}

// ─── Growth Bar Chart ────────────────────────────────────────────────────────

type GrowthBarDatum = { label: string; initial: number; deposits: number; interest: number }

const MONTH_NAMES = [
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

function stepLabel(
  step: number,
  useYearly: boolean,
  startYear: number,
  startMonth: number
): string {
  if (useYearly) {
    return String(startYear + step)
  }
  const total = startMonth + step
  return `${MONTH_NAMES[total % 12]} ${startYear + Math.floor(total / 12)}`
}

function buildGrowthSteps(
  initialBalance: number,
  monthlyContribution: number,
  annualRate: number,
  target: number,
  startDate?: string
): { data: GrowthBarDatum[]; useYearly: boolean } {
  const rm = annualRate / 12 / 100

  let monthsNeeded = 0
  if (target > 0 && initialBalance < target) {
    let bal = initialBalance
    for (let n = 1; n <= 1200; n++) {
      bal = bal * (1 + rm) + monthlyContribution
      if (bal >= target) {
        monthsNeeded = n
        break
      }
    }
    if (monthsNeeded === 0) monthsNeeded = 120
  } else if (target <= 0 && (monthlyContribution > 0 || annualRate > 0)) {
    monthsNeeded = 24
  }

  const useYearly = monthsNeeded > 36

  let startYear = 0
  let startMonth = 0
  if (startDate) {
    const [y, m] = startDate.split('-').map(Number)
    startYear = y
    startMonth = m - 1 // 0-indexed
  }

  const data: GrowthBarDatum[] = []
  let totalDeposits = 0
  let totalBalance = initialBalance

  if (useYearly) {
    const maxYears = Math.min(Math.ceil(monthsNeeded / 12), 30)
    for (let y = 1; y <= maxYears; y++) {
      for (let m = 0; m < 12; m++) {
        totalBalance = totalBalance * (1 + rm) + monthlyContribution
        totalDeposits += monthlyContribution
      }
      const label = startDate ? stepLabel(y, true, startYear, startMonth) : `Year ${y}`
      data.push({
        label,
        initial: initialBalance,
        deposits: Math.max(0, totalDeposits),
        interest: Math.max(0, totalBalance - initialBalance - totalDeposits),
      })
      if (target > 0 && totalBalance >= target) break
    }
  } else if (monthsNeeded > 0) {
    const maxMonths = Math.min(monthsNeeded, 60)
    for (let m = 1; m <= maxMonths; m++) {
      totalBalance = totalBalance * (1 + rm) + monthlyContribution
      totalDeposits += monthlyContribution
      const label = startDate ? stepLabel(m, false, startYear, startMonth) : `Mo ${m}`
      data.push({
        label,
        initial: initialBalance,
        deposits: Math.max(0, totalDeposits),
        interest: Math.max(0, totalBalance - initialBalance - totalDeposits),
      })
      if (target > 0 && totalBalance >= target) break
    }
  }

  return { data, useYearly }
}

const GROWTH_LABELS: Record<string, string> = {
  initial: 'Initial',
  deposits: 'Deposits',
  interest: 'Interest',
}

type GrowthTooltipPayload = { name: string; value: number; fill: string }

function GrowthTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: GrowthTooltipPayload[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  const nonZero = payload.filter((p) => p.value > 0)
  const total = payload.reduce((s, p) => s + p.value, 0)
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 shadow-md text-xs">
      <p className="font-medium text-gray-700 dark:text-gray-200 mb-1.5">{label}</p>
      {nonZero.map((p) => (
        <div key={p.name} className="flex items-center justify-between gap-4 mb-0.5">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: p.fill }} />
            <span className="text-gray-500 dark:text-gray-400">
              {GROWTH_LABELS[p.name] ?? p.name}
            </span>
          </div>
          <span className="text-gray-700 dark:text-gray-200 tabular-nums">{fmt(p.value)}</span>
        </div>
      ))}
      {nonZero.length > 1 && (
        <div className="border-t border-gray-200 dark:border-gray-700 mt-1.5 pt-1.5 flex justify-between">
          <span className="font-medium text-gray-700 dark:text-gray-200">Total</span>
          <span className="font-medium text-gray-700 dark:text-gray-200 tabular-nums">
            {fmt(total)}
          </span>
        </div>
      )}
    </div>
  )
}

export function GrowthBarChart({
  initialBalance,
  monthlyContribution,
  annualRate,
  target,
  startDate,
  height = 260,
}: {
  initialBalance: number
  monthlyContribution: number
  annualRate: number
  target?: number
  startDate?: string
  height?: number
}) {
  const { data } = useMemo(
    () => buildGrowthSteps(initialBalance, monthlyContribution, annualRate, target ?? 0, startDate),
    [initialBalance, monthlyContribution, annualRate, target, startDate]
  )

  const tickInterval =
    data.length <= 12
      ? 0
      : data.length <= 24
        ? 1
        : data.length <= 36
          ? 2
          : Math.floor(data.length / 10)

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <p className="text-xs text-gray-400 dark:text-gray-600">
          Enter a balance or contribution to see growth projection
        </p>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap="20%">
        <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 10, fill: '#9ca3af' }}
          axisLine={false}
          tickLine={false}
          interval={tickInterval}
        />
        <YAxis
          tickFormatter={fmtAxis}
          tick={{ fontSize: 10, fill: '#9ca3af' }}
          axisLine={false}
          tickLine={false}
          width={48}
        />
        <Tooltip content={<GrowthTooltip />} cursor={false} />
        {target != null && target > 0 && (
          <ReferenceLine
            y={target}
            stroke="#f43f5e"
            strokeDasharray="4 4"
            strokeWidth={1.5}
            label={{ value: 'Target', position: 'insideTopRight', fontSize: 10, fill: '#f43f5e' }}
          />
        )}
        <Bar dataKey="initial" stackId="g" fill="#6366f1" />
        <Bar dataKey="deposits" stackId="g" fill="#8b5cf6" />
        <Bar dataKey="interest" stackId="g" fill="#10b981" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

// ─── Funds Bar Chart ─────────────────────────────────────────────────────────

type FundsDatum = { name: string; saved: number; remaining: number; color: string; total: number }

type FundsTooltipProps = {
  active?: boolean
  payload?: { payload: FundsDatum }[]
  label?: string
}

function FundsTooltip({ active, payload, label }: FundsTooltipProps) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 shadow-md text-xs">
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: d.color }} />
        <p className="font-medium text-gray-700 dark:text-gray-200">{label}</p>
      </div>
      <div className="flex justify-between gap-4 mb-0.5">
        <span className="text-gray-500 dark:text-gray-400">Saved</span>
        <span className="tabular-nums text-gray-700 dark:text-gray-200">{fmt(d.saved)}</span>
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-gray-500 dark:text-gray-400">Goal</span>
        <span className="tabular-nums text-gray-700 dark:text-gray-200">{fmt(d.total)}</span>
      </div>
      <div className="border-t border-gray-200 dark:border-gray-700 mt-1.5 pt-1.5 flex justify-between">
        <span className="font-medium text-gray-500 dark:text-gray-400">Progress</span>
        <span className="font-medium tabular-nums text-gray-700 dark:text-gray-200">
          {d.total > 0 ? `${((d.saved / d.total) * 100).toFixed(1)}%` : '—'}
        </span>
      </div>
    </div>
  )
}

export function FundsBarChart({
  funds,
  height = 220,
}: {
  funds: { name: string; goal: number; saved: number; color: string }[]
  height?: number | `${number}%`
}) {
  const data: FundsDatum[] = funds.map((f) => ({
    name: f.name,
    saved: Math.min(f.saved, f.goal),
    remaining: Math.max(f.goal - f.saved, 0),
    color: f.color,
    total: f.goal,
  }))

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <p className="text-xs text-gray-400 dark:text-gray-600">
          Add funds with a goal to see chart
        </p>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap="35%">
        <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 10, fill: '#9ca3af' }}
          axisLine={false}
          tickLine={false}
          angle={-35}
          textAnchor="end"
          interval={0}
          height={50}
        />
        <YAxis
          tickFormatter={fmtAxis}
          tick={{ fontSize: 10, fill: '#9ca3af' }}
          axisLine={false}
          tickLine={false}
          width={48}
        />
        <Tooltip content={<FundsTooltip />} cursor={false} />
        <Bar dataKey="saved" stackId="s">
          {data.map((d, i) => (
            <Cell key={i} fill={d.color} />
          ))}
        </Bar>
        <Bar dataKey="remaining" stackId="s" fill="#e2e8f0" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

// ─── Donut Chart ─────────────────────────────────────────────────────────────

export function DonutChart({
  segments,
  height = 180,
  emptyMessage = 'No data',
}: {
  segments: DonutSegment[]
  height?: number
  emptyMessage?: string
}) {
  const total = segments.reduce((s, d) => s + d.value, 0)

  if (total === 0) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <p className="text-xs text-gray-400 dark:text-gray-600">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={segments}
          dataKey="value"
          nameKey="label"
          cx="50%"
          cy="50%"
          innerRadius="52%"
          outerRadius="80%"
          strokeWidth={0}
        >
          {segments.map((s) => (
            <Cell key={s.label} fill={s.color} />
          ))}
        </Pie>
        <Tooltip content={<DonutTooltip />} />
      </PieChart>
    </ResponsiveContainer>
  )
}

// ─── Monthly Trend Chart ─────────────────────────────────────────────────────

export type TrendDatum = { month: string; income: number; expenses: number; savings: number }

type TrendTooltipPayload = { name: string; value: number; color: string }

function TrendTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: TrendTooltipPayload[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  const nonZero = payload.filter((p) => p.value > 0)
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 shadow-md text-xs">
      <p className="font-medium text-gray-700 dark:text-gray-200 mb-1.5">{label}</p>
      {nonZero.map((p) => (
        <div key={p.name} className="flex items-center justify-between gap-4 mb-0.5">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: p.color }} />
            <span className="text-gray-500 dark:text-gray-400">{p.name}</span>
          </div>
          <span className="tabular-nums text-gray-700 dark:text-gray-200">{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

export function MonthlyTrendChart({ data, height = 260 }: { data: TrendDatum[]; height?: number }) {
  const hasData = data.some((d) => d.income > 0 || d.expenses > 0 || d.savings > 0)
  if (!hasData) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <p className="text-xs text-gray-400 dark:text-gray-600">
          Add transactions to see annual trends
        </p>
      </div>
    )
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis
          dataKey="month"
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
        <Tooltip content={<TrendTooltip />} cursor={{ stroke: '#e5e7eb', strokeWidth: 1 }} />
        <Area
          type="monotone"
          dataKey="income"
          name="Income"
          fill="#10b981"
          stroke="#10b981"
          fillOpacity={0.12}
          strokeWidth={2}
          dot={false}
        />
        <Area
          type="monotone"
          dataKey="expenses"
          name="Expenses"
          fill="#f43f5e"
          stroke="#f43f5e"
          fillOpacity={0.12}
          strokeWidth={2}
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="savings"
          name="Savings"
          stroke="#6366f1"
          strokeWidth={2}
          dot={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}

// ─── Income vs Outgoing Chart ─────────────────────────────────────────────────

export type IncomeOutgoingDatum = { month: string; income: number; outgoing: number }

function IncomeOutgoingTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: TrendTooltipPayload[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  const nonZero = payload.filter((p) => p.value > 0)
  const income = payload.find((p) => p.name === 'Income')?.value ?? 0
  const outgoing = payload.find((p) => p.name === 'Outgoing')?.value ?? 0
  const surplus = income - outgoing
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 shadow-md text-xs">
      <p className="font-medium text-gray-700 dark:text-gray-200 mb-1.5">{label}</p>
      {nonZero.map((p) => (
        <div key={p.name} className="flex items-center justify-between gap-4 mb-0.5">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: p.color }} />
            <span className="text-gray-500 dark:text-gray-400">{p.name}</span>
          </div>
          <span className="tabular-nums text-gray-700 dark:text-gray-200">{fmt(p.value)}</span>
        </div>
      ))}
      {income > 0 && outgoing > 0 && (
        <div className="border-t border-gray-200 dark:border-gray-700 mt-1.5 pt-1.5 flex justify-between">
          <span className="text-gray-500 dark:text-gray-400">Surplus</span>
          <span
            className={`tabular-nums font-medium ${surplus >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}
          >
            {fmt(surplus)}
          </span>
        </div>
      )}
    </div>
  )
}

export function IncomeVsOutgoingChart({
  data,
  height = 260,
}: {
  data: IncomeOutgoingDatum[]
  height?: number
}) {
  const hasData = data.some((d) => d.income > 0 || d.outgoing > 0)
  if (!hasData) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <p className="text-xs text-gray-400 dark:text-gray-600">
          Add transactions to see income vs outgoing
        </p>
      </div>
    )
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis
          dataKey="month"
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
        <Tooltip
          content={<IncomeOutgoingTooltip />}
          cursor={{ stroke: '#e5e7eb', strokeWidth: 1 }}
        />
        <Area
          type="monotone"
          dataKey="income"
          name="Income"
          fill="#10b981"
          stroke="#10b981"
          fillOpacity={0.15}
          strokeWidth={2}
          dot={false}
        />
        <Area
          type="monotone"
          dataKey="outgoing"
          name="Outgoing"
          fill="#f43f5e"
          stroke="#f43f5e"
          fillOpacity={0.15}
          strokeWidth={2}
          dot={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}

// ─── Monthly Stacked Spending Chart ──────────────────────────────────────────

export type StackedDatum = {
  month: string
  needs: number
  wants: number
  debt: number
  savings: number
}

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
          <span className="font-medium tabular-nums text-gray-700 dark:text-gray-200">
            {fmt(total)}
          </span>
        </div>
      )}
    </div>
  )
}

export function MonthlyStackedChart({
  data,
  height = 260,
}: {
  data: StackedDatum[]
  height?: number
}) {
  const hasData = data.some((d) => d.needs > 0 || d.wants > 0 || d.debt > 0 || d.savings > 0)
  if (!hasData) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <p className="text-xs text-gray-400 dark:text-gray-600">
          Add transactions to see breakdown
        </p>
      </div>
    )
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap="25%">
        <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis
          dataKey="month"
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
        <Tooltip content={<StackedTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
        <Bar dataKey="needs" stackId="a" fill="#6366f1" name="Needs" />
        <Bar dataKey="wants" stackId="a" fill="#8b5cf6" name="Wants" />
        <Bar dataKey="debt" stackId="a" fill="#f97316" name="Debt" />
        <Bar dataKey="savings" stackId="a" fill="#10b981" name="Savings" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

// ─── Expandable Chart ────────────────────────────────────────────────────────

export function ExpandableChart({
  title,
  height = 260,
  expandedHeight = 480,
  renderChart,
  toolbar,
}: {
  title: string
  height?: number
  expandedHeight?: number
  renderChart: (height: number) => ReactNode
  toolbar?: ReactNode
}) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div className="relative bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
      <button
        onClick={() => setExpanded(true)}
        className="absolute z-50 top-3 right-3 p-1 rounded text-gray-300 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors "
        aria-label="Expand chart"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        >
          <path d="M1 5V1h4M9 1h4v4M13 9v4H9M5 13H1V9" />
        </svg>
      </button>
      {toolbar && <div className="mb-3 pr-6">{toolbar}</div>}
      {renderChart(height)}
      {expanded && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center sm:p-6 xl:p-24"
          onClick={() => setExpanded(false)}
        >
          <div
            className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <p className="font-semibold text-gray-700 dark:text-gray-200">{title}</p>
              <button
                onClick={() => setExpanded(false)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-lg leading-none"
              >
                ×
              </button>
            </div>
            {renderChart(expandedHeight)}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Networth Stacked Chart ───────────────────────────────────────────────────

export type NetworthSeriesEntry = { id: string; label: string; color: string }
export type NetworthDatum = { month: string; networth: number; [key: string]: number | string }

type NetworthTooltipPayload = { name: string; value: number; fill: string; dataKey: string }

function NetworthTooltip({
  active,
  payload,
  label,
  assetSeries,
  liabilitySeries,
}: {
  active?: boolean
  payload?: NetworthTooltipPayload[]
  label?: string
  assetSeries: NetworthSeriesEntry[]
  liabilitySeries: NetworthSeriesEntry[]
}) {
  if (!active || !payload?.length) return null

  const assetIds = new Set(assetSeries.map((s) => s.id))
  const liabilityIds = new Set(liabilitySeries.map((s) => s.id))

  const assetItems = payload.filter((p) => assetIds.has(p.dataKey) && p.value !== 0)
  const liabilityItems = payload.filter((p) => liabilityIds.has(p.dataKey) && p.value !== 0)
  const networthItem = payload.find((p) => p.dataKey === 'networth')

  const totalAssets = assetItems.reduce((s, p) => s + p.value, 0)
  const totalLiabilities = liabilityItems.reduce((s, p) => s + Math.abs(p.value), 0)

  if (totalAssets === 0 && totalLiabilities === 0) return null

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 shadow-md text-xs min-w-36">
      <p className="font-medium text-gray-700 dark:text-gray-200 mb-1.5">{label}</p>
      {assetItems.length > 0 && (
        <>
          <p className="text-gray-400 dark:text-gray-500 uppercase tracking-wide text-[10px] mb-0.5">
            Assets
          </p>
          {assetItems.map((p) => (
            <div key={p.dataKey} className="flex items-center justify-between gap-4 mb-0.5">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: p.fill }} />
                <span className="text-gray-500 dark:text-gray-400 truncate max-w-28">{p.name}</span>
              </div>
              <span className="tabular-nums text-gray-700 dark:text-gray-200">{fmt(p.value)}</span>
            </div>
          ))}
        </>
      )}
      {liabilityItems.length > 0 && (
        <>
          <p className="text-gray-400 dark:text-gray-500 uppercase tracking-wide text-[10px] mt-1.5 mb-0.5">
            Liabilities
          </p>
          {liabilityItems.map((p) => (
            <div key={p.dataKey} className="flex items-center justify-between gap-4 mb-0.5">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: p.fill }} />
                <span className="text-gray-500 dark:text-gray-400 truncate max-w-28">{p.name}</span>
              </div>
              <span className="tabular-nums text-gray-700 dark:text-gray-200">
                {fmt(Math.abs(p.value))}
              </span>
            </div>
          ))}
        </>
      )}
      <div className="border-t border-gray-200 dark:border-gray-700 mt-1.5 pt-1.5 space-y-0.5">
        {totalAssets > 0 && totalLiabilities > 0 && (
          <>
            <div className="flex justify-between">
              <span className="text-gray-400 dark:text-gray-500">Total Assets</span>
              <span className="tabular-nums text-green-600 dark:text-green-400">
                {fmt(totalAssets)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400 dark:text-gray-500">Total Liabilities</span>
              <span className="tabular-nums text-red-500 dark:text-red-400">
                {fmt(totalLiabilities)}
              </span>
            </div>
          </>
        )}
        {networthItem !== undefined && (
          <div className="flex justify-between font-medium">
            <span className="text-gray-700 dark:text-gray-200">Net Worth</span>
            <span
              className={`tabular-nums ${networthItem.value >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-red-500 dark:text-red-400'}`}
            >
              {fmt(networthItem.value)}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

export function NetworthStackedChart({
  data,
  assetSeries,
  liabilitySeries,
  height = 320,
}: {
  data: NetworthDatum[]
  assetSeries: NetworthSeriesEntry[]
  liabilitySeries: NetworthSeriesEntry[]
  height?: number
}) {
  const hasData = data.some(
    (d) => d.networth !== 0 || assetSeries.some((s) => (d[s.id] as number) !== 0)
  )
  if (!hasData) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <p className="text-xs text-gray-400 dark:text-gray-600">
          Add assets and liabilities to see net worth over time
        </p>
      </div>
    )
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis
          dataKey="month"
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
        <ReferenceLine y={0} stroke="#e5e7eb" strokeWidth={1} />
        <Tooltip
          content={<NetworthTooltip assetSeries={assetSeries} liabilitySeries={liabilitySeries} />}
          cursor={{ stroke: '#e5e7eb', strokeWidth: 1 }}
        />
        {assetSeries.map((s) => (
          <Area
            key={s.id}
            type="monotone"
            dataKey={s.id}
            name={s.label}
            stackId="assets"
            fill={s.color}
            stroke={s.color}
            fillOpacity={0.4}
            strokeWidth={1}
            dot={false}
          />
        ))}
        {liabilitySeries.map((s) => (
          <Area
            key={s.id}
            type="monotone"
            dataKey={s.id}
            name={s.label}
            stackId="liabilities"
            fill={s.color}
            stroke={s.color}
            fillOpacity={0.4}
            strokeWidth={1}
            dot={false}
          />
        ))}
        <Line
          type="monotone"
          dataKey="networth"
          name="Net Worth"
          stroke="#6366f1"
          strokeWidth={2.5}
          dot={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}

// ─── Cash Flow Sankey Chart ───────────────────────────────────────────────────

type CashFlowNode = { name: string; color: string }
type CashFlowLink = { source: number; target: number; value: number }

type SankeyNodePayload = CashFlowNode & { value: number; depth: number }
type SankeyLinkPayload = { source: SankeyNodePayload; target: SankeyNodePayload; value: number }

type SankeyNodeRendererProps = {
  x?: number
  y?: number
  width?: number
  height?: number
  index?: number
  payload?: SankeyNodePayload
  containerWidth?: number
}

type SankeyLinkRendererProps = {
  sourceX?: number
  sourceY?: number
  sourceControlX?: number
  targetX?: number
  targetY?: number
  targetControlX?: number
  linkWidth?: number
  payload?: SankeyLinkPayload
}

// Categories below this fraction of their section total, or beyond the top-N, are grouped into "Other"
const SMALL_CAT_THRESHOLD = 0.1
const MAX_CATS_PER_SECTION = 4

function SankeyNodeRenderer({
  x = 0,
  y = 0,
  width = 0,
  height = 0,
  payload,
}: SankeyNodeRendererProps) {
  const depth = (payload as unknown as { depth?: number })?.depth ?? 0
  const color = payload?.color ?? '#9ca3af'
  const name = payload?.name ?? ''
  const value = payload?.value ?? 0
  const centerY = y + height / 2

  // Depth-2 nodes (section groups + Surplus): label inside the rect
  if (depth === 2) {
    const shortName =
      name === 'Fixed Expenses' ? 'Fixed' : name === 'Variable Expenses' ? 'Variable' : name
    return (
      <g>
        <rect x={x} y={y} width={width} height={height} fill={color} fillOpacity={0.9} rx={2} />
        {height >= 18 && (
          <text
            x={x + width / 2}
            y={centerY}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={9}
            fontWeight={500}
            fill="white"
          >
            {shortName}
          </text>
        )}
      </g>
    )
  }

  // All other nodes: external label
  // depth 0 (income sources) and depth 1 (Total Income): label to the right
  // depth 3 (individual cats): label to the left
  const isRight = depth >= 3
  const labelX = isRight ? x - 8 : x + width + 8
  const anchor = isRight ? 'end' : 'start'

  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill={color} fillOpacity={0.85} rx={2} />
      {height > 6 && (
        <text
          x={labelX}
          y={height < 22 ? centerY : centerY - 7}
          textAnchor={anchor}
          fontSize={10}
          fill="#6b7280"
        >
          {name}
        </text>
      )}
      {height >= 22 && (
        <text x={labelX} y={centerY + 7} textAnchor={anchor} fontSize={9} fill="#9ca3af">
          {fmt(value)}
        </text>
      )}
    </g>
  )
}

function SankeyLinkRenderer({
  sourceX = 0,
  sourceY = 0,
  sourceControlX = 0,
  targetX = 0,
  targetY = 0,
  targetControlX = 0,
  linkWidth = 0,
  payload,
}: SankeyLinkRendererProps) {
  const color = payload?.source?.color ?? '#9ca3af'
  const half = linkWidth / 2
  const d = `M${sourceX},${sourceY - half}
    C${sourceControlX},${sourceY - half} ${targetControlX},${targetY - half} ${targetX},${targetY - half}
    L${targetX},${targetY + half}
    C${targetControlX},${targetY + half} ${sourceControlX},${sourceY + half} ${sourceX},${sourceY + half}
    Z`
  return <path d={d} fill={color} fillOpacity={0.18} stroke="none" />
}

export function CashFlowSankeyChart({
  incomeCats,
  fixedCats,
  variableCats,
  savingsCats,
  actuals,
  height = 400,
}: {
  incomeCats: BudgetCategory[]
  fixedCats: BudgetCategory[]
  variableCats: BudgetCategory[]
  savingsCats: BudgetCategory[]
  actuals: Record<string, number>
  height?: number
}) {
  const sankeyData = useMemo(() => {
    const activeIncome = incomeCats.filter((c) => (actuals[c.id] ?? 0) > 0)
    const activeFixed = fixedCats.filter((c) => (actuals[c.id] ?? 0) > 0)
    const activeVariable = variableCats.filter((c) => (actuals[c.id] ?? 0) > 0)
    const activeSavings = savingsCats.filter((c) => (actuals[c.id] ?? 0) > 0)

    const totalIncome = activeIncome.reduce((s, c) => s + (actuals[c.id] ?? 0), 0)
    if (totalIncome === 0) return null

    const totalFixed = activeFixed.reduce((s, c) => s + (actuals[c.id] ?? 0), 0)
    const totalVariable = activeVariable.reduce((s, c) => s + (actuals[c.id] ?? 0), 0)
    const totalSavingsAmt = activeSavings.reduce((s, c) => s + (actuals[c.id] ?? 0), 0)
    const surplus = totalIncome - totalFixed - totalVariable - totalSavingsAmt

    // Split each section: show top-N cats above threshold individually, group the rest into "Other"
    function splitSection(cats: BudgetCategory[], sectionTotal: number) {
      const threshold = sectionTotal * SMALL_CAT_THRESHOLD
      const sorted = [...cats].sort((a, b) => (actuals[b.id] ?? 0) - (actuals[a.id] ?? 0))
      const shown = sorted
        .slice(0, MAX_CATS_PER_SECTION)
        .filter((c) => (actuals[c.id] ?? 0) >= threshold)
      const shownIds = new Set(shown.map((c) => c.id))
      const otherTotal = cats
        .filter((c) => !shownIds.has(c.id))
        .reduce((s, c) => s + (actuals[c.id] ?? 0), 0)
      return { shown, otherTotal }
    }

    const { shown: shownFixed, otherTotal: otherFixed } = splitSection(activeFixed, totalFixed)
    const { shown: shownVariable, otherTotal: otherVariable } = splitSection(
      activeVariable,
      totalVariable
    )
    const { shown: shownSavings, otherTotal: otherSavings } = splitSection(
      activeSavings,
      totalSavingsAmt
    )

    // Build node index counters
    let idx = 0
    const incomeStart = idx
    idx += activeIncome.length
    const centreIdx = idx++

    let fixedGroupIdx = -1
    if (totalFixed > 0) fixedGroupIdx = idx++
    let variableGroupIdx = -1
    if (totalVariable > 0) variableGroupIdx = idx++
    let savingsGroupIdx = -1
    if (totalSavingsAmt > 0) savingsGroupIdx = idx++

    const fixedCatStart = idx
    idx += shownFixed.length + (otherFixed > 0 ? 1 : 0)
    const variableCatStart = idx
    idx += shownVariable.length + (otherVariable > 0 ? 1 : 0)
    const savingsCatStart = idx
    idx += shownSavings.length + (otherSavings > 0 ? 1 : 0)

    const surplusIdx = surplus > 0 ? idx : -1

    // Nodes — order must exactly match the index counters above
    const nodes: CashFlowNode[] = [
      ...activeIncome.map((c) => ({ name: c.label, color: '#10b981' })),
      { name: 'Total Income', color: '#059669' },
      ...(totalFixed > 0 ? [{ name: 'Fixed Expenses', color: '#6366f1' }] : []),
      ...(totalVariable > 0 ? [{ name: 'Variable Expenses', color: '#8b5cf6' }] : []),
      ...(totalSavingsAmt > 0 ? [{ name: 'Savings', color: '#14b8a6' }] : []),
      ...shownFixed.map((c) => ({ name: c.label, color: '#818cf8' })),
      ...(otherFixed > 0 ? [{ name: 'Other Fixed', color: '#a5b4fc' }] : []),
      ...shownVariable.map((c) => ({ name: c.label, color: '#a78bfa' })),
      ...(otherVariable > 0 ? [{ name: 'Other Variable', color: '#c4b5fd' }] : []),
      ...shownSavings.map((c) => ({ name: c.label, color: '#2dd4bf' })),
      ...(otherSavings > 0 ? [{ name: 'Other Savings', color: '#5eead4' }] : []),
      ...(surplus > 0 ? [{ name: 'Surplus', color: '#22c55e' }] : []),
    ]

    const links: CashFlowLink[] = [
      // Income sources → Total Income
      ...activeIncome.map((c, i) => ({
        source: incomeStart + i,
        target: centreIdx,
        value: actuals[c.id] ?? 0,
      })),
      // Total Income → section groups (+ surplus directly)
      ...(fixedGroupIdx >= 0
        ? [{ source: centreIdx, target: fixedGroupIdx, value: totalFixed }]
        : []),
      ...(variableGroupIdx >= 0
        ? [{ source: centreIdx, target: variableGroupIdx, value: totalVariable }]
        : []),
      ...(savingsGroupIdx >= 0
        ? [{ source: centreIdx, target: savingsGroupIdx, value: totalSavingsAmt }]
        : []),
      ...(surplusIdx >= 0 ? [{ source: centreIdx, target: surplusIdx, value: surplus }] : []),
      // Fixed group → individual fixed cats
      ...(fixedGroupIdx >= 0
        ? [
            ...shownFixed.map((c, i) => ({
              source: fixedGroupIdx,
              target: fixedCatStart + i,
              value: actuals[c.id] ?? 0,
            })),
            ...(otherFixed > 0
              ? [
                  {
                    source: fixedGroupIdx,
                    target: fixedCatStart + shownFixed.length,
                    value: otherFixed,
                  },
                ]
              : []),
          ]
        : []),
      // Variable group → individual variable cats
      ...(variableGroupIdx >= 0
        ? [
            ...shownVariable.map((c, i) => ({
              source: variableGroupIdx,
              target: variableCatStart + i,
              value: actuals[c.id] ?? 0,
            })),
            ...(otherVariable > 0
              ? [
                  {
                    source: variableGroupIdx,
                    target: variableCatStart + shownVariable.length,
                    value: otherVariable,
                  },
                ]
              : []),
          ]
        : []),
      // Savings group → individual savings cats
      ...(savingsGroupIdx >= 0
        ? [
            ...shownSavings.map((c, i) => ({
              source: savingsGroupIdx,
              target: savingsCatStart + i,
              value: actuals[c.id] ?? 0,
            })),
            ...(otherSavings > 0
              ? [
                  {
                    source: savingsGroupIdx,
                    target: savingsCatStart + shownSavings.length,
                    value: otherSavings,
                  },
                ]
              : []),
          ]
        : []),
    ]

    return { nodes, links }
  }, [incomeCats, fixedCats, variableCats, savingsCats, actuals])

  if (!sankeyData) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <p className="text-xs text-gray-400 dark:text-gray-600">
          Add income and expense transactions to see cash flow
        </p>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <Sankey
        data={sankeyData}
        node={(props) => <SankeyNodeRenderer {...(props as unknown as SankeyNodeRendererProps)} />}
        link={(props) => <SankeyLinkRenderer {...(props as unknown as SankeyLinkRendererProps)} />}
        nodePadding={12}
        nodeWidth={12}
        iterations={0}
        margin={{ top: 15, right: 15, left: 15, bottom: 15 }}
      />
    </ResponsiveContainer>
  )
}

// ─── Debt Payoff Chart ────────────────────────────────────────────────────────

export type DebtPayoffChartSeries = { id: string; label: string; color: string }

function DebtPayoffTooltip({
  active,
  payload,
  label,
  series,
}: {
  active?: boolean
  payload?: { dataKey: string; value: number }[]
  label?: string
  series: DebtPayoffChartSeries[]
}) {
  if (!active || !payload?.length) return null
  const seriesMap = Object.fromEntries(series.map((s) => [s.id, s]))
  const items = payload.filter((p) => (p.value ?? 0) > 0)
  const total = items.reduce((s, p) => s + (p.value ?? 0), 0)
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 shadow-md text-xs">
      <p className="font-medium text-gray-700 dark:text-gray-200 mb-1.5">{label}</p>
      {[...items].reverse().map((p) => {
        const s = seriesMap[p.dataKey]
        if (!s) return null
        return (
          <div key={p.dataKey} className="flex items-center justify-between gap-4 mb-0.5">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: s.color }} />
              <span className="text-gray-600 dark:text-gray-400">{s.label}</span>
            </div>
            <span className="tabular-nums text-gray-700 dark:text-gray-200">{fmt(p.value)}</span>
          </div>
        )
      })}
      {items.length > 1 && (
        <div className="flex items-center justify-between gap-4 mt-1 pt-1 border-t border-gray-100 dark:border-gray-700">
          <span className="text-gray-500 dark:text-gray-400">Total</span>
          <span className="tabular-nums font-medium text-gray-700 dark:text-gray-200">
            {fmt(total)}
          </span>
        </div>
      )}
    </div>
  )
}

export function DebtPayoffChart({
  data,
  series,
  height = 280,
}: {
  data: PayoffPeriodDatum[]
  series: DebtPayoffChartSeries[]
  height?: number | string
}) {
  if (data.length === 0 || series.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-xs text-gray-400 dark:text-gray-600"
        style={{ height }}
      >
        Add debts to see payoff timeline
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={height as number}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid
          vertical={false}
          strokeDasharray="3 3"
          stroke="#e5e7eb"
          className="dark:stroke-gray-700"
        />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: '#9ca3af' }}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tickFormatter={fmtAxis}
          tick={{ fontSize: 11, fill: '#9ca3af' }}
          tickLine={false}
          axisLine={false}
          width={52}
        />
        <Tooltip
          content={(props) => (
            <DebtPayoffTooltip
              active={props.active}
              payload={props.payload as unknown as { dataKey: string; value: number }[]}
              label={props.label as string}
              series={series}
            />
          )}
          cursor={{ fill: 'rgba(0,0,0,0.04)' }}
        />
        {series.map((s) => (
          <Area
            key={s.id}
            type="monotone"
            dataKey={s.id}
            name={s.label}
            stackId="debts"
            fill={s.color}
            stroke={s.color}
            fillOpacity={0.6}
            strokeWidth={1}
            dot={false}
          />
        ))}
      </ComposedChart>
    </ResponsiveContainer>
  )
}
