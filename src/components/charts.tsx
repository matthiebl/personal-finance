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
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { fmt, fmtAxis } from '../lib/finance'

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
}: {
  title: string
  height?: number
  expandedHeight?: number
  renderChart: (height: number) => ReactNode
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
      {renderChart(height)}
      {expanded && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-6 xl:p-24"
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
