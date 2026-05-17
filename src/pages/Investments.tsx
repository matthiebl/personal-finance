const YEARS = Array.from({ length: 30 }, (_, i) => i + 1)

export default function Investments() {
  return (
    <div>
      <div className="mb-6 pb-5 border-b border-gray-200 dark:border-gray-800">
        <h1 className="text-2xl font-bold mb-1">Investment Calculator</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Project portfolio growth with regular contributions and compounding returns.
        </p>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Final Value', value: '$—' },
          { label: 'Total Contributed', value: '$—' },
          { label: 'Total Returns', value: '$—' },
          { label: 'Return on Investment', value: '—%' },
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

      <div className="grid grid-cols-3 gap-8">
        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
            Inputs
          </p>
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                Initial investment
              </label>
              <div className="flex">
                <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-500 dark:text-gray-400">
                  $
                </span>
                <input
                  type="number"
                  placeholder="10,000"
                  className="flex-1 border border-gray-300 dark:border-gray-700 rounded-r-md px-3 py-1.5 text-sm bg-white dark:bg-gray-900 tabular-nums focus:outline-none focus:ring-1 focus:ring-gray-400 dark:focus:ring-gray-600"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                Monthly contribution
              </label>
              <div className="flex">
                <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-500 dark:text-gray-400">
                  $
                </span>
                <input
                  type="number"
                  placeholder="500"
                  className="flex-1 border border-gray-300 dark:border-gray-700 rounded-r-md px-3 py-1.5 text-sm bg-white dark:bg-gray-900 tabular-nums focus:outline-none focus:ring-1 focus:ring-gray-400 dark:focus:ring-gray-600"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                Expected annual return
              </label>
              <div className="flex">
                <input
                  type="number"
                  placeholder="7"
                  step="0.1"
                  className="flex-1 border border-gray-300 dark:border-gray-700 rounded-l-md px-3 py-1.5 text-sm bg-white dark:bg-gray-900 tabular-nums focus:outline-none focus:ring-1 focus:ring-gray-400 dark:focus:ring-gray-600"
                />
                <span className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-500 dark:text-gray-400">
                  %
                </span>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                Time horizon
              </label>
              <select className="border border-gray-300 dark:border-gray-700 rounded-md px-3 py-1.5 text-sm bg-white dark:bg-gray-900 w-full focus:outline-none focus:ring-1 focus:ring-gray-400 dark:focus:ring-gray-600">
                {[5, 10, 15, 20, 25, 30].map((y) => (
                  <option key={y} selected={y === 30}>
                    {y} years
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                Compounding frequency
              </label>
              <select className="border border-gray-300 dark:border-gray-700 rounded-md px-3 py-1.5 text-sm bg-white dark:bg-gray-900 w-full focus:outline-none focus:ring-1 focus:ring-gray-400 dark:focus:ring-gray-600">
                <option>Monthly</option>
                <option>Quarterly</option>
                <option>Annually</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                Inflation rate (optional)
              </label>
              <div className="flex">
                <input
                  type="number"
                  placeholder="3"
                  step="0.1"
                  className="flex-1 border border-gray-300 dark:border-gray-700 rounded-l-md px-3 py-1.5 text-sm bg-white dark:bg-gray-900 tabular-nums focus:outline-none focus:ring-1 focus:ring-gray-400 dark:focus:ring-gray-600"
                />
                <span className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-500 dark:text-gray-400">
                  %
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="col-span-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-4">
            Year-by-Year Growth
          </p>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800">
                <th className="text-left py-2 pr-4 font-medium text-gray-500 dark:text-gray-400">
                  Year
                </th>
                <th className="text-right py-2 px-3 font-medium text-gray-500 dark:text-gray-400">
                  Contributions
                </th>
                <th className="text-right py-2 px-3 font-medium text-gray-500 dark:text-gray-400">
                  Returns
                </th>
                <th className="text-right py-2 pl-3 font-medium text-gray-500 dark:text-gray-400">
                  Portfolio Value
                </th>
              </tr>
            </thead>
            <tbody>
              {YEARS.map((y) => (
                <tr
                  key={y}
                  className="border-b border-gray-100 dark:border-gray-800/60 even:bg-gray-50/50 dark:even:bg-gray-900/30"
                >
                  <td className="py-1.5 pr-4 text-gray-600 dark:text-gray-400">Year {y}</td>
                  <td className="py-1.5 px-3 text-right tabular-nums text-gray-400 dark:text-gray-600">
                    $—
                  </td>
                  <td className="py-1.5 px-3 text-right tabular-nums text-green-600 dark:text-green-500">
                    $—
                  </td>
                  <td className="py-1.5 pl-3 text-right tabular-nums font-medium text-gray-700 dark:text-gray-300">
                    $—
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
