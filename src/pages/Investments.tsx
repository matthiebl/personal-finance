import { useState } from 'react'
import { HeroStats } from '../components/hero'
import { CurrencyInput, SuffixInput } from '../components/inputs'
import { PageHeader, SectionHeading } from '../components/layout'

const YEARS = Array.from({ length: 30 }, (_, i) => i + 1)

export default function Investments() {
  const [initial, setInitial] = useState('')
  const [monthly, setMonthly] = useState('')
  const [annualReturn, setAnnualReturn] = useState('')
  const [inflationRate, setInflationRate] = useState('')

  return (
    <div>
      <PageHeader
        title="Investment Calculator"
        subtitle="Project portfolio growth with regular contributions and compounding returns."
      />

      <HeroStats
        stats={[
          { label: 'Final Value', value: '$—' },
          { label: 'Total Contributed', value: '$—' },
          { label: 'Total Returns', value: '$—' },
          { label: 'Return on Investment', value: '—%' },
        ]}
      />

      <div className="grid grid-cols-3 gap-8">
        <div className="space-y-4">
          <SectionHeading>Inputs</SectionHeading>
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                Initial investment
              </label>
              <CurrencyInput value={initial} onChange={setInitial} placeholder="10,000" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                Monthly contribution
              </label>
              <CurrencyInput value={monthly} onChange={setMonthly} placeholder="500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                Expected annual return
              </label>
              <SuffixInput
                value={annualReturn}
                onChange={setAnnualReturn}
                suffix="%"
                placeholder="7"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                Time horizon
              </label>
              <select className="border border-gray-300 dark:border-gray-700 rounded-md px-3 py-1.5 text-sm bg-white dark:bg-gray-900 w-full focus:outline-none focus:ring-1 focus:ring-gray-400 dark:focus:ring-gray-600">
                {[5, 10, 15, 20, 25, 30].map((y) => (
                  <option key={y} defaultValue={30}>
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
              <SuffixInput
                value={inflationRate}
                onChange={setInflationRate}
                suffix="%"
                placeholder="3"
              />
            </div>
          </div>
        </div>

        <div className="col-span-2">
          <SectionHeading>Year-by-Year Growth</SectionHeading>
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
