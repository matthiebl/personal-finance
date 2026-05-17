export default function HomeAffordability() {
  return (
    <div>
      <div className="mb-6 pb-5 border-b border-gray-200 dark:border-gray-800">
        <h1 className="text-2xl font-bold mb-1">Home Affordability</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Estimate how much house you can afford based on your income and debts.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-8">
        <div className="space-y-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">
              Income & Debts
            </p>
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 space-y-4">
              {[
                { label: 'Annual gross income', prefix: '$', placeholder: '100,000' },
                { label: 'Monthly debt payments', prefix: '$', placeholder: '500' },
              ].map((f) => (
                <div key={f.label}>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                    {f.label}
                  </label>
                  <div className="flex">
                    <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-500 dark:text-gray-400">
                      {f.prefix}
                    </span>
                    <input
                      type="number"
                      placeholder={f.placeholder}
                      className="flex-1 border border-gray-300 dark:border-gray-700 rounded-r-md px-3 py-1.5 text-sm bg-white dark:bg-gray-900 tabular-nums focus:outline-none focus:ring-1 focus:ring-gray-400 dark:focus:ring-gray-600"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">
              Loan Details
            </p>
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                  Down payment
                </label>
                <div className="flex gap-2">
                  <div className="flex flex-1">
                    <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-500 dark:text-gray-400">
                      $
                    </span>
                    <input
                      type="number"
                      placeholder="50,000"
                      className="flex-1 border border-gray-300 dark:border-gray-700 rounded-r-md px-3 py-1.5 text-sm bg-white dark:bg-gray-900 tabular-nums focus:outline-none focus:ring-1 focus:ring-gray-400 dark:focus:ring-gray-600"
                    />
                  </div>
                  <div className="flex w-24">
                    <input
                      type="number"
                      placeholder="20"
                      className="flex-1 border border-gray-300 dark:border-gray-700 rounded-l-md px-3 py-1.5 text-sm bg-white dark:bg-gray-900 tabular-nums focus:outline-none focus:ring-1 focus:ring-gray-400 dark:focus:ring-gray-600"
                    />
                    <span className="inline-flex items-center px-2 rounded-r-md border border-l-0 border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-500 dark:text-gray-400">
                      %
                    </span>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                  Interest rate (p.a.)
                </label>
                <div className="flex">
                  <input
                    type="number"
                    placeholder="6.5"
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
                  Loan term
                </label>
                <select className="border border-gray-300 dark:border-gray-700 rounded-md px-3 py-1.5 text-sm bg-white dark:bg-gray-900 w-full focus:outline-none focus:ring-1 focus:ring-gray-400 dark:focus:ring-gray-600">
                  <option>15 years</option>
                  <option>20 years</option>
                  <option selected>30 years</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                  Max DTI ratio
                </label>
                <select className="border border-gray-300 dark:border-gray-700 rounded-md px-3 py-1.5 text-sm bg-white dark:bg-gray-900 w-full focus:outline-none focus:ring-1 focus:ring-gray-400 dark:focus:ring-gray-600">
                  <option>28% front-end only</option>
                  <option selected>36% total DTI</option>
                  <option>43% total DTI</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
            Results
          </p>

          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Max Home Price</p>
            <p className="text-4xl font-bold tabular-nums mb-4">$—</p>
            <div className="h-px bg-gray-100 dark:bg-gray-800 mb-4" />
            <table className="w-full text-sm">
              <tbody className="space-y-2">
                {[
                  { label: 'Loan Amount', value: '$—' },
                  { label: 'Down Payment', value: '$— (—%)' },
                  { label: 'Monthly Payment (P&I)', value: '$—' },
                  { label: 'Monthly Income', value: '$—' },
                  { label: 'Front-End DTI', value: '—%' },
                  { label: 'Back-End DTI', value: '—%' },
                  { label: 'Total Interest Paid', value: '$—' },
                ].map((row) => (
                  <tr key={row.label} className="border-b border-gray-50 dark:border-gray-800/40">
                    <td className="py-2 text-gray-500 dark:text-gray-400">{row.label}</td>
                    <td className="py-2 text-right tabular-nums font-medium text-gray-700 dark:text-gray-300">
                      {row.value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-xl p-4 text-xs text-amber-700 dark:text-amber-400">
            This is an estimate only. Actual affordability depends on credit score, local taxes,
            HOA fees, insurance, and lender criteria. Consult a mortgage broker for personalised
            advice.
          </div>
        </div>
      </div>
    </div>
  )
}
