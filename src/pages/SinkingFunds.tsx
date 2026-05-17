const PLACEHOLDER_FUNDS = [
  { name: 'Car Maintenance', target: '$—', saved: '$—', monthly: '$—', remaining: '$—', date: '—', pct: 0 },
  { name: 'Holiday / Travel', target: '$—', saved: '$—', monthly: '$—', remaining: '$—', date: '—', pct: 0 },
  { name: 'Home Repairs', target: '$—', saved: '$—', monthly: '$—', remaining: '$—', date: '—', pct: 0 },
  { name: 'New Laptop', target: '$—', saved: '$—', monthly: '$—', remaining: '$—', date: '—', pct: 0 },
  { name: 'Wedding / Event', target: '$—', saved: '$—', monthly: '$—', remaining: '$—', date: '—', pct: 0 },
]

export default function SinkingFunds() {
  return (
    <div>
      <div className="mb-6 pb-5 border-b border-gray-200 dark:border-gray-800 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-1">Sinking Funds</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Plan and track savings for known future expenses.
          </p>
        </div>
        <button className="border border-gray-300 dark:border-gray-700 text-sm px-4 py-1.5 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          + Add Fund
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Active Funds', value: '—' },
          { label: 'Total Saved', value: '$—' },
          { label: 'Monthly Commitment', value: '$—' },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-5 py-4"
          >
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{s.label}</p>
            <p className="text-2xl font-semibold tabular-nums">{s.value}</p>
          </div>
        ))}
      </div>

      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-800">
            <th className="text-left py-2 pr-4 font-medium text-gray-500 dark:text-gray-400">
              Fund Name
            </th>
            <th className="text-right py-2 px-3 font-medium text-gray-500 dark:text-gray-400">
              Target
            </th>
            <th className="text-right py-2 px-3 font-medium text-gray-500 dark:text-gray-400">
              Saved
            </th>
            <th className="text-right py-2 px-3 font-medium text-gray-500 dark:text-gray-400">
              Monthly
            </th>
            <th className="text-right py-2 px-3 font-medium text-gray-500 dark:text-gray-400">
              Remaining
            </th>
            <th className="text-center py-2 px-3 font-medium text-gray-500 dark:text-gray-400">
              Target Date
            </th>
            <th className="text-left py-2 pl-3 font-medium text-gray-500 dark:text-gray-400 w-36">
              Progress
            </th>
          </tr>
        </thead>
        <tbody>
          {PLACEHOLDER_FUNDS.map((fund) => (
            <tr
              key={fund.name}
              className="border-b border-gray-100 dark:border-gray-800/60 even:bg-gray-50/50 dark:even:bg-gray-900/30"
            >
              <td className="py-2.5 pr-4 font-medium text-gray-700 dark:text-gray-300">
                {fund.name}
              </td>
              <td className="py-2.5 px-3 text-right tabular-nums text-gray-500 dark:text-gray-400">
                {fund.target}
              </td>
              <td className="py-2.5 px-3 text-right tabular-nums text-gray-500 dark:text-gray-400">
                {fund.saved}
              </td>
              <td className="py-2.5 px-3 text-right tabular-nums text-gray-500 dark:text-gray-400">
                {fund.monthly}
              </td>
              <td className="py-2.5 px-3 text-right tabular-nums text-gray-500 dark:text-gray-400">
                {fund.remaining}
              </td>
              <td className="py-2.5 px-3 text-center text-gray-500 dark:text-gray-400">
                {fund.date}
              </td>
              <td className="py-2.5 pl-3">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 dark:bg-blue-400 rounded-full"
                      style={{ width: `${fund.pct}%` }}
                    />
                  </div>
                  <span className="text-xs tabular-nums text-gray-400 dark:text-gray-600 w-8 text-right">
                    {fund.pct}%
                  </span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
