import Papa from 'papaparse'
import type { ImportColumnMap, ImportRow } from './types'

export function parseCsvText(text: string): {
  headers: string[]
  rows: Record<string, string>[]
  errors: string[]
  noHeaderRow: boolean
} {
  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  })

  const headers = (result.meta.fields ?? []).filter((h) => h !== '')
  const errors = result.errors.map((e) => e.message)

  if (headers.length === 0) {
    // No header row — re-parse as array and auto-name columns
    const arrayResult = Papa.parse<string[]>(text, { skipEmptyLines: true })
    const firstRow = arrayResult.data[0] ?? []
    const autoHeaders = firstRow.map((_, i) => `Column ${i + 1}`)
    const rows = arrayResult.data.map((row) =>
      Object.fromEntries(autoHeaders.map((h, i) => [h, row[i] ?? '']))
    )
    return { headers: autoHeaders, rows, errors, noHeaderRow: true }
  }

  return {
    headers,
    rows: result.data,
    errors,
    noHeaderRow: false,
  }
}

const DATE_PATTERNS = ['date', 'time', 'posted', 'transaction date', 'value date', 'effective date']
const AMOUNT_PATTERNS = ['amount', 'debit', 'credit', 'value', 'sum']
const DESC_PATTERNS = [
  'description',
  'narration',
  'details',
  'merchant',
  'payee',
  'memo',
  'reference',
  'particulars',
  'narrative',
]

function matchHeader(header: string, patterns: string[]): boolean {
  const lower = header.toLowerCase()
  return patterns.some((p) => lower.includes(p))
}

export function guessColumnMap(headers: string[]): Partial<ImportColumnMap> {
  const map: Partial<ImportColumnMap> = {}
  for (const h of headers) {
    if (!map.date && matchHeader(h, DATE_PATTERNS)) map.date = h
    else if (!map.amount && matchHeader(h, AMOUNT_PATTERNS)) map.amount = h
    else if (!map.description && matchHeader(h, DESC_PATTERNS)) map.description = h
  }
  return map
}

// Supported format tokens: YYYY, MM, DD, M, D
const FORMAT_CANDIDATES = [
  'DD/MM/YYYY',
  'MM/DD/YYYY',
  'YYYY-MM-DD',
  'DD-MM-YYYY',
  'D/M/YYYY',
  'M/D/YYYY',
  'YYYY/MM/DD',
  'DD MMM YYYY',
  'D MMM YYYY',
]

export function parseDate(value: string, format: string): string | null {
  if (!value.trim()) return null

  const MONTH_NAMES: Record<string, string> = {
    jan: '01',
    feb: '02',
    mar: '03',
    apr: '04',
    may: '05',
    jun: '06',
    jul: '07',
    aug: '08',
    sep: '09',
    oct: '10',
    nov: '11',
    dec: '12',
  }

  // Handle MMM formats (e.g. "15 Jan 2025")
  if (format.includes('MMM')) {
    const mmmMatch = value.match(/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})$/)
    if (!mmmMatch) return null
    const [, day, mon, year] = mmmMatch
    const month = MONTH_NAMES[mon.toLowerCase()]
    if (!month) return null
    const d = day.padStart(2, '0')
    if (!isValidDate(year, month, d)) return null
    return `${year}-${month}-${d}`
  }

  // Determine separator
  const sep = format.includes('/') ? '/' : format.includes('-') ? '-' : null
  if (!sep) return null

  const valueParts = value.split(sep)
  const formatParts = format.split(sep)
  if (valueParts.length !== formatParts.length) return null

  let year = '',
    month = '',
    day = ''
  for (let i = 0; i < formatParts.length; i++) {
    const token = formatParts[i]
    const part = valueParts[i]
    if (token === 'YYYY') year = part
    else if (token === 'MM' || token === 'M') month = part.padStart(2, '0')
    else if (token === 'DD' || token === 'D') day = part.padStart(2, '0')
  }

  if (!year || !month || !day) return null
  if (!isValidDate(year, month, day)) return null
  return `${year}-${month}-${day}`
}

function isValidDate(year: string, month: string, day: string): boolean {
  const y = parseInt(year, 10)
  const m = parseInt(month, 10)
  const d = parseInt(day, 10)
  if (isNaN(y) || isNaN(m) || isNaN(d)) return false
  if (m < 1 || m > 12 || d < 1 || d > 31) return false
  if (y < 1900 || y > 2100) return false
  const date = new Date(y, m - 1, d)
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d
}

export function detectDateFormat(samples: string[]): string | null {
  const nonEmpty = samples.filter(Boolean)
  if (nonEmpty.length === 0) return null
  for (const fmt of FORMAT_CANDIDATES) {
    if (nonEmpty.every((s) => parseDate(s, fmt) !== null)) return fmt
  }
  return null
}

export function normaliseAmount(raw: string, negateAmount: boolean): string {
  if (!raw.trim()) return ''

  // Handle accounting notation: (42.50) → -42.50
  const accountingMatch = raw.trim().match(/^\(([0-9,. $]+)\)$/)
  let value = accountingMatch ? `-${accountingMatch[1]}` : raw

  // Strip currency symbols, commas, spaces
  value = value.replace(/[$,\s]/g, '')

  const num = parseFloat(value)
  if (isNaN(num)) return ''

  const result = negateAmount ? -num : num
  return result.toFixed(2)
}

export function yearMonthFromDate(isoDate: string): string {
  return isoDate.slice(0, 7)
}

export function enrichRow(
  rawData: Record<string, string>,
  columnMap: ImportColumnMap,
  dateFormat: string,
  negateAmount: boolean
): Pick<ImportRow, 'description' | 'amount' | 'parsedDate'> {
  const rawDesc = columnMap.description ? (rawData[columnMap.description] ?? '') : ''
  const rawAmount = columnMap.amount ? (rawData[columnMap.amount] ?? '') : ''
  const rawDate = columnMap.date ? (rawData[columnMap.date] ?? '') : ''

  return {
    description: rawDesc.trim(),
    amount: normaliseAmount(rawAmount, negateAmount),
    parsedDate: rawDate ? parseDate(rawDate, dateFormat) : null,
  }
}

export function validateRowForSave(row: ImportRow): string | null {
  if (!row.amount) return 'Missing amount'
  if (!row.categoryId) return 'Missing category'

  const ym = row.monthOverride ?? (row.parsedDate ? yearMonthFromDate(row.parsedDate) : null)
  if (!ym) return 'Missing month — set a Month Override or map a date column in Advanced'

  return null
}
