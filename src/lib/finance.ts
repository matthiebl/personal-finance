export function fmt(n: number): string {
  const abs = Math.abs(Math.round(n))
  return (n < 0 ? '-$' : '$') + abs.toLocaleString('en-AU')
}

export function fmtCents(n: number): string {
  const abs = Math.abs(n)
  return (
    (n < 0 ? '-$' : '$') +
    abs.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  )
}

export function fmtAxis(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(0)}k`
  return `$${Math.round(n)}`
}

const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

export type DebtPayoffInput = {
  id: string
  name: string
  balance: number
  minPayment: number
  rate: number
}

export type PayoffPeriodDatum = { label: string; [id: string]: number | string }

export type DebtPayoffResult = {
  payoffDates: Record<string, string | null>
  series: PayoffPeriodDatum[]
  totalMonths: number
}

function addMonthsToYearMonth(startYearMonth: string, months: number): string {
  const [y, m] = startYearMonth.split('-').map(Number)
  const total = m - 1 + months
  const year = y + Math.floor(total / 12)
  const month = (total % 12) + 1
  return `${year}-${String(month).padStart(2, '0')}`
}

export function formatYearMonth(ym: string): string {
  const [y, m] = ym.split('-').map(Number)
  return `${MONTH_NAMES[m - 1]} ${y}`
}

export function calcDebtPayoff(
  debts: DebtPayoffInput[],
  extraMonthly: number,
  strategy: 'snowball' | 'avalanche',
  startYearMonth: string
): DebtPayoffResult {
  if (debts.length === 0 || debts.every((d) => d.balance <= 0)) {
    return { payoffDates: {}, series: [], totalMonths: 0 }
  }

  const balances: Record<string, number> = {}
  for (const d of debts) balances[d.id] = Math.max(0, d.balance)

  const payoffMonths: Record<string, number | null> = {}
  for (const d of debts) payoffMonths[d.id] = null

  let freedPayments = 0
  let totalMonths = 0
  const MAX_MONTHS = 600
  const rawSeries: { month: number; balances: Record<string, number> }[] = []

  for (let month = 1; month <= MAX_MONTHS; month++) {
    // Apply monthly interest
    for (const d of debts) {
      if (balances[d.id] > 0 && d.rate > 0) {
        balances[d.id] += balances[d.id] * (d.rate / 12 / 100)
      }
    }

    // Apply minimum payments
    for (const d of debts) {
      if (balances[d.id] > 0) {
        const payment = Math.min(d.minPayment, balances[d.id])
        balances[d.id] -= payment
        if (balances[d.id] < 0.01) {
          balances[d.id] = 0
          if (payoffMonths[d.id] === null) {
            payoffMonths[d.id] = month
            freedPayments += d.minPayment
          }
        }
      }
    }

    // Apply extra + freed payments in strategy order
    const available = extraMonthly + freedPayments
    if (available > 0) {
      const unpaid = debts
        .filter((d) => balances[d.id] > 0)
        .sort(
          strategy === 'snowball'
            ? (a, b) => balances[a.id] - balances[b.id]
            : (a, b) => b.rate - a.rate
        )
      let remaining = available
      for (const d of unpaid) {
        if (remaining <= 0) break
        const apply = Math.min(remaining, balances[d.id])
        balances[d.id] -= apply
        remaining -= apply
        if (balances[d.id] < 0.01) {
          balances[d.id] = 0
          if (payoffMonths[d.id] === null) {
            payoffMonths[d.id] = month
            freedPayments += d.minPayment
          }
        }
      }
    }

    rawSeries.push({ month, balances: { ...balances } })

    if (debts.every((d) => balances[d.id] === 0)) {
      totalMonths = month
      break
    }
    totalMonths = month
  }

  // Build chart series — yearly if long, monthly if short
  const useYearly = totalMonths > 36
  const series: PayoffPeriodDatum[] = []

  if (useYearly) {
    const years = Math.ceil(totalMonths / 12)
    for (let y = 0; y <= years; y++) {
      const monthIdx = y === 0 ? 0 : Math.min(y * 12, totalMonths) - 1
      const snap =
        y === 0
          ? Object.fromEntries(debts.map((d) => [d.id, d.balance]))
          : (rawSeries[monthIdx]?.balances ?? Object.fromEntries(debts.map((d) => [d.id, 0])))
      const ym = addMonthsToYearMonth(startYearMonth, y * 12)
      const label = ym.split('-')[0]
      const datum: PayoffPeriodDatum = { label }
      for (const d of debts) datum[d.id] = Math.max(0, Math.round(snap[d.id] ?? 0))
      series.push(datum)
    }
  } else {
    // Add month 0 (current balances)
    const datum0: PayoffPeriodDatum = { label: formatYearMonth(startYearMonth) }
    for (const d of debts) datum0[d.id] = Math.round(d.balance)
    series.push(datum0)
    for (const snap of rawSeries) {
      const ym = addMonthsToYearMonth(startYearMonth, snap.month)
      const datum: PayoffPeriodDatum = { label: formatYearMonth(ym) }
      for (const d of debts) datum[d.id] = Math.max(0, Math.round(snap.balances[d.id] ?? 0))
      series.push(datum)
    }
  }

  // Build payoff date strings
  const payoffDates: Record<string, string | null> = {}
  for (const d of debts) {
    const m = payoffMonths[d.id]
    payoffDates[d.id] = m !== null ? addMonthsToYearMonth(startYearMonth, m) : null
  }

  return { payoffDates, series, totalMonths }
}

export function calcMonthsToGoal(
  balance: number,
  target: number,
  contribution: number,
  annualRate: number
): number | null {
  if (target <= 0 || balance >= target) return null
  if (contribution <= 0 && annualRate <= 0) return null
  const rm = annualRate / 12 / 100
  let bal = balance
  for (let n = 1; n <= 1200; n++) {
    bal = bal * (1 + rm) + contribution
    if (bal >= target) return n
  }
  return null
}

export function calcMortgageRepayment(
  principal: number,
  annualRate: number,
  termYears: number
): number {
  if (principal <= 0 || termYears <= 0) return 0
  const n = termYears * 12
  if (annualRate <= 0) return principal / n
  const r = annualRate / 100 / 12
  return (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
}

export function calcBorrowingCapacity(
  maxMonthlyRepayment: number,
  assessmentRate: number,
  termYears: number
): number {
  if (maxMonthlyRepayment <= 0 || assessmentRate <= 0 || termYears <= 0) return 0
  const r = assessmentRate / 100 / 12
  const n = termYears * 12
  return (maxMonthlyRepayment * (Math.pow(1 + r, n) - 1)) / (r * Math.pow(1 + r, n))
}

export function calcLMI(loanAmount: number, purchasePrice: number): number {
  if (loanAmount <= 0 || purchasePrice <= 0) return 0
  const lvr = (loanAmount / purchasePrice) * 100
  if (lvr <= 80) return 0
  if (lvr <= 85) return Math.round(loanAmount * 0.005)
  if (lvr <= 90) return Math.round(loanAmount * 0.015)
  if (lvr <= 95) return Math.round(loanAmount * 0.03)
  return Math.round(loanAmount * 0.04)
}

export function calcStampDuty(
  purchasePrice: number,
  state: string,
  firstHomeBuyer: boolean
): number {
  if (purchasePrice <= 0) return 0

  function progressive(price: number, tiers: [number, number][]): number {
    let duty = 0
    let prev = 0
    for (const [upper, rate] of tiers) {
      if (price <= prev) break
      duty += (Math.min(price, upper) - prev) * (rate / 100)
      if (price <= upper) break
      prev = upper
    }
    return duty
  }

  switch (state) {
    case 'NSW': {
      const standard = (p: number) =>
        progressive(p, [
          [16000, 1.25],
          [35000, 1.5],
          [93000, 1.75],
          [351000, 3.5],
          [1168000, 4.5],
          [3000000, 5.5],
          [Infinity, 7],
        ])
      if (!firstHomeBuyer) return Math.round(standard(purchasePrice))
      if (purchasePrice <= 800000) return 0
      if (purchasePrice <= 1000000) {
        const full = standard(purchasePrice)
        return Math.round(full * (1 - (1000000 - purchasePrice) / 200000))
      }
      return Math.round(standard(purchasePrice))
    }

    case 'VIC': {
      const standard = (p: number) =>
        progressive(p, [
          [25000, 1.4],
          [130000, 2.4],
          [960000, 6],
          [Infinity, 5.5],
        ])
      if (!firstHomeBuyer) return Math.round(standard(purchasePrice))
      if (purchasePrice <= 600000) return 0
      if (purchasePrice < 750000) {
        const full = standard(purchasePrice)
        return Math.round(full * (1 - (750000 - purchasePrice) / 150000))
      }
      return Math.round(standard(purchasePrice))
    }

    case 'QLD': {
      const standard = (p: number) =>
        progressive(p, [
          [5000, 0],
          [75000, 1.5],
          [540000, 3.5],
          [1000000, 4.5],
          [Infinity, 5.75],
        ])
      if (!firstHomeBuyer) return Math.round(standard(purchasePrice))
      if (purchasePrice <= 700000) return 0
      return Math.round(standard(purchasePrice))
    }

    case 'WA': {
      const standard = (p: number) =>
        progressive(p, [
          [120000, 1.9],
          [150000, 2.85],
          [360000, 3.8],
          [725000, 4.75],
          [Infinity, 5.15],
        ])
      if (!firstHomeBuyer) return Math.round(standard(purchasePrice))
      if (purchasePrice <= 430000) return 0
      if (purchasePrice <= 530000) {
        const full = standard(purchasePrice)
        return Math.round(full * (1 - (530000 - purchasePrice) / 100000))
      }
      return Math.round(standard(purchasePrice))
    }

    case 'SA': {
      const standard = (p: number) =>
        progressive(p, [
          [12000, 1],
          [30000, 2],
          [50000, 3],
          [100000, 3.5],
          [200000, 4],
          [250000, 4.25],
          [300000, 4.75],
          [Infinity, 5],
        ])
      if (!firstHomeBuyer) return Math.round(standard(purchasePrice))
      // SA: no duty for new homes ≤ $650k, conservative established threshold $500k
      if (purchasePrice <= 500000) return 0
      return Math.round(standard(purchasePrice))
    }

    case 'TAS': {
      const standard = (p: number) =>
        progressive(p, [
          [3000, 0],
          [25000, 1.75],
          [75000, 2.25],
          [200000, 3.5],
          [375000, 4],
          [725000, 4.25],
          [Infinity, 4.5],
        ])
      if (!firstHomeBuyer) return Math.round(standard(purchasePrice))
      if (purchasePrice <= 600000) return Math.round(standard(purchasePrice) * 0.5)
      return Math.round(standard(purchasePrice))
    }

    case 'ACT': {
      const standard = (p: number) =>
        progressive(p, [
          [260000, 0],
          [300000, 0.6],
          [500000, 2.2],
          [750000, 3.4],
          [1000000, 4.32],
          [1455000, 5.9],
          [Infinity, 6.4],
        ])
      if (!firstHomeBuyer) return Math.round(standard(purchasePrice))
      if (purchasePrice <= 600000) return 0
      return Math.round(standard(purchasePrice))
    }

    case 'NT': {
      const standard = (p: number) =>
        progressive(p, [
          [525000, 3],
          [3000000, 4.95],
          [Infinity, 5.75],
        ])
      return Math.round(standard(purchasePrice))
    }

    default:
      return 0
  }
}
