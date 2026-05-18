import { useMemo, useState } from 'react'
import { DonutChart, FundsBarChart, GrowthBarChart } from '../components/charts'
import { HeroStats } from '../components/hero'
import { CurrencyInput, SuffixInput, TextInput } from '../components/inputs'
import { PageHeader, SectionHeading } from '../components/layout'
import { useAppData } from '../context/AppDataContext'
import { calcMonthsToGoal, fmt } from '../lib/finance'
import type { SinkingFundRow } from '../lib/types'

const FUND_COLORS = [
  '#6366f1',
  '#8b5cf6',
  '#ec4899',
  '#f43f5e',
  '#f97316',
  '#10b981',
  '#14b8a6',
  '#06b6d4',
  '#22c55e',
  '#94a3b8',
]

// Use SinkingFundRow as the local alias
type FundRow = SinkingFundRow

export default function SinkingFunds() {
  const { data, addSinkingFund, updateSinkingFund, removeSinkingFund } = useAppData()
  const rows: FundRow[] = data.sinkingFunds
  const [selectedFundId, setSelectedFundId] = useState('')
  const startDate = useMemo(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  }, [])

  const fundData = useMemo(
    () =>
      rows.map((r, i) => {
        const goalNum = parseFloat(r.goal) || 0
        const savedNum = parseFloat(r.saved) || 0
        const monthlyNum = parseFloat(r.monthly) || 0
        const rateNum = parseFloat(r.interestRate) || 0
        const progress = goalNum > 0 ? Math.min((savedNum / goalNum) * 100, 100) : 0
        const monthsLeft = calcMonthsToGoal(savedNum, goalNum, monthlyNum, rateNum)
        return {
          ...r,
          goalNum,
          savedNum,
          monthlyNum,
          rateNum,
          progress,
          monthsLeft,
          color: FUND_COLORS[i % FUND_COLORS.length],
        }
      }),
    [rows]
  )

  const totalGoal = useMemo(() => fundData.reduce((s, r) => s + r.goalNum, 0), [fundData])
  const totalSaved = useMemo(() => fundData.reduce((s, r) => s + r.savedNum, 0), [fundData])
  const overallProgress = totalGoal > 0 ? Math.min((totalSaved / totalGoal) * 100, 100) : 0

  const pieSegments = fundData
    .filter((r) => r.goalNum > 0)
    .map((r) => ({ label: r.name || 'Unnamed', value: r.goalNum, color: r.color }))

  const chartFunds = fundData
    .filter((r) => r.goalNum > 0)
    .map((r) => ({ name: r.name || 'Unnamed', goal: r.goalNum, saved: r.savedNum, color: r.color }))

  const update = (id: string, field: keyof FundRow, value: string) =>
    updateSinkingFund(id, { [field]: value })

  const addRow = () => addSinkingFund()
  const removeRow = (id: string) => removeSinkingFund(id)

  const fundsWithGoal = fundData.filter((r) => r.goalNum > 0)
  const selectedFund =
    fundsWithGoal.find((r) => r.id === selectedFundId) ?? fundsWithGoal[0] ?? null

  const progressBarColor =
    overallProgress >= 100
      ? 'bg-green-500 dark:bg-green-400'
      : overallProgress >= 50
        ? 'bg-amber-500 dark:bg-amber-400'
        : 'bg-blue-500 dark:bg-blue-400'

  return (
    <div className="max-w-7xl">
      <PageHeader
        title="Sinking Funds"
        subtitle="Plan and track savings for known future expenses."
      />

      <HeroStats
        stats={[
          { label: 'Total Funds Goal', value: totalGoal > 0 ? fmt(totalGoal) : '$—' },
          { label: 'Total Saved', value: totalSaved > 0 ? fmt(totalSaved) : '$—' },
          {
            label: 'Overall Progress',
            value: totalGoal > 0 ? `${overallProgress.toFixed(1)}%` : '—%',
            progress: { pct: overallProgress, colorClass: progressBarColor },
          },
        ]}
      />

      <div className="grid grid-cols-2 gap-6 mb-8">
        <div className="flex flex-col">
          <SectionHeading>Fund Breakdown</SectionHeading>
          <div className="flex-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 flex gap-6 items-center">
            <div className="shrink-0 w-44">
              <DonutChart segments={pieSegments} emptyMessage="Add funds to see breakdown" />
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
                      {totalGoal > 0 ? `${((s.value / totalGoal) * 100).toFixed(0)}%` : '—'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400 dark:text-gray-600">
                Enter funds with goals to see breakdown
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col">
          <SectionHeading>Saved vs Goal</SectionHeading>
          <div className="flex-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 flex flex-col">
            <div className="flex items-center gap-4 mb-3 shrink-0">
              <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: '#6366f1' }} />
                Saved
              </div>
              <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                <span className="w-2.5 h-2.5 rounded-sm bg-slate-200 dark:bg-slate-700" />
                Remaining
              </div>
            </div>
            <div className="flex-1 min-h-0">
              <FundsBarChart funds={chartFunds} height="100%" />
            </div>
          </div>
        </div>
      </div>

      <div>
        <SectionHeading>Sinking Funds</SectionHeading>
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800">
                <th className="py-2 pl-4 w-8" />
                <th className="text-left py-2 px-2 font-medium text-gray-500 dark:text-gray-400">
                  Fund Name
                </th>
                <th className="text-right py-2 px-2 font-medium text-gray-500 dark:text-gray-400 w-36">
                  Goal Amount
                </th>
                <th className="text-right py-2 px-2 font-medium text-gray-500 dark:text-gray-400 w-36">
                  Saved
                </th>
                <th className="text-right py-2 px-2 font-medium text-gray-500 dark:text-gray-400 w-36">
                  Monthly
                </th>
                <th className="text-right py-2 px-2 font-medium text-gray-500 dark:text-gray-400 w-28">
                  Interest Rate
                </th>
                <th className="text-right py-2 px-2 font-medium text-gray-500 dark:text-gray-400 w-24">
                  Months Left
                </th>
                <th className="text-left py-2 pl-2 pr-4 font-medium text-gray-500 dark:text-gray-400 w-44">
                  Progress
                </th>
                <th className="w-8 pr-2" />
              </tr>
            </thead>
            <tbody>
              {fundData.map((fund) => (
                <tr
                  key={fund.id}
                  className="border-b border-gray-100 dark:border-gray-800/60 even:bg-gray-50/50 dark:even:bg-gray-900/30"
                >
                  <td className="py-1.5 pl-4 pr-2">
                    <span
                      className="block w-2 h-2 rounded-sm mt-0.5"
                      style={{ backgroundColor: fund.goalNum > 0 ? fund.color : '#d1d5db' }}
                    />
                  </td>
                  <td className="py-1.5 px-2">
                    <TextInput
                      compact
                      value={fund.name}
                      onChange={(v) => update(fund.id, 'name', v)}
                      placeholder="Fund name"
                    />
                  </td>
                  <td className="py-1.5 px-2">
                    <CurrencyInput
                      compact
                      value={fund.goal}
                      onChange={(v) => update(fund.id, 'goal', v)}
                    />
                  </td>
                  <td className="py-1.5 px-2">
                    <CurrencyInput
                      compact
                      value={fund.saved}
                      onChange={(v) => update(fund.id, 'saved', v)}
                    />
                  </td>
                  <td className="py-1.5 px-2">
                    <CurrencyInput
                      compact
                      value={fund.monthly}
                      onChange={(v) => update(fund.id, 'monthly', v)}
                    />
                  </td>
                  <td className="py-1.5 px-2">
                    <SuffixInput
                      compact
                      value={fund.interestRate}
                      onChange={(v) => update(fund.id, 'interestRate', v)}
                      suffix="%"
                      placeholder="0.00"
                    />
                  </td>
                  <td className="py-1.5 px-2 text-right tabular-nums text-gray-500 dark:text-gray-400">
                    {fund.monthsLeft !== null ? `${fund.monthsLeft} mo` : '—'}
                  </td>
                  <td className="py-1.5 pl-2 pr-4">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${fund.progress}%`,
                            backgroundColor: fund.goalNum > 0 ? fund.color : 'transparent',
                          }}
                        />
                      </div>
                      <span className="text-xs tabular-nums text-gray-400 dark:text-gray-600 w-10 text-right shrink-0">
                        {fund.goalNum > 0 ? `${Math.round(fund.progress)}%` : '—'}
                      </span>
                    </div>
                  </td>
                  <td className="py-1.5 pr-3 text-center">
                    <button
                      onClick={() => removeRow(fund.id)}
                      className="text-gray-300 dark:text-gray-700 hover:text-red-400 dark:hover:text-red-500 transition-colors text-base leading-none"
                      aria-label="Remove fund"
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-2.5 border-t border-gray-100 dark:border-gray-800/60">
            <button
              onClick={addRow}
              className="text-xs text-gray-400 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-400 transition-colors"
            >
              + Add Fund
            </button>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <SectionHeading>Growth Projection</SectionHeading>
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              {[
                { label: 'Initial', color: '#6366f1' },
                { label: 'Deposits', color: '#8b5cf6' },
                { label: 'Interest', color: '#10b981' },
              ].map((l) => (
                <div key={l.label} className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: l.color }} />
                  {l.label}
                </div>
              ))}
            </div>
            {fundsWithGoal.length > 0 && (
              <select
                value={selectedFund?.id ?? ''}
                onChange={(e) => setSelectedFundId(e.target.value)}
                className="border border-gray-300 dark:border-gray-700 rounded px-2.5 py-1.5 text-sm bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-400 dark:focus:ring-gray-600"
              >
                {fundsWithGoal.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name || 'Unnamed Fund'}
                  </option>
                ))}
              </select>
            )}
          </div>
          {selectedFund ? (
            <GrowthBarChart
              initialBalance={selectedFund.savedNum}
              monthlyContribution={selectedFund.monthlyNum}
              annualRate={selectedFund.rateNum}
              target={selectedFund.goalNum}
              startDate={startDate}
            />
          ) : (
            <GrowthBarChart
              initialBalance={0}
              monthlyContribution={0}
              annualRate={0}
            />
          )}
        </div>
      </div>
    </div>
  )
}
