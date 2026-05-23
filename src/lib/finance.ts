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
