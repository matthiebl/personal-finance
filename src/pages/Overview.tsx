import { HeroStats } from '../components/hero'
import { PageHeader } from '../components/layout'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const CATEGORIES = [
  { label: 'Income', type: 'income' },
  { label: 'Tax', type: 'expense' },
  { label: 'Net Income', type: 'total' },
  { label: 'Housing', type: 'expense' },
  { label: 'Utilities', type: 'expense' },
  { label: 'Groceries', type: 'expense' },
  { label: 'Transport', type: 'expense' },
  { label: 'Insurance', type: 'expense' },
  { label: 'Subscriptions', type: 'expense' },
  { label: 'Dining Out', type: 'expense' },
  { label: 'Entertainment', type: 'expense' },
  { label: 'Health', type: 'expense' },
  { label: 'Total Expenses', type: 'total' },
  { label: 'Savings', type: 'savings' },
  { label: 'Savings Rate', type: 'rate' },
]

export default function Overview() {
  return (
    <div>
      <PageHeader
        title="Annual Overview"
        subtitle="Full-year income and expense breakdown by month."
      />

      <HeroStats
        stats={[
          { label: 'Annual Income', value: '$—' },
          { label: 'Total Expenses', value: '$—' },
          { label: 'Total Savings', value: '$—' },
          { label: 'Avg Savings Rate', value: '—%' },
        ]}
      />

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-800">
              <th className="text-left py-2 pr-4 font-medium text-gray-500 dark:text-gray-400 w-36 sticky left-0 bg-gray-50 dark:bg-gray-950">
                Category
              </th>
              {MONTHS.map((m) => (
                <th
                  key={m}
                  className="text-right py-2 px-3 font-medium text-gray-500 dark:text-gray-400 min-w-20"
                >
                  {m}
                </th>
              ))}
              <th className="text-right py-2 pl-3 font-semibold text-gray-700 dark:text-gray-300 min-w-24">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {CATEGORIES.map((cat) => {
              const isTotal = cat.type === 'total'
              const isRate = cat.type === 'rate'
              const isSavings = cat.type === 'savings'
              return (
                <tr
                  key={cat.label}
                  className={`border-b border-gray-100 dark:border-gray-800/60 ${
                    isTotal
                      ? 'bg-gray-100 dark:bg-gray-800/50 font-semibold'
                      : isSavings
                        ? 'bg-green-50 dark:bg-green-950/20'
                        : 'even:bg-gray-50/50 dark:even:bg-gray-900/30'
                  }`}
                >
                  <td
                    className={`py-2 pr-4 sticky left-0 ${
                      isTotal
                        ? 'bg-gray-100 dark:bg-gray-800/50'
                        : isSavings
                          ? 'bg-green-50 dark:bg-green-950/20'
                          : 'bg-gray-50 dark:bg-gray-950'
                    } text-gray-700 dark:text-gray-300`}
                  >
                    {cat.label}
                  </td>
                  {MONTHS.map((m) => (
                    <td
                      key={m}
                      className={`py-2 px-3 text-right tabular-nums text-gray-400 dark:text-gray-600 ${
                        isRate ? 'text-xs' : ''
                      }`}
                    >
                      {isRate ? '—%' : '$—'}
                    </td>
                  ))}
                  <td className="py-2 pl-3 text-right tabular-nums font-medium text-gray-500 dark:text-gray-400">
                    {isRate ? '—%' : '$—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
