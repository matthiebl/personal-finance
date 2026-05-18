export function fmt(n: number): string {
  const abs = Math.abs(Math.round(n))
  return (n < 0 ? '-$' : '$') + abs.toLocaleString('en-AU')
}

export function fmtAxis(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(0)}k`
  return `$${Math.round(n)}`
}

export function calcMonthsToGoal(
  balance: number,
  target: number,
  contribution: number,
  annualRate: number,
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
