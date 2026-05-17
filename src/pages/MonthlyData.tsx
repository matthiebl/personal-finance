const MONTHS = [
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

const SECTIONS = [
  {
    label: 'Income',
    rows: ['Salary / Wages', 'Freelance / Side Income', 'Other Income'],
  },
  {
    label: 'Fixed Expenses',
    rows: ['Rent / Mortgage', 'Car Payment', 'Insurance', 'Subscriptions', 'Loan Repayments'],
  },
  {
    label: 'Variable Expenses',
    rows: [
      'Groceries',
      'Utilities',
      'Fuel / Transport',
      'Dining Out',
      'Entertainment',
      'Health',
      'Clothing',
      'Miscellaneous',
    ],
  },
  {
    label: 'Savings & Investments',
    rows: ['Emergency Fund', 'Retirement / Super', 'Brokerage', 'Sinking Funds'],
  },
]

export default function MonthlyData() {
  const currentMonth = new Date().getMonth()

  return (
    <div>
      <div className="mb-6 pb-5 border-b border-gray-200 dark:border-gray-800">
        <h1 className="text-2xl font-bold mb-1">Monthly Budget</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Enter your income and expenses for each month.
        </p>
      </div>

      <div className="flex gap-2 flex-wrap mb-8">
        {MONTHS.map((month, i) => (
          <button
            key={month}
            className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
              i === currentMonth
                ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-medium'
                : 'border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            {month.slice(0, 3)}
          </button>
        ))}
      </div>

      <div className="space-y-8">
        {SECTIONS.map((section) => (
          <div key={section.label}>
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">
              {section.label}
            </p>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800">
                  <th className="text-left py-2 pr-4 font-medium text-gray-500 dark:text-gray-400 w-56">
                    Category
                  </th>
                  <th className="text-right py-2 px-3 font-medium text-gray-500 dark:text-gray-400 w-40">
                    Budgeted
                  </th>
                  <th className="text-right py-2 px-3 font-medium text-gray-500 dark:text-gray-400 w-40">
                    Actual
                  </th>
                  <th className="text-right py-2 pl-3 font-medium text-gray-500 dark:text-gray-400 w-32">
                    Difference
                  </th>
                </tr>
              </thead>
              <tbody>
                {section.rows.map((row) => (
                  <tr
                    key={row}
                    className="border-b border-gray-100 dark:border-gray-800/60 even:bg-gray-50/50 dark:even:bg-gray-900/30"
                  >
                    <td className="py-1.5 pr-4 text-gray-700 dark:text-gray-300">{row}</td>
                    <td className="py-1.5 px-3">
                      <input
                        type="number"
                        placeholder="0.00"
                        className="w-full text-right border border-gray-200 dark:border-gray-700 rounded px-2 py-1 text-sm bg-white dark:bg-gray-900 tabular-nums focus:outline-none focus:ring-1 focus:ring-gray-400 dark:focus:ring-gray-600"
                      />
                    </td>
                    <td className="py-1.5 px-3">
                      <input
                        type="number"
                        placeholder="0.00"
                        className="w-full text-right border border-gray-200 dark:border-gray-700 rounded px-2 py-1 text-sm bg-white dark:bg-gray-900 tabular-nums focus:outline-none focus:ring-1 focus:ring-gray-400 dark:focus:ring-gray-600"
                      />
                    </td>
                    <td className="py-1.5 pl-3 text-right tabular-nums text-gray-400 dark:text-gray-600">
                      $—
                    </td>
                  </tr>
                ))}
                <tr className="border-t-2 border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800/50 font-semibold">
                  <td className="py-2 pr-4 text-gray-700 dark:text-gray-200">
                    Total {section.label}
                  </td>
                  <td className="py-2 px-3 text-right tabular-nums text-gray-500 dark:text-gray-400">
                    $—
                  </td>
                  <td className="py-2 px-3 text-right tabular-nums text-gray-500 dark:text-gray-400">
                    $—
                  </td>
                  <td className="py-2 pl-3 text-right tabular-nums text-gray-700 dark:text-gray-200">
                    $—
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        ))}
      </div>

      <div className="mt-8 bg-gray-100 dark:bg-gray-800/50 rounded-xl px-6 py-4 grid grid-cols-3 gap-4">
        {[
          { label: 'Total Income', value: '$—' },
          { label: 'Total Expenses', value: '$—' },
          { label: 'Net Savings', value: '$—' },
        ].map((s) => (
          <div key={s.label}>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{s.label}</p>
            <p className="text-lg font-semibold tabular-nums">{s.value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
