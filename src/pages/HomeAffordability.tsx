import { useState } from 'react'
import { CurrencyInput, SuffixInput } from '../components/inputs'
import { PageHeader, SectionHeading } from '../components/layout'

export default function HomeAffordability() {
  const [annualIncome, setAnnualIncome] = useState('')
  const [monthlyDebt, setMonthlyDebt] = useState('')
  const [downPaymentAmt, setDownPaymentAmt] = useState('')
  const [downPaymentPct, setDownPaymentPct] = useState('')
  const [interestRate, setInterestRate] = useState('')

  return (
    <div>
      <PageHeader
        title="Home Affordability"
        subtitle="Estimate how much house you can afford based on your income and debts."
      />

      <div className="grid grid-cols-2 gap-8">
        <div className="space-y-6">
          <div>
            <SectionHeading>Income & Debts</SectionHeading>
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                  Annual gross income
                </label>
                <CurrencyInput value={annualIncome} onChange={setAnnualIncome} placeholder="100,000" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                  Monthly debt payments
                </label>
                <CurrencyInput value={monthlyDebt} onChange={setMonthlyDebt} placeholder="500" />
              </div>
            </div>
          </div>

          <div>
            <SectionHeading>Loan Details</SectionHeading>
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                  Down payment
                </label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <CurrencyInput value={downPaymentAmt} onChange={setDownPaymentAmt} placeholder="50,000" />
                  </div>
                  <div className="w-24">
                    <SuffixInput
                      value={downPaymentPct}
                      onChange={setDownPaymentPct}
                      suffix="%"
                      placeholder="20"
                    />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                  Interest rate (p.a.)
                </label>
                <SuffixInput
                  value={interestRate}
                  onChange={setInterestRate}
                  suffix="%"
                  placeholder="6.5"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                  Loan term
                </label>
                <select className="border border-gray-300 dark:border-gray-700 rounded-md px-3 py-1.5 text-sm bg-white dark:bg-gray-900 w-full focus:outline-none focus:ring-1 focus:ring-gray-400 dark:focus:ring-gray-600">
                  <option>20 years</option>
                  <option>25 years</option>
                  <option>30 years</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                  Max repayment ratio
                </label>
                <select className="border border-gray-300 dark:border-gray-700 rounded-md px-3 py-1.5 text-sm bg-white dark:bg-gray-900 w-full focus:outline-none focus:ring-1 focus:ring-gray-400 dark:focus:ring-gray-600">
                  <option>28% housing costs</option>
                  <option>36% total debt</option>
                  <option>45% total debt (maximum)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <SectionHeading>Results</SectionHeading>

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
            This is an estimate only. Actual affordability depends on credit score, stamp duty,
            strata fees (if applicable), insurance, LMI (if deposit &lt; 20%), and lender criteria.
            Consult a mortgage broker for personalised advice.
          </div>
        </div>
      </div>
    </div>
  )
}
