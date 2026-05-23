import { useMemo } from 'react'
import type { DonutSegment } from '../components/charts'
import { DonutChart } from '../components/charts'
import { HeroStats } from '../components/hero'
import { CurrencyInput, SuffixInput } from '../components/inputs'
import { PageHeader, SectionHeading } from '../components/layout'
import { useAppData } from '../context/useAppData'
import {
  calcBorrowingCapacity,
  calcLMI,
  calcMortgageRepayment,
  calcStampDuty,
  fmt,
} from '../lib/finance'

const ACTIVE_BTN =
  'px-4 py-1.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-medium text-sm'
const INACTIVE_BTN =
  'px-4 py-1.5 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm'
const SELECT_CLS =
  'border border-gray-300 dark:border-gray-700 rounded-md px-3 py-1.5 text-sm bg-white dark:bg-gray-900 w-full focus:outline-none focus:ring-1 focus:ring-gray-400 dark:focus:ring-gray-600'
const LABEL_CLS = 'block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5'
const CARD_CLS =
  'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 space-y-4'

const AUS_STATES = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT']

export default function HomeAffordability() {
  const { data, setHomeAffordability } = useAppData()
  const ha = data.homeAffordability

  const set = (patch: Partial<typeof ha>) => setHomeAffordability(patch)

  const results = useMemo(() => {
    const annualIncomeNum = parseFloat(ha.annualIncome) || 0
    const monthlyCommitmentsNum = parseFloat(ha.monthlyCommitments) || 0
    const depositNum = parseFloat(ha.deposit) || 0
    const interestRateNum = parseFloat(ha.interestRate) || 0
    const loanTermNum = parseInt(ha.loanTerm) || 30

    const monthlyIncome = annualIncomeNum / 12
    const assessmentRate = interestRateNum + 3.0
    const maxMonthlyRepayment = Math.max(0, monthlyIncome * 0.3 - monthlyCommitmentsNum)
    const borrowingCapacity = calcBorrowingCapacity(
      maxMonthlyRepayment,
      assessmentRate,
      loanTermNum
    )
    const maxPurchasePrice = borrowingCapacity + depositNum
    const lvr = maxPurchasePrice > 0 ? (borrowingCapacity / maxPurchasePrice) * 100 : 0

    const actualMonthlyRepayment =
      ha.repaymentType === 'io'
        ? (borrowingCapacity * (interestRateNum / 100)) / 12
        : calcMortgageRepayment(borrowingCapacity, interestRateNum, loanTermNum)

    const totalInterestPaid =
      ha.repaymentType === 'io'
        ? ((borrowingCapacity * (interestRateNum / 100)) / 12) * loanTermNum * 12
        : Math.max(0, actualMonthlyRepayment * loanTermNum * 12 - borrowingCapacity)

    const stampDuty = calcStampDuty(maxPurchasePrice, ha.ausState, ha.firstHomeBuyer)
    const lmiAmount = calcLMI(borrowingCapacity, maxPurchasePrice)
    const totalCostOfPurchase = maxPurchasePrice + stampDuty + lmiAmount
    const repaymentRatio = monthlyIncome > 0 ? (actualMonthlyRepayment / monthlyIncome) * 100 : 0

    return {
      monthlyIncome,
      assessmentRate,
      borrowingCapacity,
      maxPurchasePrice,
      depositNum,
      lvr,
      actualMonthlyRepayment,
      totalInterestPaid,
      stampDuty,
      lmiAmount,
      totalCostOfPurchase,
      repaymentRatio,
      interestRateNum,
      loanTermNum,
    }
  }, [ha])

  const lvrColorClass =
    results.lvr === 0
      ? undefined
      : results.lvr <= 80
        ? 'text-green-600 dark:text-green-400'
        : results.lvr <= 90
          ? 'text-amber-500 dark:text-amber-400'
          : 'text-red-500 dark:text-red-400'

  const donutSegments: DonutSegment[] = [
    { label: 'Principal', value: results.borrowingCapacity, color: '#6366f1' },
    { label: 'Total Interest', value: results.totalInterestPaid, color: '#f43f5e' },
    { label: 'Stamp Duty', value: results.stampDuty, color: '#f97316' },
    ...(results.lmiAmount > 0
      ? [{ label: 'LMI', value: results.lmiAmount, color: '#8b5cf6' }]
      : []),
  ].filter((s) => s.value > 0)

  const r = results

  const summaryRows = [
    {
      label: 'Loan Amount',
      value: r.borrowingCapacity > 0 ? fmt(Math.round(r.borrowingCapacity)) : '$—',
    },
    {
      label: 'Deposit / LVR',
      value:
        r.depositNum > 0 && r.maxPurchasePrice > 0
          ? `${fmt(r.depositNum)} / ${r.lvr.toFixed(1)}%`
          : '$—',
    },
    {
      label: 'Assessment Rate',
      value: r.interestRateNum > 0 ? `${r.assessmentRate.toFixed(2)}% p.a.` : '—',
    },
    {
      label: `Monthly Repayment (${ha.repaymentType === 'pi' ? 'P&I' : 'IO'})`,
      value: r.actualMonthlyRepayment > 0 ? fmt(Math.round(r.actualMonthlyRepayment)) : '$—',
    },
    {
      label: 'Monthly Income',
      value: r.monthlyIncome > 0 ? fmt(Math.round(r.monthlyIncome)) : '$—',
    },
    {
      label: 'Repayment / Income',
      value: r.repaymentRatio > 0 ? `${r.repaymentRatio.toFixed(1)}%` : '—',
    },
    { label: 'Stamp Duty (est.)', value: r.maxPurchasePrice > 0 ? fmt(r.stampDuty) : '$—' },
    ...(r.lmiAmount > 0 ? [{ label: 'LMI (LVR > 80%)', value: fmt(r.lmiAmount) }] : []),
    {
      label: 'Total Interest Paid',
      value: r.totalInterestPaid > 0 ? fmt(Math.round(r.totalInterestPaid)) : '$—',
    },
    {
      label: 'Total Cost of Purchase',
      value: r.totalCostOfPurchase > 0 ? fmt(Math.round(r.totalCostOfPurchase)) : '$—',
    },
  ]

  return (
    <div className="max-w-384">
      <PageHeader
        title="Home Affordability"
        subtitle="Estimate your borrowing power and total cost of purchasing a home in Australia."
      />

      <HeroStats
        stats={[
          {
            label: 'Borrowing Power',
            value: r.borrowingCapacity > 0 ? fmt(Math.round(r.borrowingCapacity)) : '$—',
            colorClass: r.borrowingCapacity > 0 ? 'text-green-600 dark:text-green-400' : undefined,
          },
          {
            label: 'Max Purchase Price',
            value: r.maxPurchasePrice > 0 ? fmt(Math.round(r.maxPurchasePrice)) : '$—',
          },
          {
            label: 'Monthly Repayment',
            value: r.actualMonthlyRepayment > 0 ? fmt(Math.round(r.actualMonthlyRepayment)) : '$—',
          },
          {
            label: 'LVR',
            value: r.lvr > 0 ? `${r.lvr.toFixed(1)}%` : '—',
            colorClass: lvrColorClass,
          },
        ]}
      />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* ── Inputs ── */}
        <div className="space-y-6">
          <div>
            <SectionHeading>Income & Commitments</SectionHeading>
            <div className={CARD_CLS}>
              <div>
                <label className={LABEL_CLS}>Annual gross income</label>
                <CurrencyInput
                  value={ha.annualIncome}
                  onChange={(v) => set({ annualIncome: v })}
                  placeholder="120,000"
                />
              </div>
              <div>
                <label className={LABEL_CLS}>Existing monthly commitments</label>
                <CurrencyInput
                  value={ha.monthlyCommitments}
                  onChange={(v) => set({ monthlyCommitments: v })}
                  placeholder="500"
                />
                <p className="mt-1 text-xs text-gray-400 dark:text-gray-600">
                  Credit cards, car loans, personal loans, HECS/HELP repayments, etc.
                </p>
              </div>
            </div>
          </div>

          <div>
            <SectionHeading>Deposit</SectionHeading>
            <div className={CARD_CLS}>
              <div>
                <label className={LABEL_CLS}>Deposit amount</label>
                <CurrencyInput
                  value={ha.deposit}
                  onChange={(v) => set({ deposit: v })}
                  placeholder="100,000"
                />
                <p className="mt-1 text-xs text-gray-400 dark:text-gray-600">
                  A deposit of at least 20% avoids LMI.
                </p>
              </div>
            </div>
          </div>

          <div>
            <SectionHeading>Loan Settings</SectionHeading>
            <div className={CARD_CLS}>
              <div>
                <label className={LABEL_CLS}>Interest rate (p.a.)</label>
                <SuffixInput
                  value={ha.interestRate}
                  onChange={(v) => set({ interestRate: v })}
                  suffix="%"
                  placeholder="6.50"
                  decimalPlaces={2}
                />
              </div>
              <div>
                <label className={LABEL_CLS}>Loan term</label>
                <select
                  value={ha.loanTerm}
                  onChange={(e) => set({ loanTerm: e.target.value })}
                  className={SELECT_CLS}
                >
                  <option value="25">25 years</option>
                  <option value="30">30 years</option>
                </select>
              </div>
              <div>
                <label className={LABEL_CLS}>Repayment type</label>
                <div className="flex border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
                  <button
                    onClick={() => set({ repaymentType: 'pi' })}
                    className={ha.repaymentType === 'pi' ? ACTIVE_BTN : INACTIVE_BTN}
                  >
                    Principal &amp; Interest
                  </button>
                  <button
                    onClick={() => set({ repaymentType: 'io' })}
                    className={ha.repaymentType === 'io' ? ACTIVE_BTN : INACTIVE_BTN}
                  >
                    Interest Only
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div>
            <SectionHeading>Costs &amp; Concessions</SectionHeading>
            <div className={CARD_CLS}>
              <div>
                <label className={LABEL_CLS}>State / Territory</label>
                <select
                  value={ha.ausState}
                  onChange={(e) => set({ ausState: e.target.value })}
                  className={SELECT_CLS}
                >
                  {AUS_STATES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={LABEL_CLS}>First home buyer</label>
                <div className="flex border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
                  <button
                    onClick={() => set({ firstHomeBuyer: false })}
                    className={!ha.firstHomeBuyer ? ACTIVE_BTN : INACTIVE_BTN}
                  >
                    No
                  </button>
                  <button
                    onClick={() => set({ firstHomeBuyer: true })}
                    className={ha.firstHomeBuyer ? ACTIVE_BTN : INACTIVE_BTN}
                  >
                    Yes
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Outputs ── */}
        <div className="space-y-6">
          <div className="flex flex-col">
            <SectionHeading>Total Cost Breakdown</SectionHeading>
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 flex gap-6 items-center">
              <div className="shrink-0 w-44">
                <DonutChart
                  segments={donutSegments}
                  emptyMessage="Enter your details to see breakdown"
                />
              </div>
              {donutSegments.length > 0 ? (
                <div className="flex-1 space-y-1.5 min-w-0">
                  {donutSegments.map((s) => (
                    <div key={s.label} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          className="w-2 h-2 rounded-sm shrink-0"
                          style={{ backgroundColor: s.color }}
                        />
                        <span className="text-gray-600 dark:text-gray-400 truncate">{s.label}</span>
                      </div>
                      <span className="text-gray-500 dark:text-gray-400 tabular-nums ml-2 shrink-0">
                        {fmt(Math.round(s.value))}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400 dark:text-gray-600">
                  Enter your income, deposit and rate to see the breakdown
                </p>
              )}
            </div>
          </div>

          <div>
            <SectionHeading>Summary</SectionHeading>
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
              <table className="w-full text-sm">
                <tbody>
                  {summaryRows.map((row) => (
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
          </div>

          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-xl p-4 text-xs text-amber-700 dark:text-amber-400">
            This is an estimate only. Borrowing power is assessed using the APRA serviceability
            buffer (your rate + 3%) at 30% of gross income. Stamp duty figures are simplified
            2024/25 approximations — first home buyer thresholds and concessions are subject to
            change. LMI is estimated by LVR tier and actual premiums vary by lender. This calculator
            does not account for council rates, body corporate fees, building insurance, lender
            fees, or conveyancing costs. Consult a licensed mortgage broker for personalised advice.
          </div>
        </div>
      </div>
    </div>
  )
}
