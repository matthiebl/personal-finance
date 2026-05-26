import type { ImportRow, ImportRule } from './types'

function matchesDescription(rule: ImportRule, description: string): boolean {
  if (!rule.matchValue) return true
  const hay = description.toLowerCase()
  const needle = rule.matchValue.toLowerCase()
  switch (rule.matchType) {
    case 'exact':
      return hay === needle
    case 'starts_with':
      return hay.startsWith(needle)
    case 'contains':
      return hay.includes(needle)
    case 'regex':
      try {
        return new RegExp(rule.matchValue, 'i').test(description)
      } catch {
        return false
      }
  }
}

function matchesAmount(rule: ImportRule, amount: string): boolean {
  if (rule.amountMin === null && rule.amountMax === null) return true
  const val = parseFloat(amount)
  if (isNaN(val)) return false
  if (rule.amountMin !== null && val < parseFloat(rule.amountMin)) return false
  if (rule.amountMax !== null && val > parseFloat(rule.amountMax)) return false
  return true
}

export function applyRulesToRow(
  row: ImportRow,
  rules: ImportRule[]
): { patch: Partial<ImportRow>; ruleId: string } | null {
  for (const rule of rules) {
    if (!matchesDescription(rule, row.description)) continue
    if (!matchesAmount(rule, row.amount)) continue
    const patch: Partial<ImportRow> = {}
    if (rule.categoryId) patch.categoryId = rule.categoryId
    if (rule.tags) patch.tags = rule.tags
    if (rule.renameTo) patch.description = rule.renameTo
    if (Object.keys(patch).length === 0) continue
    return { patch, ruleId: rule.id }
  }
  return null
}

export function applyRulesToRows(
  rows: ImportRow[],
  rules: ImportRule[],
  options: { skipIfCategorized: boolean } = { skipIfCategorized: true }
): { rows: ImportRow[]; matchedRules: Record<string, string> } {
  const sorted = [...rules].sort((a, b) => a.priority - b.priority)
  const matchedRules: Record<string, string> = {}
  const updated = rows.map((row) => {
    if (options.skipIfCategorized && row.categoryId) return row
    const result = applyRulesToRow(row, sorted)
    if (!result) return row
    matchedRules[row.id] = result.ruleId
    return { ...row, ...result.patch }
  })
  return { rows: updated, matchedRules }
}
