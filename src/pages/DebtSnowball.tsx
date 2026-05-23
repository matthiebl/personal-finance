import { useMemo, useState } from 'react'
import type { DebtPayoffChartSeries } from '../components/charts'
import { DebtPayoffChart, DonutChart } from '../components/charts'
import { HeroStats } from '../components/hero'
import { CurrencyInput, SuffixInput, TextInput } from '../components/inputs'
import { PageHeader, SectionHeading } from '../components/layout'
import { useAppData } from '../context/useAppData'
import { calcDebtPayoff, fmt, formatYearMonth } from '../lib/finance'

const DEBT_COLORS = [
  '#f43f5e',
  '#f97316',
  '#fbbf24',
  '#a78bfa',
  '#6366f1',
  '#06b6d4',
  '#10b981',
  '#ec4899',
  '#8b5cf6',
  '#94a3b8',
]

export default function DebtSnowball() {
  const { data, addDebtRow, updateDebtRow, removeDebtRow, setDebtExtraPayment } = useAppData()
  const [strategy, setStrategy] = useState<'snowball' | 'avalanche'>('snowball')

  const startYearMonth = useMemo(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  }, [])

  const debtData = useMemo(
    () =>
      data.debtRows.map((r, i) => ({
        ...r,
        balanceNum: parseFloat(r.balance) || 0,
        minNum: parseFloat(r.minPayment) || 0,
        rateNum: parseFloat(r.interestRate) || 0,
        color: DEBT_COLORS[i % DEBT_COLORS.length],
      })),
    [data.debtRows]
  )

  const extraNum = parseFloat(data.debtExtraPayment) || 0

  const payoffResult = useMemo(
    () =>
      calcDebtPayoff(
        debtData.map((d) => ({
          id: d.id,
          name: d.name,
          balance: d.balanceNum,
          minPayment: d.minNum,
          rate: d.rateNum,
        })),
        extraNum,
        strategy,
        startYearMonth
      ),
    [debtData, extraNum, strategy, startYearMonth]
  )

  const payoffOrder = useMemo(() => {
    const sorted = [...debtData]
      .filter((d) => d.balanceNum > 0)
      .sort(
        strategy === 'snowball'
          ? (a, b) => a.balanceNum - b.balanceNum
          : (a, b) => b.rateNum - a.rateNum
      )
    const order: Record<string, number> = {}
    sorted.forEach((d, i) => {
      order[d.id] = i + 1
    })
    return order
  }, [debtData, strategy])

  const totalBalance = useMemo(() => debtData.reduce((s, d) => s + d.balanceNum, 0), [debtData])
  const totalMin = useMemo(() => debtData.reduce((s, d) => s + d.minNum, 0), [debtData])

  const debtFreeLabel = useMemo(() => {
    const dates = Object.values(payoffResult.payoffDates).filter(Boolean) as string[]
    if (dates.length === 0) return '—'
    const last = [...dates].sort().at(-1)!
    return formatYearMonth(last)
  }, [payoffResult.payoffDates])

  const donutSegments = debtData
    .filter((d) => d.balanceNum > 0)
    .map((d) => ({ label: d.name || 'Unnamed', value: d.balanceNum, color: d.color }))

  const chartSeries: DebtPayoffChartSeries[] = [...debtData]
    .filter((d) => d.balanceNum > 0)
    .sort(
      strategy === 'snowball'
        ? (a, b) => a.balanceNum - b.balanceNum
        : (a, b) => b.rateNum - a.rateNum
    )
    .map((d) => ({ id: d.id, label: d.name || 'Unnamed', color: d.color }))

  const update = (id: string, field: keyof (typeof data.debtRows)[number], value: string) =>
    updateDebtRow(id, { [field]: value })

  return (
    <div className="max-w-384">
      <PageHeader
        title="Debt Snowball"
        subtitle="List your debts, set a payoff order, and track your progress."
      />

      <HeroStats
        stats={[
          {
            label: 'Total Debt',
            value: totalBalance > 0 ? fmt(totalBalance) : '$—',
            colorClass: 'text-red-500 dark:text-red-400',
          },
          { label: 'Total Min. Payments', value: totalMin > 0 ? fmt(totalMin) : '$—' },
          {
            label: 'Extra Payment Budget',
            value: extraNum > 0 ? fmt(extraNum) : '$—',
            colorClass: 'text-green-600 dark:text-green-400',
          },
          { label: 'Est. Debt-Free', value: debtFreeLabel },
        ]}
      />

      <div className="mb-5 flex items-center gap-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
          Strategy
        </p>
        <div className="flex border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden text-sm">
          <button
            onClick={() => setStrategy('snowball')}
            className={
              strategy === 'snowball'
                ? 'px-4 py-1.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-medium'
                : 'px-4 py-1.5 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors'
            }
          >
            Snowball
          </button>
          <button
            onClick={() => setStrategy('avalanche')}
            className={
              strategy === 'avalanche'
                ? 'px-4 py-1.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-medium'
                : 'px-4 py-1.5 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors'
            }
          >
            Avalanche
          </button>
        </div>
        <span className="text-xs text-gray-400 dark:text-gray-600">
          Snowball = lowest balance first · Avalanche = highest rate first
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="flex flex-col">
          <SectionHeading>Debt Breakdown</SectionHeading>
          <div className="flex-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 flex gap-6 items-center">
            <div className="shrink-0 w-44">
              <DonutChart segments={donutSegments} emptyMessage="Add debts to see breakdown" />
            </div>
            {donutSegments.length > 0 ? (
              <div className="flex-1 space-y-1.5 min-w-0">
                {donutSegments.map((s) => (
                  <div key={s.label} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span
                        className="w-2 h-2 rounded-sm shrink-0"
                        style={{ backgroundColor: s.color }}
                      />
                      <span className="text-gray-600 dark:text-gray-400 truncate">{s.label}</span>
                    </div>
                    <span className="text-gray-500 dark:text-gray-400 tabular-nums ml-2 shrink-0">
                      {totalBalance > 0 ? `${((s.value / totalBalance) * 100).toFixed(0)}%` : '—'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400 dark:text-gray-600">
                Enter debts with balances to see breakdown
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col">
          <SectionHeading>Payoff Timeline</SectionHeading>
          <div className="flex-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 flex flex-col">
            {chartSeries.length > 0 && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-3 shrink-0">
                {chartSeries.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400"
                  >
                    <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: s.color }} />
                    {s.label}
                  </div>
                ))}
              </div>
            )}
            <div className="flex-1 min-h-48">
              <DebtPayoffChart data={payoffResult.series} series={chartSeries} height="100%" />
            </div>
          </div>
        </div>
      </div>

      <div>
        <SectionHeading>Your Debts</SectionHeading>
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-x-auto">
          <table className="w-full min-w-max text-sm border-collapse">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800">
                <th className="text-center py-2 pl-4 pr-2 font-medium text-gray-500 dark:text-gray-400 w-12">
                  Order
                </th>
                <th className="text-left py-2 px-2 font-medium text-gray-500 dark:text-gray-400">
                  Debt Name
                </th>
                <th className="text-right py-2 px-2 font-medium text-gray-500 dark:text-gray-400 w-36">
                  Balance
                </th>
                <th className="text-right py-2 px-2 font-medium text-gray-500 dark:text-gray-400 w-36">
                  Min. Payment
                </th>
                <th className="text-right py-2 px-2 font-medium text-gray-500 dark:text-gray-400 w-28">
                  Interest Rate
                </th>
                <th className="text-right py-2 px-2 font-medium text-gray-500 dark:text-gray-400 w-28">
                  Est. Payoff
                </th>
                <th className="w-8 pr-2" />
              </tr>
            </thead>
            <tbody>
              {debtData.map((debt) => {
                const payoffDate = payoffResult.payoffDates[debt.id]
                return (
                  <tr
                    key={debt.id}
                    className="border-b border-gray-100 dark:border-gray-800/60 even:bg-gray-50/50 dark:even:bg-gray-900/30"
                  >
                    <td className="py-1.5 pl-4 pr-2 text-center">
                      {debt.balanceNum > 0 ? (
                        <span
                          className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold text-white"
                          style={{ backgroundColor: debt.color }}
                        >
                          {payoffOrder[debt.id] ?? '—'}
                        </span>
                      ) : (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-800 text-xs font-semibold text-gray-400 dark:text-gray-600">
                          —
                        </span>
                      )}
                    </td>
                    <td className="py-1.5 px-2">
                      <TextInput
                        compact
                        value={debt.name}
                        onChange={(v) => update(debt.id, 'name', v)}
                        placeholder="Debt name"
                      />
                    </td>
                    <td className="py-1.5 px-2">
                      <CurrencyInput
                        compact
                        value={debt.balance}
                        onChange={(v) => update(debt.id, 'balance', v)}
                      />
                    </td>
                    <td className="py-1.5 px-2">
                      <CurrencyInput
                        compact
                        value={debt.minPayment}
                        onChange={(v) => update(debt.id, 'minPayment', v)}
                      />
                    </td>
                    <td className="py-1.5 px-2">
                      <SuffixInput
                        compact
                        value={debt.interestRate}
                        onChange={(v) => update(debt.id, 'interestRate', v)}
                        suffix="%"
                        placeholder="0.00"
                      />
                    </td>
                    <td className="py-1.5 px-2 text-right tabular-nums text-gray-500 dark:text-gray-400 text-xs">
                      {payoffDate ? formatYearMonth(payoffDate) : '—'}
                    </td>
                    <td className="py-1.5 pr-3 text-center">
                      <button
                        onClick={() => removeDebtRow(debt.id)}
                        className="text-gray-300 dark:text-gray-700 hover:text-red-400 dark:hover:text-red-500 transition-colors text-base leading-none"
                        aria-label="Remove debt"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                )
              })}
              {debtData.length > 0 && (
                <tr className="border-t-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 font-semibold">
                  <td />
                  <td className="py-2 px-2 text-gray-700 dark:text-gray-200">Totals</td>
                  <td className="py-2 px-2 text-right tabular-nums text-red-500 dark:text-red-400">
                    {totalBalance > 0 ? fmt(totalBalance) : '—'}
                  </td>
                  <td className="py-2 px-2 text-right tabular-nums text-gray-700 dark:text-gray-200">
                    {totalMin > 0 ? fmt(totalMin) : '—'}
                  </td>
                  <td />
                  <td />
                  <td />
                </tr>
              )}
            </tbody>
          </table>
          <div className="px-4 py-2.5 border-t border-gray-100 dark:border-gray-800/60">
            <button
              onClick={addDebtRow}
              className="text-xs text-gray-400 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-400 transition-colors"
            >
              + Add Debt
            </button>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <SectionHeading>Extra Monthly Payment</SectionHeading>
        <div className="flex items-center gap-3 max-w-xs">
          <CurrencyInput
            value={data.debtExtraPayment}
            onChange={setDebtExtraPayment}
            placeholder="0.00"
          />
          <span className="text-xs text-gray-400 dark:text-gray-600 shrink-0">per month</span>
        </div>
        <p className="mt-2 text-xs text-gray-400 dark:text-gray-600">
          Extra funds are applied to debts in strategy order, rolling freed minimums forward each
          payoff.
        </p>
      </div>
    </div>
  )
}
