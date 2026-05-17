const CALCULATORS = [
  {
    name: 'Compound Interest',
    description: 'Calculate how an investment grows over time with compounding returns.',
    inputs: [
      { label: 'Principal', prefix: '$', placeholder: '10,000' },
      { label: 'Annual rate', suffix: '%', placeholder: '7' },
      { label: 'Years', placeholder: '10' },
      { label: 'Compounding', type: 'select', options: ['Annually', 'Monthly', 'Daily'] },
    ],
    result: 'Future Value: $—',
  },
  {
    name: 'Rule of 72',
    description: 'Estimate how many years it takes to double your money at a given rate.',
    inputs: [{ label: 'Annual return rate', suffix: '%', placeholder: '7' }],
    result: 'Doubles in: — years',
  },
  {
    name: 'Savings Goal',
    description: 'Work out how much to save each month to reach a target amount.',
    inputs: [
      { label: 'Target amount', prefix: '$', placeholder: '20,000' },
      { label: 'Current savings', prefix: '$', placeholder: '5,000' },
      { label: 'Annual rate', suffix: '%', placeholder: '4' },
      { label: 'Years to goal', placeholder: '3' },
    ],
    result: 'Monthly savings needed: $—',
  },
  {
    name: 'Loan Repayment',
    description: 'Calculate monthly repayments and total interest for any loan.',
    inputs: [
      { label: 'Loan amount', prefix: '$', placeholder: '25,000' },
      { label: 'Annual rate', suffix: '%', placeholder: '8.5' },
      { label: 'Term', suffix: 'yrs', placeholder: '5' },
    ],
    result: 'Monthly payment: $— · Total interest: $—',
  },
  {
    name: 'Inflation Adjusted Value',
    description: "See what today's money is worth in the future after inflation.",
    inputs: [
      { label: 'Current amount', prefix: '$', placeholder: '50,000' },
      { label: 'Inflation rate', suffix: '%', placeholder: '3' },
      { label: 'Years', placeholder: '20' },
    ],
    result: 'Future purchasing power: $—',
  },
  {
    name: 'Break-Even Rent vs Buy',
    description: 'Compare renting vs buying to find your break-even point.',
    inputs: [
      { label: 'Home price', prefix: '$', placeholder: '500,000' },
      { label: 'Monthly rent', prefix: '$', placeholder: '2,500' },
      { label: 'Down payment', suffix: '%', placeholder: '20' },
    ],
    result: 'Break-even: — years',
  },
]

export default function Calculators() {
  return (
    <div>
      <div className="mb-6 pb-5 border-b border-gray-200 dark:border-gray-800">
        <h1 className="text-2xl font-bold mb-1">Calculators</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          A collection of useful financial calculators.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-5">
        {CALCULATORS.map((calc) => (
          <div
            key={calc.name}
            className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5"
          >
            <h2 className="font-semibold mb-1 text-gray-900 dark:text-gray-100">{calc.name}</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">{calc.description}</p>

            <div className="space-y-3 mb-4">
              {calc.inputs.map((input) => (
                <div key={input.label} className="flex items-center gap-2">
                  <label className="text-xs text-gray-500 dark:text-gray-400 w-36 shrink-0">
                    {input.label}
                  </label>
                  {'type' in input && input.type === 'select' ? (
                    <select className="flex-1 border border-gray-200 dark:border-gray-700 rounded px-2 py-1 text-sm bg-white dark:bg-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-400 dark:focus:ring-gray-600">
                      {input.options?.map((o) => <option key={o}>{o}</option>)}
                    </select>
                  ) : (
                    <div className="flex flex-1">
                      {'prefix' in input && input.prefix && (
                        <span className="inline-flex items-center px-2 rounded-l border border-r-0 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs text-gray-500 dark:text-gray-400">
                          {input.prefix}
                        </span>
                      )}
                      <input
                        type="number"
                        placeholder={input.placeholder}
                        className={`flex-1 border border-gray-200 dark:border-gray-700 text-sm bg-white dark:bg-gray-900 px-2 py-1 tabular-nums focus:outline-none focus:ring-1 focus:ring-gray-400 dark:focus:ring-gray-600 ${'prefix' in input && input.prefix ? 'rounded-r' : ''} ${'suffix' in input && input.suffix ? 'rounded-l' : ''} ${'prefix' in input && !input.prefix && 'suffix' in input && !input.suffix ? 'rounded' : ''}`}
                      />
                      {'suffix' in input && input.suffix && (
                        <span className="inline-flex items-center px-2 rounded-r border border-l-0 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs text-gray-500 dark:text-gray-400">
                          {input.suffix}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800">
              <span className="text-sm font-medium tabular-nums text-gray-500 dark:text-gray-400">
                {calc.result}
              </span>
              <button className="text-xs px-3 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                Calculate
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
