import { useState } from 'react'
import { HeroStats } from '../components/hero'
import { CurrencyInput } from '../components/inputs'
import { PageHeader, SectionHeading } from '../components/layout'

const DEBTS = [
  { name: 'Credit Card A', balance: '$—', minPayment: '$—', rate: '—%', order: 1 },
  { name: 'Credit Card B', balance: '$—', minPayment: '$—', rate: '—%', order: 2 },
  { name: 'Personal Loan', balance: '$—', minPayment: '$—', rate: '—%', order: 3 },
  { name: 'Car Loan', balance: '$—', minPayment: '$—', rate: '—%', order: 4 },
  { name: 'HECS-HELP', balance: '$—', minPayment: '$—', rate: '—%', order: 5 },
  { name: 'Mortgage', balance: '$—', minPayment: '$—', rate: '—%', order: 6 },
]

export default function DebtSnowball() {
  const [extraPayment, setExtraPayment] = useState('')

  return (
    <div>
      <PageHeader
        title="Debt Snowball"
        subtitle="List your debts, set a payoff order, and track your progress."
        actions={
          <button className="border border-gray-300 dark:border-gray-700 text-sm px-4 py-1.5 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            + Add Debt
          </button>
        }
      />

      <HeroStats
        stats={[
          { label: 'Total Debt', value: '$—', colorClass: 'text-red-500 dark:text-red-400' },
          { label: 'Total Min. Payments', value: '$—' },
          { label: 'Extra Payment Budget', value: '$—', colorClass: 'text-green-600 dark:text-green-400' },
          { label: 'Est. Debt-Free', value: '—' },
        ]}
      />

      <div className="mb-5 flex items-center gap-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
          Strategy
        </p>
        <div className="flex border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden text-sm">
          <button className="px-4 py-1.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-medium">
            Snowball
          </button>
          <button className="px-4 py-1.5 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            Avalanche
          </button>
        </div>
        <span className="text-xs text-gray-400 dark:text-gray-600">
          Snowball = lowest balance first · Avalanche = highest rate first
        </span>
      </div>

      <table className="w-full text-sm border-collapse mb-8">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-800">
            <th className="text-center py-2 pr-4 font-medium text-gray-500 dark:text-gray-400 w-12">
              Order
            </th>
            <th className="text-left py-2 pr-4 font-medium text-gray-500 dark:text-gray-400">
              Debt Name
            </th>
            <th className="text-right py-2 px-3 font-medium text-gray-500 dark:text-gray-400">
              Balance
            </th>
            <th className="text-right py-2 px-3 font-medium text-gray-500 dark:text-gray-400">
              Min. Payment
            </th>
            <th className="text-right py-2 px-3 font-medium text-gray-500 dark:text-gray-400">
              Interest Rate
            </th>
            <th className="text-right py-2 pl-3 font-medium text-gray-500 dark:text-gray-400">
              Est. Payoff
            </th>
          </tr>
        </thead>
        <tbody>
          {DEBTS.map((debt) => (
            <tr
              key={debt.name}
              className="border-b border-gray-100 dark:border-gray-800/60 even:bg-gray-50/50 dark:even:bg-gray-900/30"
            >
              <td className="py-2.5 pr-4 text-center">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-800 text-xs font-semibold text-gray-600 dark:text-gray-400">
                  {debt.order}
                </span>
              </td>
              <td className="py-2.5 pr-4 font-medium text-gray-700 dark:text-gray-300">
                {debt.name}
              </td>
              <td className="py-2.5 px-3 text-right tabular-nums text-red-500 dark:text-red-400">
                {debt.balance}
              </td>
              <td className="py-2.5 px-3 text-right tabular-nums text-gray-500 dark:text-gray-400">
                {debt.minPayment}
              </td>
              <td className="py-2.5 px-3 text-right tabular-nums text-gray-500 dark:text-gray-400">
                {debt.rate}
              </td>
              <td className="py-2.5 pl-3 text-right text-gray-400 dark:text-gray-600">—</td>
            </tr>
          ))}
          <tr className="border-t-2 border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800/50 font-semibold">
            <td />
            <td className="py-2 pr-4 text-gray-700 dark:text-gray-200">Totals</td>
            <td className="py-2 px-3 text-right tabular-nums text-red-500 dark:text-red-400">
              $—
            </td>
            <td className="py-2 px-3 text-right tabular-nums text-gray-700 dark:text-gray-200">
              $—
            </td>
            <td />
            <td />
          </tr>
        </tbody>
      </table>

      <div>
        <SectionHeading>Extra Monthly Payment Budget</SectionHeading>
        <div className="flex items-center gap-3 max-w-xs">
          <CurrencyInput value={extraPayment} onChange={setExtraPayment} placeholder="0.00" />
          <span className="text-xs text-gray-400 dark:text-gray-600 shrink-0">per month</span>
        </div>
      </div>
    </div>
  )
}
