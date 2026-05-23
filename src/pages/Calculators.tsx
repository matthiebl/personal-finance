import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ExpandableChart, GrowthBarChart } from '../components/charts'
import { CurrencyInput, SuffixInput } from '../components/inputs'
import { PageHeader, TabBar } from '../components/layout'
import { fmt, fmtAxis, fmtCents } from '../lib/finance'

// ─── Tab definitions ──────────────────────────────────────────────────────────

type CalcTab = 'compound' | 'rule72' | 'savings' | 'loan' | 'inflation' | 'rentbuy' | 'super'

const TABS: { id: CalcTab; label: string }[] = [
  { id: 'compound', label: 'Compound' },
  { id: 'super', label: 'Superannuation' },
  { id: 'savings', label: 'Savings Goal' },
  { id: 'loan', label: 'Loan' },
  { id: 'inflation', label: 'Inflation' },
  { id: 'rentbuy', label: 'Rent vs Buy' },
  { id: 'rule72', label: 'Rule of 72' },
]

// ─── Shared layout helpers ────────────────────────────────────────────────────

function CalcShell({
  title,
  description,
  inputs,
  result,
  chart,
  insights,
}: {
  title: string
  description: string
  inputs: React.ReactNode
  result: React.ReactNode
  chart: React.ReactNode
  insights?: React.ReactNode
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
          <h2 className="font-semibold mb-1 text-gray-900 dark:text-gray-100">{title}</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-5">{description}</p>
          <div className="space-y-3">{inputs}</div>
          <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-800">{result}</div>
        </div>
        {chart}
      </div>
      {insights}
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-gray-500 dark:text-gray-400">{label}</label>
      <div className="w-full">{children}</div>
    </div>
  )
}

function Sel({
  value,
  onChange,
  options,
}: {
  value: string
  onChange: (v: string) => void
  options: string[]
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full border border-gray-200 dark:border-gray-700 rounded px-2 py-1 text-sm bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-400 dark:focus:ring-gray-600"
    >
      {options.map((o) => (
        <option key={o}>{o}</option>
      ))}
    </select>
  )
}

function Results({ items }: { items: { label: string; value: string; primary?: boolean }[] }) {
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item.label} className="flex items-center justify-between gap-4">
          <span className="text-xs text-gray-500 dark:text-gray-400">{item.label}</span>
          <span
            className={`tabular-nums font-semibold ${
              item.primary
                ? 'text-base text-indigo-600 dark:text-indigo-400'
                : 'text-sm text-gray-700 dark:text-gray-300'
            }`}
          >
            {item.value}
          </span>
        </div>
      ))}
    </div>
  )
}

type ChartPayloadItem = {
  name: string
  value: number
  fill?: string
  stroke?: string
  color?: string
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: ChartPayloadItem[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  const items = payload.filter((p) => p.value !== 0)
  if (!items.length) return null
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 shadow-md text-xs">
      {label && <p className="font-medium text-gray-700 dark:text-gray-200 mb-1.5">{label}</p>}
      {items.map((p) => (
        <div key={p.name} className="flex items-center justify-between gap-4 mb-0.5">
          <div className="flex items-center gap-1.5">
            <span
              className="w-2 h-2 rounded-sm shrink-0"
              style={{ backgroundColor: p.fill ?? p.stroke ?? p.color ?? '#6366f1' }}
            />
            <span className="text-gray-500 dark:text-gray-400">{p.name}</span>
          </div>
          <span className="tabular-nums text-gray-700 dark:text-gray-200">{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

function EmptyChart({ message, height }: { message: string; height: number }) {
  return (
    <div className="flex items-center justify-center" style={{ height }}>
      <p className="text-xs text-gray-400 dark:text-gray-600">{message}</p>
    </div>
  )
}

function NoData() {
  return <p className="text-xs text-gray-400 dark:text-gray-600">Enter values to see result</p>
}

// ─── Query param helpers ──────────────────────────────────────────────────────

function mkSetter(setParams: ReturnType<typeof useSearchParams>[1], key: string) {
  return (v: string) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (v === '') next.delete(key)
        else next.set(key, v)
        return next
      },
      { replace: true }
    )
}

// ─── Insights panel ───────────────────────────────────────────────────────────

function InsightsPanel({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
      >
        <span className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
          Detailed Breakdown
        </span>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="border-t border-gray-100 dark:border-gray-800 px-5 py-4">{children}</div>
      )}
    </div>
  )
}

function BreakdownTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th
                key={h}
                className={`pb-2 text-gray-400 dark:text-gray-500 font-medium whitespace-nowrap ${
                  i === 0 ? 'text-left pr-6' : 'text-right pr-4'
                }`}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              className={`border-t border-gray-100 dark:border-gray-800 ${
                i % 2 !== 0 ? 'bg-gray-50/50 dark:bg-gray-800/20' : ''
              }`}
            >
              {row.map((cell, j) => (
                <td
                  key={j}
                  className={`py-1.5 tabular-nums text-gray-700 dark:text-gray-300 whitespace-nowrap ${
                    j === 0 ? 'pr-6 font-medium' : 'text-right pr-4'
                  }`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Compound Interest ────────────────────────────────────────────────────────

function CompoundInterestCalc() {
  const [params, setParams] = useSearchParams()
  const principal = params.get('principal') ?? ''
  const rate = params.get('c_rate') ?? ''
  const years = params.get('c_years') ?? ''
  const compounding = params.get('compounding') ?? 'Monthly'
  const contrib = params.get('c_contrib') ?? ''

  const setPrincipal = mkSetter(setParams, 'principal')
  const setRate = mkSetter(setParams, 'c_rate')
  const setYears = mkSetter(setParams, 'c_years')
  const setCompounding = mkSetter(setParams, 'compounding')
  const setContrib = mkSetter(setParams, 'c_contrib')

  const result = useMemo(() => {
    const p = parseFloat(principal) || 0
    const r = parseFloat(rate) || 0
    const t = parseFloat(years) || 0
    const m = parseFloat(contrib) || 0
    if (!p || !r || !t) return null

    const n = compounding === 'Annually' ? 1 : compounding === 'Monthly' ? 12 : 365
    const em = Math.pow(1 + r / 100 / n, n / 12) - 1

    let balance = p
    let cumContributions = 0
    let cumInterest = 0
    const totalMonths = Math.round(t * 12)

    const yearlyData: {
      year: number
      balance: number
      yearContributions: number
      yearInterest: number
      cumContributions: number
    }[] = []

    for (let mo = 1; mo <= totalMonths; mo++) {
      const interest = balance * em
      balance += interest + m
      cumContributions += m
      cumInterest += interest

      if (mo % 12 === 0 || mo === totalMonths) {
        const yr = Math.ceil(mo / 12)
        const prev = yearlyData[yearlyData.length - 1]
        const yearContributions = cumContributions - (prev?.cumContributions ?? 0)
        const yearInterest = interest + (mo % 12 === 0 ? 0 : 0) // approximate, tracked below
        void yearInterest
        yearlyData.push({ year: yr, balance, yearContributions, yearInterest: 0, cumContributions })
      }
    }

    // Re-derive per-year interest from balance deltas
    for (let i = 0; i < yearlyData.length; i++) {
      const prevBal = i === 0 ? p : yearlyData[i - 1].balance
      const prevCum = i === 0 ? 0 : yearlyData[i - 1].cumContributions
      yearlyData[i].yearInterest =
        yearlyData[i].balance - prevBal - (yearlyData[i].cumContributions - prevCum)
    }

    const fv = balance
    const totalInvested = p + cumContributions
    const roi = totalInvested > 0 ? ((fv - totalInvested) / totalInvested) * 100 : 0

    return { fv, interest: cumInterest, totalInvested, roi, yearlyData }
  }, [principal, rate, years, compounding, contrib])

  const p = parseFloat(principal) || 0
  const r = parseFloat(rate) || 0
  const m = parseFloat(contrib) || 0

  return (
    <CalcShell
      title="Compound Interest"
      description="Calculate how an investment grows over time with compounding returns."
      inputs={
        <>
          <Row label="Principal">
            <CurrencyInput value={principal} onChange={setPrincipal} placeholder="10,000" />
          </Row>
          <Row label="Monthly contribution">
            <CurrencyInput value={contrib} onChange={setContrib} placeholder="0" />
          </Row>
          <Row label="Annual return rate">
            <SuffixInput value={rate} onChange={setRate} suffix="%" placeholder="7" />
          </Row>
          <Row label="Years">
            <SuffixInput value={years} onChange={setYears} suffix="yrs" placeholder="10" />
          </Row>
          <Row label="Compounding">
            <Sel
              value={compounding}
              onChange={setCompounding}
              options={['Annually', 'Monthly', 'Daily']}
            />
          </Row>
        </>
      }
      result={
        result ? (
          <Results
            items={[
              { label: 'Future value', value: fmt(result.fv), primary: true },
              { label: 'Total invested', value: fmt(result.totalInvested) },
              { label: 'Interest earned', value: fmt(result.interest) },
              { label: 'Return on investment', value: `${result.roi.toFixed(1)}%` },
            ]}
          />
        ) : (
          <NoData />
        )
      }
      chart={
        <ExpandableChart
          title="Compound Growth"
          renderChart={(h) => (
            <GrowthBarChart
              initialBalance={p}
              monthlyContribution={m}
              annualRate={r}
              target={result?.fv}
              height={h}
            />
          )}
        />
      }
      insights={
        result && result.yearlyData.length > 0 ? (
          <InsightsPanel>
            <BreakdownTable
              headers={['Year', 'Balance', 'Contributions', 'Interest', 'Total Invested']}
              rows={result.yearlyData.map((d) => [
                `Year ${d.year}`,
                fmt(d.balance),
                fmt(d.yearContributions),
                fmt(d.yearInterest),
                fmt(p + d.cumContributions),
              ])}
            />
          </InsightsPanel>
        ) : undefined
      }
    />
  )
}

// ─── Rule of 72 ───────────────────────────────────────────────────────────────

const COMPARISON_RATES = [2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 20]

function Rule72Calc() {
  const [params, setParams] = useSearchParams()
  const rate = params.get('r72_rate') ?? ''
  const setRate = mkSetter(setParams, 'r72_rate')

  const r = parseFloat(rate) || 0
  const rule72Years = r > 0 ? 72 / r : null
  const exactYears = r > 0 ? Math.log(2) / Math.log(1 + r / 100) : null

  return (
    <CalcShell
      title="Rule of 72"
      description="Estimate how many years it takes to double your money at a given return rate."
      inputs={
        <Row label="Annual return rate">
          <SuffixInput value={rate} onChange={setRate} suffix="%" placeholder="7" />
        </Row>
      }
      result={
        rule72Years !== null && exactYears !== null ? (
          <Results
            items={[
              {
                label: 'Years to double (Rule of 72)',
                value: `${rule72Years.toFixed(1)} yrs`,
                primary: true,
              },
              { label: 'Exact calculation', value: `${exactYears.toFixed(2)} yrs` },
            ]}
          />
        ) : (
          <p className="text-xs text-gray-400 dark:text-gray-600">Enter a rate to see result</p>
        )
      }
      chart={
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">
            Doubling Time at Common Rates
          </p>
          <div className="space-y-0.5">
            {COMPARISON_RATES.map((rv) => {
              const yrs = (72 / rv).toFixed(1)
              const isActive = r > 0 && Math.abs(r - rv) < 0.5
              return (
                <div
                  key={rv}
                  className={`flex justify-between items-center px-2.5 py-1.5 rounded-lg text-sm transition-colors ${
                    isActive
                      ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-semibold'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  <span>{rv}% per year</span>
                  <span className="tabular-nums">{yrs} years</span>
                </div>
              )
            })}
          </div>
        </div>
      }
    />
  )
}

// ─── Savings Goal ─────────────────────────────────────────────────────────────

function SavingsGoalCalc() {
  const [params, setParams] = useSearchParams()
  const target = params.get('sg_target') ?? ''
  const current = params.get('sg_current') ?? ''
  const rate = params.get('sg_rate') ?? ''
  const years = params.get('sg_years') ?? ''

  const setTarget = mkSetter(setParams, 'sg_target')
  const setCurrent = mkSetter(setParams, 'sg_current')
  const setRate = mkSetter(setParams, 'sg_rate')
  const setYears = mkSetter(setParams, 'sg_years')

  const result = useMemo(() => {
    const fvTarget = parseFloat(target) || 0
    const pv = parseFloat(current) || 0
    const r = (parseFloat(rate) || 0) / 100 / 12
    const totalYears = parseFloat(years) || 0
    const n = Math.round(totalYears * 12)
    if (!fvTarget || !n) return null

    let pmt: number
    if (r === 0) {
      pmt = (fvTarget - pv) / n
    } else {
      const growth = Math.pow(1 + r, n)
      pmt = ((fvTarget - pv * growth) * r) / (growth - 1)
    }

    if (pmt < 0) return { pmt: 0, onTrack: true, totalContributions: 0, yearlyData: [] }

    let balance = pv
    let cumContributions = 0
    let cumInterest = 0

    const yearlyData: {
      year: number
      balance: number
      yearContributions: number
      yearInterest: number
      progress: number
    }[] = []

    for (let mo = 1; mo <= n; mo++) {
      const interest = balance * r
      balance = balance + interest + pmt
      cumContributions += pmt
      cumInterest += interest

      if (mo % 12 === 0 || mo === n) {
        const yr = Math.ceil(mo / 12)
        const prev = yearlyData[yearlyData.length - 1]
        const yearContributions =
          cumContributions -
          (prev
            ? prev.yearContributions +
              yearlyData
                .slice(0, yearlyData.length - 1)
                .reduce((s, d) => s + d.yearContributions, 0)
            : 0)
        void yearContributions
        yearlyData.push({
          year: yr,
          balance,
          yearContributions: 0,
          yearInterest: 0,
          progress: Math.min((balance / fvTarget) * 100, 100),
        })
      }
    }

    // Re-derive per-year contribs and interest from deltas
    for (let i = 0; i < yearlyData.length; i++) {
      const prevBal = i === 0 ? pv : yearlyData[i - 1].balance
      const months = i === yearlyData.length - 1 ? n - i * 12 : 12
      yearlyData[i].yearContributions = pmt * months
      yearlyData[i].yearInterest = yearlyData[i].balance - prevBal - yearlyData[i].yearContributions
    }

    return {
      pmt,
      onTrack: false,
      totalContributions: pmt * n,
      totalInterest: cumInterest,
      yearlyData,
    }
  }, [target, current, rate, years])

  const pv = parseFloat(current) || 0
  const r = parseFloat(rate) || 0
  const fv = parseFloat(target) || 0

  return (
    <CalcShell
      title="Savings Goal"
      description="Work out how much to save each month to reach a target amount."
      inputs={
        <>
          <Row label="Target amount">
            <CurrencyInput value={target} onChange={setTarget} placeholder="20,000" />
          </Row>
          <Row label="Current savings">
            <CurrencyInput value={current} onChange={setCurrent} placeholder="5,000" />
          </Row>
          <Row label="Annual return rate">
            <SuffixInput value={rate} onChange={setRate} suffix="%" placeholder="4" />
          </Row>
          <Row label="Years to goal">
            <SuffixInput value={years} onChange={setYears} suffix="yrs" placeholder="3" />
          </Row>
        </>
      }
      result={
        result ? (
          result.onTrack ? (
            <p className="text-sm font-medium text-green-600 dark:text-green-400">
              Already on track — your current savings will reach the goal.
            </p>
          ) : (
            <Results
              items={[
                { label: 'Monthly savings needed', value: fmtCents(result.pmt), primary: true },
                { label: 'Total contributions', value: fmt(result.totalContributions) },
                {
                  label: 'Interest earned',
                  value: fmt(Math.max(0, fv - pv - result.totalContributions)),
                },
              ]}
            />
          )
        ) : (
          <NoData />
        )
      }
      chart={
        <ExpandableChart
          title="Path to Goal"
          renderChart={(h) => (
            <GrowthBarChart
              initialBalance={pv}
              monthlyContribution={result?.pmt ?? 0}
              annualRate={r}
              target={fv}
              height={h}
            />
          )}
        />
      }
      insights={
        result && !result.onTrack && result.yearlyData.length > 0 ? (
          <InsightsPanel>
            <BreakdownTable
              headers={['Year', 'Balance', 'Contributions', 'Interest', 'Progress']}
              rows={result.yearlyData.map((d) => [
                `Year ${d.year}`,
                fmt(d.balance),
                fmt(d.yearContributions),
                fmt(d.yearInterest),
                `${d.progress.toFixed(1)}%`,
              ])}
            />
          </InsightsPanel>
        ) : undefined
      }
    />
  )
}

// ─── Loan Repayment ───────────────────────────────────────────────────────────

function LoanRepaymentCalc() {
  const [params, setParams] = useSearchParams()
  const loan = params.get('loan_amount') ?? ''
  const rate = params.get('loan_rate') ?? ''
  const term = params.get('loan_term') ?? ''
  const extraPayment = params.get('loan_extra') ?? ''

  const setLoan = mkSetter(setParams, 'loan_amount')
  const setRate = mkSetter(setParams, 'loan_rate')
  const setTerm = mkSetter(setParams, 'loan_term')
  const setExtraPayment = mkSetter(setParams, 'loan_extra')

  const calc = useMemo(() => {
    const P = parseFloat(loan) || 0
    const r = (parseFloat(rate) || 0) / 100 / 12
    const termYears = parseFloat(term) || 0
    const extra = parseFloat(extraPayment) || 0
    if (!P || !termYears) return null

    const n = termYears * 12
    const pmt = r === 0 ? P / n : (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
    const totalMonthly = pmt + extra

    let stdBal = P
    let accBal = P
    let stdCumInterest = 0
    let accCumInterest = 0
    let accPaidOffMonth: number | null = null

    const amortData: { year: string; principal: number; interest: number }[] = []
    const yearlyData: {
      year: number
      stdBalance: number
      accBalance: number
      stdYearInterest: number
      accYearInterest: number
      stdCumInterest: number
      accCumInterest: number
    }[] = []

    for (let yr = 1; yr <= termYears; yr++) {
      let stdYearPrincipal = 0
      let stdYearInterest = 0
      let accYearInterest = 0

      for (let mo = 0; mo < 12; mo++) {
        const monthNum = (yr - 1) * 12 + mo + 1

        if (stdBal > 0.01) {
          const intPmt = stdBal * r
          const prinPmt = Math.min(pmt - intPmt, stdBal)
          stdYearInterest += intPmt
          stdYearPrincipal += prinPmt
          stdBal = Math.max(0, stdBal - prinPmt)
        }

        if (accBal > 0.01) {
          const intPmt = accBal * r
          const prinPmt = Math.min(totalMonthly - intPmt, accBal)
          accYearInterest += intPmt
          accBal = Math.max(0, accBal - prinPmt)
          if (accBal <= 0.01 && accPaidOffMonth === null) {
            accPaidOffMonth = monthNum
          }
        }
      }

      stdCumInterest += stdYearInterest
      accCumInterest += accYearInterest

      amortData.push({ year: `Yr ${yr}`, principal: stdYearPrincipal, interest: stdYearInterest })
      yearlyData.push({
        year: yr,
        stdBalance: Math.max(0, stdBal),
        accBalance: Math.max(0, accBal),
        stdYearInterest,
        accYearInterest,
        stdCumInterest,
        accCumInterest,
      })
    }

    const monthsSaved = extra > 0 && accPaidOffMonth !== null ? n - accPaidOffMonth : 0
    const interestSaved = extra > 0 ? stdCumInterest - accCumInterest : 0

    return {
      pmt,
      totalPaid: pmt * n,
      totalInterest: stdCumInterest,
      amortData,
      extra,
      totalMonthly,
      monthsSaved,
      interestSaved,
      accPaidOffMonth,
      yearlyData,
    }
  }, [loan, rate, term, extraPayment])

  const hasExtra = (parseFloat(extraPayment) || 0) > 0

  return (
    <CalcShell
      title="Loan Repayment"
      description="Calculate monthly repayments and total interest for any loan."
      inputs={
        <>
          <Row label="Loan amount">
            <CurrencyInput value={loan} onChange={setLoan} placeholder="25,000" />
          </Row>
          <Row label="Annual interest rate">
            <SuffixInput value={rate} onChange={setRate} suffix="%" placeholder="8.5" />
          </Row>
          <Row label="Loan term">
            <SuffixInput value={term} onChange={setTerm} suffix="yrs" placeholder="5" />
          </Row>
          <Row label="Extra monthly repayment">
            <CurrencyInput value={extraPayment} onChange={setExtraPayment} placeholder="0" />
          </Row>
        </>
      }
      result={
        calc ? (
          <Results
            items={[
              { label: 'Monthly payment', value: fmtCents(calc.pmt), primary: true },
              ...(hasExtra
                ? [
                    { label: 'Extra repayment', value: fmtCents(calc.extra) },
                    { label: 'Total monthly', value: fmtCents(calc.totalMonthly) },
                  ]
                : []),
              { label: 'Total interest', value: fmt(calc.totalInterest) },
              { label: 'Total amount paid', value: fmt(calc.totalPaid) },
              ...(hasExtra && calc.monthsSaved > 0
                ? [
                    {
                      label: 'Months saved',
                      value: `${calc.monthsSaved} mo (${(calc.monthsSaved / 12).toFixed(1)} yrs)`,
                    },
                    { label: 'Interest saved', value: fmt(calc.interestSaved) },
                  ]
                : []),
            ]}
          />
        ) : (
          <NoData />
        )
      }
      chart={
        <ExpandableChart
          title="Loan Amortisation"
          renderChart={(h) => {
            if (!calc?.amortData.length) {
              return <EmptyChart message="Enter loan details to see amortisation" height={h} />
            }
            const interval = Math.max(0, Math.floor(calc.amortData.length / 10) - 1)
            return (
              <ResponsiveContainer width="100%" height={h}>
                <BarChart
                  data={calc.amortData}
                  margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                  barCategoryGap="20%"
                >
                  <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="year"
                    tick={{ fontSize: 10, fill: '#9ca3af' }}
                    axisLine={false}
                    tickLine={false}
                    interval={interval}
                  />
                  <YAxis
                    tickFormatter={fmtAxis}
                    tick={{ fontSize: 10, fill: '#9ca3af' }}
                    axisLine={false}
                    tickLine={false}
                    width={48}
                  />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
                  <Bar dataKey="principal" stackId="a" fill="#6366f1" name="Principal" />
                  <Bar
                    dataKey="interest"
                    stackId="a"
                    fill="#f43f5e"
                    name="Interest"
                    radius={[3, 3, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )
          }}
        />
      }
      insights={
        calc && calc.yearlyData.length > 0 ? (
          <InsightsPanel>
            {hasExtra ? (
              <BreakdownTable
                headers={[
                  'Year',
                  'Bal (Standard)',
                  'Bal (Extra Pmt)',
                  'Int (Standard)',
                  'Int (Extra Pmt)',
                  'Interest Saved',
                ]}
                rows={calc.yearlyData.map((d) => [
                  `Year ${d.year}`,
                  fmt(d.stdBalance),
                  fmt(d.accBalance),
                  fmt(d.stdYearInterest),
                  fmt(d.accYearInterest),
                  fmt(d.stdCumInterest - d.accCumInterest),
                ])}
              />
            ) : (
              <BreakdownTable
                headers={[
                  'Year',
                  'Remaining Balance',
                  'Interest (Yr)',
                  'Principal (Yr)',
                  'Cumulative Interest',
                ]}
                rows={calc.yearlyData.map((d) => [
                  `Year ${d.year}`,
                  fmt(d.stdBalance),
                  fmt(d.stdYearInterest),
                  fmt(calc.amortData[d.year - 1]?.principal ?? 0),
                  fmt(d.stdCumInterest),
                ])}
              />
            )}
          </InsightsPanel>
        ) : undefined
      }
    />
  )
}

// ─── Inflation ────────────────────────────────────────────────────────────────

function InflationCalc() {
  const [params, setParams] = useSearchParams()
  const amount = params.get('inf_amount') ?? ''
  const rate = params.get('inf_rate') ?? ''
  const years = params.get('inf_years') ?? ''

  const setAmount = mkSetter(setParams, 'inf_amount')
  const setRate = mkSetter(setParams, 'inf_rate')
  const setYears = mkSetter(setParams, 'inf_years')

  const calc = useMemo(() => {
    const a = parseFloat(amount) || 0
    const r = parseFloat(rate) || 0
    const t = parseFloat(years) || 0
    if (!a || !t) return null
    const realValue = a / Math.pow(1 + r / 100, t)
    const lostValue = a - realValue
    const chartData = Array.from({ length: t + 1 }, (_, i) => {
      const val = a / Math.pow(1 + r / 100, i)
      return { year: i === 0 ? 'Today' : `Yr ${i}`, value: val, lost: a - val }
    })
    return { realValue, lostValue, percentLost: (lostValue / a) * 100, chartData }
  }, [amount, rate, years])

  return (
    <CalcShell
      title="Inflation Adjusted Value"
      description="See what today's money is worth in the future after inflation erodes purchasing power."
      inputs={
        <>
          <Row label="Current amount">
            <CurrencyInput value={amount} onChange={setAmount} placeholder="50,000" />
          </Row>
          <Row label="Inflation rate">
            <SuffixInput value={rate} onChange={setRate} suffix="%" placeholder="3" />
          </Row>
          <Row label="Years">
            <SuffixInput value={years} onChange={setYears} suffix="yrs" placeholder="20" />
          </Row>
        </>
      }
      result={
        calc ? (
          <Results
            items={[
              {
                label: "Purchasing power in today's $",
                value: fmt(calc.realValue),
                primary: true,
              },
              { label: 'Value lost to inflation', value: fmt(calc.lostValue) },
              { label: 'Purchasing power lost', value: `${calc.percentLost.toFixed(1)}%` },
            ]}
          />
        ) : (
          <NoData />
        )
      }
      chart={
        <ExpandableChart
          title="Purchasing Power Over Time"
          renderChart={(h) => {
            if (!calc?.chartData.length) {
              return <EmptyChart message="Enter values to see purchasing power chart" height={h} />
            }
            const interval = Math.max(0, Math.floor(calc.chartData.length / 10) - 1)
            return (
              <ResponsiveContainer width="100%" height={h}>
                <BarChart
                  data={calc.chartData}
                  margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                  barCategoryGap="20%"
                >
                  <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="year"
                    tick={{ fontSize: 10, fill: '#9ca3af' }}
                    axisLine={false}
                    tickLine={false}
                    interval={interval}
                  />
                  <YAxis
                    tickFormatter={fmtAxis}
                    tick={{ fontSize: 10, fill: '#9ca3af' }}
                    axisLine={false}
                    tickLine={false}
                    width={48}
                  />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
                  <Bar dataKey="value" stackId="a" fill="#6366f1" name="Real value" />
                  <Bar
                    dataKey="lost"
                    stackId="a"
                    fill="#e2e8f0"
                    name="Lost to inflation"
                    radius={[3, 3, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )
          }}
        />
      }
    />
  )
}

// ─── Rent vs Buy ──────────────────────────────────────────────────────────────

function RentVsBuyCalc() {
  const [params, setParams] = useSearchParams()
  const homePrice = params.get('home_price') ?? ''
  const rent = params.get('monthly_rent') ?? ''
  const downPct = params.get('down_pct') ?? '20'
  const mortgageRate = params.get('mortgage_rate') ?? '6.5'
  const appreciation = params.get('appreciation') ?? '3'

  const setHomePrice = mkSetter(setParams, 'home_price')
  const setRent = mkSetter(setParams, 'monthly_rent')
  const setDownPct = mkSetter(setParams, 'down_pct')
  const setMortgageRate = mkSetter(setParams, 'mortgage_rate')
  const setAppreciation = mkSetter(setParams, 'appreciation')

  const calc = useMemo(() => {
    const price = parseFloat(homePrice) || 0
    const monthlyRent = parseFloat(rent) || 0
    if (!price || !monthlyRent) return null

    const down = price * ((parseFloat(downPct) || 20) / 100)
    const loanAmt = price - down
    const r = (parseFloat(mortgageRate) || 6.5) / 100 / 12
    const n = 30 * 12
    const pmt =
      r === 0 ? loanAmt / n : (loanAmt * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
    const maintenanceMonthly = (price * 0.01) / 12
    const annualAppreciation = (parseFloat(appreciation) || 3) / 100

    let balance = loanAmt
    let breakEvenYear: number | null = null
    const chartData = Array.from({ length: 30 }, (_, i) => {
      const y = i + 1
      for (let m = 0; m < 12; m++) {
        const intPayment = balance * r
        const prinPayment = Math.min(pmt - intPayment, balance)
        balance = Math.max(0, balance - prinPayment)
      }
      const homeValue = price * Math.pow(1 + annualAppreciation, y)
      const equity = homeValue - balance
      const totalCashOut = down + (pmt + maintenanceMonthly) * 12 * y
      const buyNetCost = Math.max(0, totalCashOut - equity)
      const rentNetCost = monthlyRent * 12 * y

      if (breakEvenYear === null && buyNetCost < rentNetCost) breakEvenYear = y

      return { year: `Yr ${y}`, buy: buyNetCost, rent: rentNetCost }
    })

    return { chartData, breakEvenYear, monthlyMortgage: pmt }
  }, [homePrice, rent, downPct, mortgageRate, appreciation])

  return (
    <CalcShell
      title="Break-Even Rent vs Buy"
      description="Compare renting vs buying to find when buying becomes the better financial decision."
      inputs={
        <>
          <Row label="Home price">
            <CurrencyInput value={homePrice} onChange={setHomePrice} placeholder="750,000" />
          </Row>
          <Row label="Monthly rent">
            <CurrencyInput value={rent} onChange={setRent} placeholder="2,500" />
          </Row>
          <Row label="Down payment">
            <SuffixInput value={downPct} onChange={setDownPct} suffix="%" placeholder="20" />
          </Row>
          <Row label="Mortgage rate">
            <SuffixInput
              value={mortgageRate}
              onChange={setMortgageRate}
              suffix="%"
              placeholder="6.5"
            />
          </Row>
          <Row label="Annual appreciation">
            <SuffixInput
              value={appreciation}
              onChange={setAppreciation}
              suffix="%"
              placeholder="3"
            />
          </Row>
        </>
      }
      result={
        calc ? (
          calc.breakEvenYear !== null ? (
            <Results
              items={[
                { label: 'Break-even point', value: `Year ${calc.breakEvenYear}`, primary: true },
                { label: 'Monthly mortgage', value: fmtCents(calc.monthlyMortgage) },
              ]}
            />
          ) : (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                No break-even within 30 years
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Try adjusting the appreciation rate or down payment.
              </p>
              <Results
                items={[{ label: 'Monthly mortgage', value: fmtCents(calc.monthlyMortgage) }]}
              />
            </div>
          )
        ) : (
          <NoData />
        )
      }
      chart={
        <ExpandableChart
          title="Cumulative Net Cost: Rent vs Buy"
          renderChart={(h) => {
            if (!calc?.chartData.length) {
              return <EmptyChart message="Enter home price and rent to see comparison" height={h} />
            }
            return (
              <ResponsiveContainer width="100%" height={h}>
                <ComposedChart
                  data={calc.chartData}
                  margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                >
                  <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="year"
                    tick={{ fontSize: 10, fill: '#9ca3af' }}
                    axisLine={false}
                    tickLine={false}
                    interval={4}
                  />
                  <YAxis
                    tickFormatter={fmtAxis}
                    tick={{ fontSize: 10, fill: '#9ca3af' }}
                    axisLine={false}
                    tickLine={false}
                    width={48}
                  />
                  <Tooltip
                    content={<ChartTooltip />}
                    cursor={{ stroke: '#e5e7eb', strokeWidth: 1 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="buy"
                    name="Buy (net cost)"
                    stroke="#6366f1"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="rent"
                    name="Rent (cumulative)"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            )
          }}
        />
      }
    />
  )
}

// ─── Superannuation ───────────────────────────────────────────────────────────

const CONCESSIONAL_CAP = 30_000

function SuperannuationCalc() {
  const [params, setParams] = useSearchParams()
  const currentBalance = params.get('super_balance') ?? ''
  const annualSalary = params.get('annual_salary') ?? ''
  const employerRate = params.get('employer_rate') ?? '12'
  const salarySacrifice = params.get('salary_sacrifice') ?? ''
  const afterTaxContrib = params.get('after_tax_contrib') ?? ''
  const annualReturn = params.get('annual_return') ?? '7.5'
  const yearsToRetirement = params.get('retire_years') ?? ''

  const setCurrentBalance = mkSetter(setParams, 'super_balance')
  const setAnnualSalary = mkSetter(setParams, 'annual_salary')
  const setEmployerRate = mkSetter(setParams, 'employer_rate')
  const setSalarySacrifice = mkSetter(setParams, 'salary_sacrifice')
  const setAfterTaxContrib = mkSetter(setParams, 'after_tax_contrib')
  const setAnnualReturn = mkSetter(setParams, 'annual_return')
  const setYearsToRetirement = mkSetter(setParams, 'retire_years')

  const calc = useMemo(() => {
    const balance = parseFloat(currentBalance) || 0
    const salary = parseFloat(annualSalary) || 0
    const erRate = parseFloat(employerRate) || 0
    const monthlySalarySacrifice = parseFloat(salarySacrifice) || 0
    const monthlyAfterTax = parseFloat(afterTaxContrib) || 0
    const returnRate = parseFloat(annualReturn) || 0
    const years = parseFloat(yearsToRetirement) || 0
    if (!years) return null

    const monthlyEmployer = (salary * erRate) / 100 / 12
    const monthlyTotal = monthlyEmployer + monthlySalarySacrifice + monthlyAfterTax
    const r = returnRate / 100 / 12

    const annualConcessional = (monthlyEmployer + monthlySalarySacrifice) * 12
    const annualNonConcessional = monthlyAfterTax * 12
    const isCapBreached = annualConcessional > CONCESSIONAL_CAP
    const capExcess = Math.max(0, annualConcessional - CONCESSIONAL_CAP)

    let bal = balance
    let totalContributions = 0
    let totalReturns = 0

    const yearlyData: {
      year: number
      openingBalance: number
      closingBalance: number
      employerContrib: number
      salarySacrificeContrib: number
      afterTaxContrib: number
      annualConcessional: number
      annualNonConcessional: number
      investmentReturns: number
    }[] = []

    for (let yr = 1; yr <= years; yr++) {
      const opening = bal
      let yearReturns = 0

      for (let mo = 0; mo < 12; mo++) {
        const returns = bal * r
        yearReturns += returns
        bal += returns + monthlyTotal
      }

      const yearEmployer = monthlyEmployer * 12
      const yearSalarySacrifice = monthlySalarySacrifice * 12
      const yearAfterTax = monthlyAfterTax * 12
      const yearTotal = monthlyTotal * 12

      totalContributions += yearTotal
      totalReturns += yearReturns

      yearlyData.push({
        year: yr,
        openingBalance: opening,
        closingBalance: bal,
        employerContrib: yearEmployer,
        salarySacrificeContrib: yearSalarySacrifice,
        afterTaxContrib: yearAfterTax,
        annualConcessional: yearEmployer + yearSalarySacrifice,
        annualNonConcessional: yearAfterTax,
        investmentReturns: yearReturns,
      })
    }

    return {
      projectedBalance: bal,
      totalContributions,
      totalReturns,
      monthlyTotal,
      monthlyEmployer,
      monthlySalarySacrifice,
      monthlyAfterTax,
      annualConcessional,
      annualNonConcessional,
      isCapBreached,
      capExcess,
      yearlyData,
    }
  }, [
    currentBalance,
    annualSalary,
    employerRate,
    salarySacrifice,
    afterTaxContrib,
    annualReturn,
    yearsToRetirement,
  ])

  const balance = parseFloat(currentBalance) || 0
  const returnRate = parseFloat(annualReturn) || 0

  return (
    <CalcShell
      title="Superannuation"
      description="Project your super balance at retirement. Employer SG defaults to 12%. Salary sacrifice is concessional (pre-tax, capped at $30k/yr including employer). After-tax contributions are non-concessional."
      inputs={
        <>
          <Row label="Current super balance">
            <CurrencyInput
              value={currentBalance}
              onChange={setCurrentBalance}
              placeholder="50,000"
            />
          </Row>
          <Row label="Annual salary (pre-tax)">
            <CurrencyInput value={annualSalary} onChange={setAnnualSalary} placeholder="85,000" />
          </Row>
          <Row label="Employer SG rate">
            <SuffixInput
              value={employerRate}
              onChange={setEmployerRate}
              suffix="%"
              placeholder="12"
            />
          </Row>
          <Row label="Salary sacrifice / month (concessional)">
            <CurrencyInput value={salarySacrifice} onChange={setSalarySacrifice} placeholder="0" />
          </Row>
          <Row label="After-tax contribution / month (non-concessional)">
            <CurrencyInput value={afterTaxContrib} onChange={setAfterTaxContrib} placeholder="0" />
          </Row>
          <Row label="Annual return rate">
            <SuffixInput
              value={annualReturn}
              onChange={setAnnualReturn}
              suffix="%"
              placeholder="7.5"
            />
          </Row>
          <Row label="Years to retirement">
            <SuffixInput
              value={yearsToRetirement}
              onChange={setYearsToRetirement}
              suffix="yrs"
              placeholder="30"
            />
          </Row>
        </>
      }
      result={
        calc ? (
          <div className="space-y-4">
            <Results
              items={[
                { label: 'Projected balance', value: fmt(calc.projectedBalance), primary: true },
                { label: 'Total contributions', value: fmt(calc.totalContributions) },
                { label: 'Investment returns', value: fmt(Math.max(0, calc.totalReturns)) },
              ]}
            />
            <div className="pt-3 border-t border-gray-100 dark:border-gray-800 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                Monthly contributions
              </p>
              <Results
                items={[
                  { label: 'Employer SG', value: fmtCents(calc.monthlyEmployer) },
                  ...(calc.monthlySalarySacrifice > 0
                    ? [{ label: 'Salary sacrifice', value: fmtCents(calc.monthlySalarySacrifice) }]
                    : []),
                  ...(calc.monthlyAfterTax > 0
                    ? [{ label: 'After-tax', value: fmtCents(calc.monthlyAfterTax) }]
                    : []),
                  { label: 'Total / month', value: fmtCents(calc.monthlyTotal) },
                ]}
              />
            </div>
            <div className="pt-3 border-t border-gray-100 dark:border-gray-800 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                Annual contribution type
              </p>
              <Results
                items={[
                  {
                    label: `Concessional (pre-tax)`,
                    value: `${fmt(calc.annualConcessional)} / yr`,
                  },
                  ...(calc.annualNonConcessional > 0
                    ? [
                        {
                          label: 'Non-concessional (after-tax)',
                          value: `${fmt(calc.annualNonConcessional)} / yr`,
                        },
                      ]
                    : []),
                ]}
              />
              {calc.isCapBreached ? (
                <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg px-3 py-2">
                  ⚠ Concessional cap exceeded by {fmt(calc.capExcess)} — excess may be taxed at your
                  marginal rate.
                </p>
              ) : (
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  {fmt(CONCESSIONAL_CAP - calc.annualConcessional)} remaining in concessional cap
                </p>
              )}
            </div>
          </div>
        ) : (
          <p className="text-xs text-gray-400 dark:text-gray-600">Enter values to see projection</p>
        )
      }
      chart={
        <ExpandableChart
          title="Super Growth Projection"
          renderChart={(h) => (
            <GrowthBarChart
              initialBalance={balance}
              monthlyContribution={calc?.monthlyTotal ?? 0}
              annualRate={returnRate}
              target={calc?.projectedBalance}
              height={h}
            />
          )}
        />
      }
      insights={
        calc && calc.yearlyData.length > 0 ? (
          <InsightsPanel>
            <BreakdownTable
              headers={[
                'Year',
                'Opening Balance',
                'Employer',
                'Salary Sacrifice',
                'After-Tax',
                'Concessional / yr',
                'Returns',
                'Closing Balance',
              ]}
              rows={calc.yearlyData.map((d) => [
                `Year ${d.year}`,
                fmt(d.openingBalance),
                fmt(d.employerContrib),
                fmt(d.salarySacrificeContrib),
                fmt(d.afterTaxContrib),
                d.annualConcessional > CONCESSIONAL_CAP
                  ? `${fmt(d.annualConcessional)} ⚠`
                  : fmt(d.annualConcessional),
                fmt(d.investmentReturns),
                fmt(d.closingBalance),
              ])}
            />
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">
              ⚠ marks years where concessional contributions exceed the $
              {(CONCESSIONAL_CAP / 1000).toFixed(0)}k cap.
            </p>
          </InsightsPanel>
        ) : undefined
      }
    />
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Calculators() {
  const [params, setParams] = useSearchParams()
  const tab = (params.get('tab') as CalcTab) ?? 'compound'

  const setTab = (t: CalcTab) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.set('tab', t)
        return next
      },
      { replace: true }
    )

  return (
    <div>
      <PageHeader
        title="Calculators"
        subtitle="Financial calculators with live visual projections."
      />
      <TabBar tabs={TABS} active={tab} onChange={setTab} />
      {tab === 'compound' && <CompoundInterestCalc />}
      {tab === 'rule72' && <Rule72Calc />}
      {tab === 'savings' && <SavingsGoalCalc />}
      {tab === 'loan' && <LoanRepaymentCalc />}
      {tab === 'inflation' && <InflationCalc />}
      {tab === 'rentbuy' && <RentVsBuyCalc />}
      {tab === 'super' && <SuperannuationCalc />}
    </div>
  )
}
