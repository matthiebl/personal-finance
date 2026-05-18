import { useState } from 'react'
import { CurrencyInput, SuffixInput, TextInput } from '../components/inputs'
import { PageHeader } from '../components/layout'

type CalcInput =
  | { label: string; prefix: '$'; placeholder: string }
  | { label: string; suffix: string; placeholder: string }
  | { label: string; placeholder: string }
  | { label: string; type: 'select'; options: string[] }

const CALCULATORS: { name: string; description: string; inputs: CalcInput[]; result: string }[] = [
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

function CalculatorCard({
  calc,
}: {
  calc: (typeof CALCULATORS)[0]
}) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(calc.inputs.map((i) => [i.label, '']))
  )
  const update = (label: string, v: string) => setValues((prev) => ({ ...prev, [label]: v }))

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
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
                {input.options.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            ) : 'prefix' in input ? (
              <div className="flex-1">
                <CurrencyInput
                  compact
                  value={values[input.label]}
                  onChange={(v) => update(input.label, v)}
                  placeholder={input.placeholder}
                />
              </div>
            ) : 'suffix' in input ? (
              <div className="flex-1">
                <SuffixInput
                  compact
                  value={values[input.label]}
                  onChange={(v) => update(input.label, v)}
                  suffix={input.suffix}
                  placeholder={input.placeholder}
                />
              </div>
            ) : (
              <div className="flex-1">
                <TextInput
                  compact
                  value={values[input.label]}
                  onChange={(v) => update(input.label, v)}
                  placeholder={input.placeholder}
                />
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
  )
}

export default function Calculators() {
  return (
    <div>
      <PageHeader
        title="Calculators"
        subtitle="A collection of useful financial calculators."
      />

      <div className="grid grid-cols-2 gap-5">
        {CALCULATORS.map((calc) => (
          <CalculatorCard key={calc.name} calc={calc} />
        ))}
      </div>
    </div>
  )
}
