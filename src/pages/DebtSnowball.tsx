const DEBTS = [
  { name: 'Credit Card A', balance: '$—', minPayment: '$—', rate: '—%', order: 1 },
  { name: 'Credit Card B', balance: '$—', minPayment: '$—', rate: '—%', order: 2 },
  { name: 'Personal Loan', balance: '$—', minPayment: '$—', rate: '—%', order: 3 },
  { name: 'Car Loan', balance: '$—', minPayment: '$—', rate: '—%', order: 4 },
  { name: 'Student Loan', balance: '$—', minPayment: '$—', rate: '—%', order: 5 },
  { name: 'Mortgage', balance: '$—', minPayment: '$—', rate: '—%', order: 6 },
]

export default function DebtSnowball() {
  return (
    <div>
      <div className="mb-6 pb-5 border-b border-gray-200 dark:border-gray-800 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-1">Debt Snowball</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            List your debts, set a payoff order, and track your progress.
          </p>
        </div>
        <button className="border border-gray-300 dark:border-gray-700 text-sm px-4 py-1.5 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          + Add Debt
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Debt', value: '$—', color: 'text-red-500 dark:text-red-400' },
          { label: 'Total Min. Payments', value: '$—', color: '' },
          { label: 'Extra Payment Budget', value: '$—', color: 'text-green-600 dark:text-green-400' },
          { label: 'Est. Debt-Free', value: '—', color: '' },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-5 py-4"
          >
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{s.label}</p>
            <p className={`text-2xl font-semibold tabular-nums ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

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
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">
          Extra Monthly Payment Budget
        </p>
        <div className="flex items-center gap-3 max-w-xs">
          <div className="flex flex-1">
            <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-500 dark:text-gray-400">
              $
            </span>
            <input
              type="number"
              placeholder="0.00"
              className="flex-1 border border-gray-300 dark:border-gray-700 rounded-r-md px-3 py-1.5 text-sm bg-white dark:bg-gray-900 tabular-nums focus:outline-none focus:ring-1 focus:ring-gray-400 dark:focus:ring-gray-600"
            />
          </div>
          <span className="text-xs text-gray-400 dark:text-gray-600">per month</span>
        </div>
      </div>
    </div>
  )
}
