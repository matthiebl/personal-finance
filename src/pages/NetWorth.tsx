const ASSETS = [
  { name: 'Checking Account', category: 'Cash & Bank' },
  { name: 'Savings Account', category: 'Cash & Bank' },
  { name: 'Emergency Fund', category: 'Cash & Bank' },
  { name: '401(k) / Super', category: 'Investments' },
  { name: 'Brokerage', category: 'Investments' },
  { name: 'Primary Residence', category: 'Property' },
  { name: 'Vehicle', category: 'Other' },
]

const LIABILITIES = [
  { name: 'Mortgage', category: 'Loans' },
  { name: 'Car Loan', category: 'Loans' },
  { name: 'Student Loan', category: 'Loans' },
  { name: 'Credit Card A', category: 'Credit Cards' },
  { name: 'Credit Card B', category: 'Credit Cards' },
  { name: 'Personal Loan', category: 'Other' },
]

function Table({
  title,
  rows,
  accent,
}: {
  title: string
  rows: { name: string; category: string }[]
  accent: string
}) {
  return (
    <div className="flex-1 min-w-0">
      <h2 className={`text-sm font-semibold mb-3 ${accent}`}>{title}</h2>
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-800">
            <th className="text-left py-2 pr-3 font-medium text-gray-500 dark:text-gray-400">
              Name
            </th>
            <th className="text-left py-2 pr-3 font-medium text-gray-500 dark:text-gray-400 hidden sm:table-cell">
              Category
            </th>
            <th className="text-right py-2 font-medium text-gray-500 dark:text-gray-400">Value</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.name}
              className="border-b border-gray-100 dark:border-gray-800/60 even:bg-gray-50/50 dark:even:bg-gray-900/30"
            >
              <td className="py-2 pr-3 text-gray-700 dark:text-gray-300">{row.name}</td>
              <td className="py-2 pr-3 text-gray-500 dark:text-gray-500 text-xs hidden sm:table-cell">
                {row.category}
              </td>
              <td className="py-2 text-right tabular-nums text-gray-400 dark:text-gray-600">$—</td>
            </tr>
          ))}
          <tr className="border-t-2 border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800/50 font-semibold">
            <td className="py-2 pr-3 text-gray-700 dark:text-gray-200" colSpan={2}>
              Total {title}
            </td>
            <td className="py-2 text-right tabular-nums text-gray-700 dark:text-gray-200">$—</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

export default function NetWorth() {
  return (
    <div>
      <div className="mb-6 pb-5 border-b border-gray-200 dark:border-gray-800">
        <h1 className="text-2xl font-bold mb-1">Net Worth</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Track your assets and liabilities to calculate your net worth.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Total Assets', value: '$—', color: 'text-green-600 dark:text-green-400' },
          { label: 'Total Liabilities', value: '$—', color: 'text-red-500 dark:text-red-400' },
          { label: 'Net Worth', value: '$—', color: 'text-gray-900 dark:text-gray-100' },
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

      <div className="flex gap-8">
        <Table title="Assets" rows={ASSETS} accent="text-green-600 dark:text-green-400" />
        <div className="w-px bg-gray-200 dark:bg-gray-800 shrink-0" />
        <Table title="Liabilities" rows={LIABILITIES} accent="text-red-500 dark:text-red-400" />
      </div>

      <div className="mt-6 bg-gray-100 dark:bg-gray-800/50 rounded-xl px-6 py-4 flex justify-between items-center">
        <span className="font-semibold text-gray-700 dark:text-gray-200">Net Worth</span>
        <span className="text-xl font-bold tabular-nums text-gray-900 dark:text-gray-100">$—</span>
      </div>
    </div>
  )
}
