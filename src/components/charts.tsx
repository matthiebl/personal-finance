import { useMemo } from 'react'
import { fmt, fmtAxis } from '../lib/finance'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

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
          <span className="text-gray-700 dark:text-gray-200 tabular-nums">
            {fmt(p.value)}
          </span>
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
