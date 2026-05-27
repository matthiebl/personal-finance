import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AdvancedTab } from '../components/import/AdvancedTab'
import { ApiRawDataTab } from '../components/import/ApiRawDataTab'
import { BankImporter } from '../components/import/BankImporter'
import { EnrichedDataTab } from '../components/import/EnrichedDataTab'
import { ImportSourcePicker } from '../components/import/ImportSourcePicker'
import { ImportUploader } from '../components/import/ImportUploader'
import { RawDataTab } from '../components/import/RawDataTab'
import { RulesTab } from '../components/import/RulesTab'
import { PageHeader, SectionHeading, TabBar } from '../components/layout'
import { useAppData } from '../context/useAppData'
import { useAuth } from '../context/useAuth'
import {
  detectDateFormat,
  enrichRow,
  guessColumnMap,
  validateRowForSave,
  yearMonthFromDate,
} from '../lib/csv'
import { supabase } from '../lib/supabase'
import type { DbImportRule } from '../lib/supabase'
import { applyRulesToRow, applyRulesToRows } from '../lib/rules'
import type { BankProvider, BankTransaction } from '../lib/bankProviders'
import { bankTxToImportRowData } from '../lib/bankProviders'
import type { TxSuggestion } from '../components/inputs'
import type {
  BudgetCategory,
  ImportColumnMap,
  ImportRow,
  ImportRule,
  ImportSession,
  RuleMatchType,
  Transaction,
} from '../lib/types'

type ImportTab = 'enriched' | 'raw' | 'advanced' | 'rules'
type ImportSource = 'none' | 'picker' | 'csv' | 'api'

const TABS_CSV: { id: ImportTab; label: string }[] = [
  { id: 'enriched', label: 'Enriched' },
  { id: 'raw', label: 'Raw Data' },
  { id: 'advanced', label: 'Advanced' },
  { id: 'rules', label: 'Rules' },
]

const TABS_API: { id: ImportTab; label: string }[] = [
  { id: 'enriched', label: 'Enriched' },
  { id: 'raw', label: 'Raw Data' },
  { id: 'advanced', label: 'Advanced' },
  { id: 'rules', label: 'Rules' },
]

// ─── Auth gate ────────────────────────────────────────────────────────────────

export default function Import() {
  const { user, family, authLoaded } = useAuth()
  const { data } = useAppData()

  if (!authLoaded) {
    return (
      <div className="flex items-center justify-center py-24">
        <svg className="animate-spin h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24">
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      </div>
    )
  }

  if (!user || !family) {
    return (
      <div className="max-w-md mx-auto mt-24 text-center space-y-3">
        <p className="text-gray-700 dark:text-gray-300">
          Import requires a family account with cloud sync enabled.
        </p>
        <Link to="/settings" className="text-indigo-600 dark:text-indigo-400 underline text-sm">
          Go to Settings
        </Link>
      </div>
    )
  }

  return <ImportPageContent familyId={family.id} categories={data.budget.categories} />
}

// ─── Page content ─────────────────────────────────────────────────────────────

function mapDbSession(db: Record<string, unknown>): ImportSession {
  const map = (db.column_map as Record<string, string>) ?? {}
  return {
    id: db.id as string,
    familyId: db.family_id as string,
    createdAt: db.created_at as string,
    source: (db.source as ImportSession['source']) ?? 'csv',
    filename: (db.filename as string | null) ?? null,
    rowCount: (db.row_count as number) ?? 0,
    columnMap: {
      date: map.date ?? '',
      amount: map.amount ?? '',
      description: map.description ?? '',
      tags: map.tags ?? '',
    },
    dateFormat: (db.date_format as string) ?? 'DD/MM/YYYY',
    negateAmount: (db.negate_amount as boolean) ?? false,
  }
}

function mapDbRule(db: DbImportRule): ImportRule {
  return {
    id: db.id,
    familyId: db.family_id,
    createdAt: db.created_at,
    priority: db.priority,
    matchType: db.match_type as RuleMatchType,
    matchValue: db.match_value,
    amountMin: db.amount_min,
    amountMax: db.amount_max,
    categoryId: db.category_id,
    tags: db.tags,
    renameTo: db.rename_to,
  }
}

function ruleToDb(rule: Partial<Omit<ImportRule, 'id' | 'familyId' | 'createdAt'>>) {
  const out: Record<string, unknown> = {}
  if (rule.priority !== undefined) out.priority = rule.priority
  if (rule.matchType !== undefined) out.match_type = rule.matchType
  if (rule.matchValue !== undefined) out.match_value = rule.matchValue
  if ('amountMin' in rule) out.amount_min = rule.amountMin
  if ('amountMax' in rule) out.amount_max = rule.amountMax
  if (rule.categoryId !== undefined) out.category_id = rule.categoryId
  if (rule.tags !== undefined) out.tags = rule.tags
  if (rule.renameTo !== undefined) out.rename_to = rule.renameTo
  return out
}

function mapDbRow(db: Record<string, unknown>, selected = false): ImportRow {
  return {
    id: db.id as string,
    rowIndex: db.row_index as number,
    rawData: (db.raw_data as Record<string, string>) ?? {},
    description: (db.description as string) ?? '',
    amount: (db.amount as string) ?? '',
    categoryId: (db.category_id as string) ?? '',
    tags: (db.tags as string) ?? '',
    monthOverride: (db.month_override as string | null) ?? null,
    parsedDate: (db.parsed_date as string | null) ?? null,
    selected,
  }
}

function formatSessionDate(isoString: string): string {
  const date = new Date(isoString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  return date.toLocaleDateString()
}

function ImportPageContent({
  familyId,
  categories,
}: {
  familyId: string
  categories: BudgetCategory[]
}) {
  const { insertTransaction, data } = useAppData()

  const suggestions = useMemo(() => {
    const categoryLabelById: Record<string, string> = {}
    for (const c of categories) categoryLabelById[c.id] = c.label
    const seen = new Map<string, TxSuggestion>()
    for (const year of Object.values(data.budget.years)) {
      for (const month of Object.values(year.months)) {
        if (!month) continue
        for (const tx of month.transactions) {
          if (!tx.description.trim()) continue
          const key = `${tx.description}\0${tx.categoryId}\0${tx.tags ?? ''}`
          seen.set(key, {
            description: tx.description,
            categoryId: tx.categoryId,
            tags: tx.tags,
            categoryLabel: categoryLabelById[tx.categoryId] ?? '',
          })
        }
      }
    }
    return Array.from(seen.values())
  }, [data.budget.years, categories])

  const [sessions, setSessions] = useState<ImportSession[]>([])
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [rows, setRows] = useState<ImportRow[]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [noHeaderWarning, setNoHeaderWarning] = useState(false)
  const [detectedDateFormat, setDetectedDateFormat] = useState<string | null>(null)

  const [rules, setRules] = useState<ImportRule[]>([])
  const [rulesLoading, setRulesLoading] = useState(true)
  const [appliedRuleIds, setAppliedRuleIds] = useState<Record<string, string>>({})

  const [importSource, setImportSource] = useState<ImportSource>('none')
  const [activeTab, setActiveTab] = useState<ImportTab>('enriched')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const rowSaveTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  // Derived active session
  const session = sessions.find((s) => s.id === activeSessionId) ?? null

  // Load all sessions and rules on mount (in parallel)
  useEffect(() => {
    async function load() {
      const [sessionsResult, rulesResult] = await Promise.all([
        supabase
          .from('import_sessions')
          .select('*')
          .eq('family_id', familyId)
          .order('created_at', { ascending: false }),
        supabase
          .from('import_rules')
          .select('*')
          .eq('family_id', familyId)
          .order('priority', { ascending: true }),
      ])

      const loadedRules = (rulesResult.data ?? []).map((r) => mapDbRule(r as DbImportRule))
      setRules(loadedRules)
      setRulesLoading(false)

      setSessions((sessionsResult.data ?? []).map((s) => mapDbSession(s as Record<string, unknown>)))
      setLoading(false)
    }
    load()
  }, [familyId])

  // ─── Select session ─────────────────────────────────────────────────────────

  async function handleSelectSession(sessionId: string) {
    setBusy(true)
    const { data: dbRows } = await supabase
      .from('import_rows')
      .select('*')
      .eq('session_id', sessionId)
      .order('row_index', { ascending: true })

    const importRows = (dbRows ?? []).map((r) => mapDbRow(r as Record<string, unknown>))
    setRows(importRows)
    setHeaders(importRows[0] ? Object.keys(importRows[0].rawData) : [])
    setNoHeaderWarning(false)
    setDetectedDateFormat(null)
    setActiveSessionId(sessionId)
    setActiveTab('enriched')
    setBusy(false)
  }

  function handleBackToList() {
    setActiveSessionId(null)
    setRows([])
    setHeaders([])
    setNoHeaderWarning(false)
    setDetectedDateFormat(null)
    setImportSource('none')
    setActiveTab('enriched')
  }

  // ─── Upload handler ─────────────────────────────────────────────────────────

  async function handleFileParsed(
    csvHeaders: string[],
    rawRows: Record<string, string>[],
    filename: string,
    noHeader: boolean
  ) {
    setBusy(true)
    setError(null)
    setNoHeaderWarning(noHeader)

    try {
      const guessed = guessColumnMap(csvHeaders)
      const columnMap: ImportColumnMap = {
        date: guessed.date ?? '',
        amount: guessed.amount ?? '',
        description: guessed.description ?? '',
        tags: guessed.tags ?? '',
      }

      const dateSamples = rawRows
        .slice(0, 5)
        .map((r) => (columnMap.date ? (r[columnMap.date] ?? '') : ''))
        .filter(Boolean)
      const detected = detectDateFormat(dateSamples)
      const dateFormat = detected ?? 'DD/MM/YYYY'
      setDetectedDateFormat(detected)

      // Create session
      const { data: sessionData, error: sessionErr } = await supabase
        .from('import_sessions')
        .insert({
          family_id: familyId,
          source: 'csv',
          filename,
          row_count: rawRows.length,
          column_map: columnMap,
          date_format: dateFormat,
          negate_amount: false,
        })
        .select()
        .single()

      if (sessionErr) throw new Error(sessionErr.message)

      // Build rows for insertion
      const dbRowsToInsert = rawRows.map((rawData, i) => {
        const enriched = enrichRow(rawData, columnMap, dateFormat, false)
        return {
          session_id: sessionData.id,
          family_id: familyId,
          row_index: i,
          raw_data: rawData,
          description: enriched.description,
          amount: enriched.amount,
          category_id: '',
          tags: '',
          month_override: null,
          parsed_date: enriched.parsedDate,
        }
      })

      // Batch insert in chunks of 500
      for (let i = 0; i < dbRowsToInsert.length; i += 500) {
        const { error: insertErr } = await supabase
          .from('import_rows')
          .insert(dbRowsToInsert.slice(i, i + 500))
        if (insertErr) throw new Error(insertErr.message)
      }

      // Reload to get generated IDs
      const { data: inserted } = await supabase
        .from('import_rows')
        .select('*')
        .eq('session_id', sessionData.id)
        .order('row_index', { ascending: true })

      const newSession = mapDbSession(sessionData as Record<string, unknown>)
      const importRows = (inserted ?? []).map((r) => mapDbRow(r as Record<string, unknown>))

      setSessions((prev) => [newSession, ...prev])
      setActiveSessionId(newSession.id)
      setHeaders(csvHeaders)
      setImportSource('none')
      setActiveTab(noHeader ? 'advanced' : 'enriched')

      // Apply rules to freshly uploaded rows
      if (rules.length > 0) {
        const { rows: enriched, matchedRules } = applyRulesToRows(importRows, rules, {
          skipIfCategorized: true,
        })
        setAppliedRuleIds(matchedRules)
        enriched.forEach((row, i) => {
          if (row === importRows[i]) return
          supabase
            .from('import_rows')
            .update({ category_id: row.categoryId, tags: row.tags, description: row.description })
            .eq('id', row.id)
            .then(() => {})
        })
        setRows(enriched)
      } else {
        setRows(importRows)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setBusy(false)
    }
  }

  // ─── Bank API import handler ────────────────────────────────────────────────

  async function handleBankImported(transactions: BankTransaction[], provider: BankProvider) {
    if (transactions.length === 0) return
    setBusy(true)
    setError(null)

    try {
      const { data: sessionData, error: sessionErr } = await supabase
        .from('import_sessions')
        .insert({
          family_id: familyId,
          source: 'api',
          filename: provider.label,
          row_count: transactions.length,
          column_map: {},
          date_format: '',
          negate_amount: false,
        })
        .select()
        .single()

      if (sessionErr) throw new Error(sessionErr.message)

      const dbRowsToInsert = transactions.map((tx, i) => {
        const mapped = bankTxToImportRowData(tx)
        return {
          session_id: sessionData.id,
          family_id: familyId,
          row_index: i,
          raw_data: mapped.rawData,
          description: mapped.description,
          amount: mapped.amount,
          category_id: '',
          tags: '',
          month_override: null,
          parsed_date: mapped.parsedDate,
        }
      })

      for (let i = 0; i < dbRowsToInsert.length; i += 500) {
        const { error: insertErr } = await supabase
          .from('import_rows')
          .insert(dbRowsToInsert.slice(i, i + 500))
        if (insertErr) throw new Error(insertErr.message)
      }

      const { data: inserted } = await supabase
        .from('import_rows')
        .select('*')
        .eq('session_id', sessionData.id)
        .order('row_index', { ascending: true })

      const newSession = mapDbSession(sessionData as Record<string, unknown>)
      const importRows = (inserted ?? []).map((r) => mapDbRow(r as Record<string, unknown>))

      setSessions((prev) => [newSession, ...prev])
      setActiveSessionId(newSession.id)
      setHeaders(importRows[0] ? Object.keys(importRows[0].rawData) : [])
      setImportSource('none')
      setActiveTab('enriched')

      if (rules.length > 0) {
        const { rows: enriched, matchedRules } = applyRulesToRows(importRows, rules, {
          skipIfCategorized: true,
        })
        setAppliedRuleIds(matchedRules)
        enriched.forEach((row, i) => {
          if (row === importRows[i]) return
          supabase
            .from('import_rows')
            .update({ category_id: row.categoryId, tags: row.tags, description: row.description })
            .eq('id', row.id)
            .then(() => {})
        })
        setRows(enriched)
      } else {
        setRows(importRows)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed')
    } finally {
      setBusy(false)
    }
  }

  // ─── API negate toggle ──────────────────────────────────────────────────────

  async function handleApiNegateChange(negate: boolean) {
    if (!session || session.negateAmount === negate) return
    const updatedRows = rows.map((row) => ({
      ...row,
      amount: row.amount.startsWith('-')
        ? row.amount.slice(1)
        : row.amount === '0.00'
          ? row.amount
          : `-${row.amount}`,
    }))
    setRows(updatedRows)
    setSessions((prev) =>
      prev.map((s) => (s.id === session.id ? { ...s, negateAmount: negate } : s))
    )
    await supabase.from('import_sessions').update({ negate_amount: negate }).eq('id', session.id)
    updatedRows.forEach((row) => {
      supabase
        .from('import_rows')
        .update({ amount: row.amount })
        .eq('id', row.id)
        .then(() => {})
    })
  }

  // ─── Advanced tab changes ───────────────────────────────────────────────────

  async function handleAdvancedChange(
    newColumnMap: ImportColumnMap,
    newDateFormat: string,
    newNegate: boolean
  ) {
    if (!session) return

    // Re-enrich in memory immediately
    const updatedRows = rows.map((row) => {
      const enriched = enrichRow(row.rawData, newColumnMap, newDateFormat, newNegate)
      return { ...row, ...enriched }
    })
    setRows(updatedRows)
    setSessions((prev) =>
      prev.map((s) =>
        s.id === session.id
          ? { ...s, columnMap: newColumnMap, dateFormat: newDateFormat, negateAmount: newNegate }
          : s
      )
    )

    // Persist session settings
    await supabase
      .from('import_sessions')
      .update({ column_map: newColumnMap, date_format: newDateFormat, negate_amount: newNegate })
      .eq('id', session.id)

    // Update rows in Supabase (fire in parallel, no await — background sync)
    updatedRows.forEach((row) => {
      supabase
        .from('import_rows')
        .update({ description: row.description, amount: row.amount, parsed_date: row.parsedDate })
        .eq('id', row.id)
        .then(() => {})
    })
  }

  // ─── Row editing ────────────────────────────────────────────────────────────

  const latestRowsRef = useRef(rows)
  useEffect(() => {
    latestRowsRef.current = rows
  }, [rows])

  function handleRowChange(id: string, patch: Partial<ImportRow>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)))

    // Debounce Supabase write — skip if patch is UI-only (selected)
    if ('selected' in patch && Object.keys(patch).length === 1) return

    const existing = rowSaveTimers.current.get(id)
    if (existing) clearTimeout(existing)

    // Capture patch values in closure
    const patchCopy = { ...patch }
    const timer = setTimeout(() => {
      rowSaveTimers.current.delete(id)
      const current = latestRowsRef.current.find((r) => r.id === id)
      if (!current) return
      const merged = { ...current, ...patchCopy }
      supabase
        .from('import_rows')
        .update({
          description: merged.description,
          amount: merged.amount,
          category_id: merged.categoryId,
          tags: merged.tags,
          month_override: merged.monthOverride,
        })
        .eq('id', id)
        .then(() => {})
    }, 300)

    rowSaveTimers.current.set(id, timer)
  }

  // ─── Selection helpers ──────────────────────────────────────────────────────

  const selectedCount = rows.filter((r) => r.selected).length

  function handleToggleSelected(id: string) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, selected: !r.selected } : r)))
  }

  function handleToggleSelectAll() {
    const filtered = getFilteredRows()
    const visibleIds = new Set(filtered.map((r) => r.id))
    const allSelected = filtered.every((r) => r.selected)
    setRows((prev) =>
      prev.map((r) => (visibleIds.has(r.id) ? { ...r, selected: !allSelected } : r))
    )
  }

  function getFilteredRows() {
    if (!searchQuery.trim()) return rows
    const q = searchQuery.toLowerCase()
    return rows.filter(
      (r) =>
        r.description.toLowerCase().includes(q) ||
        r.tags.toLowerCase().includes(q) ||
        r.amount.includes(q)
    )
  }

  // ─── Rules CRUD ─────────────────────────────────────────────────────────────

  async function handleAddRule(draft: Omit<ImportRule, 'id' | 'familyId' | 'createdAt'>) {
    const { data, error: err } = await supabase
      .from('import_rules')
      .insert({ family_id: familyId, ...ruleToDb(draft) })
      .select()
      .single()
    if (!err && data) {
      setRules((prev) =>
        [...prev, mapDbRule(data as DbImportRule)].sort((a, b) => a.priority - b.priority)
      )
    }
  }

  async function handleUpdateRule(
    id: string,
    patch: Partial<Omit<ImportRule, 'id' | 'familyId' | 'createdAt'>>
  ) {
    setRules((prev) =>
      prev
        .map((r) => (r.id === id ? { ...r, ...patch } : r))
        .sort((a, b) => a.priority - b.priority)
    )
    await supabase.from('import_rules').update(ruleToDb(patch)).eq('id', id)
  }

  async function handleDeleteRule(id: string) {
    setRules((prev) => prev.filter((r) => r.id !== id))
    await supabase.from('import_rules').delete().eq('id', id)
  }

  // ─── Apply rules to selected rows ──────────────────────────────────────────

  function handleApplyRulesToSelected() {
    const sorted = [...rules].sort((a, b) => a.priority - b.priority)
    const newMatches: Record<string, string> = {}
    rows
      .filter((r) => r.selected)
      .forEach((row) => {
        const result = applyRulesToRow(row, sorted)
        if (!result) return
        newMatches[row.id] = result.ruleId
        handleRowChange(row.id, result.patch)
      })
    setAppliedRuleIds((prev) => ({ ...prev, ...newMatches }))
  }

  // ─── Delete row ─────────────────────────────────────────────────────────────

  async function handleDeleteRow(id: string) {
    setRows((prev) => prev.filter((r) => r.id !== id))
    await supabase.from('import_rows').delete().eq('id', id)
  }

  // ─── Delete active import ───────────────────────────────────────────────────

  async function handleDeleteImport() {
    if (!session) return
    if (!confirm('Delete this entire import? All rows will be removed permanently.')) return
    setBusy(true)
    await supabase.from('import_sessions').delete().eq('id', session.id)
    setSessions((prev) => prev.filter((s) => s.id !== session.id))
    setActiveSessionId(null)
    setRows([])
    setHeaders([])
    setNoHeaderWarning(false)
    setDetectedDateFormat(null)
    setBusy(false)
  }

  // ─── Delete session from list ───────────────────────────────────────────────

  async function handleDeleteSession(sessionId: string) {
    if (!confirm('Delete this import? All rows will be removed permanently.')) return
    await supabase.from('import_sessions').delete().eq('id', sessionId)
    setSessions((prev) => prev.filter((s) => s.id !== sessionId))
  }

  // ─── Save rows ──────────────────────────────────────────────────────────────

  async function saveRows(rowsToSave: ImportRow[]) {
    if (rowsToSave.length === 0) return
    setError(null)

    const invalid = rowsToSave.filter((r) => validateRowForSave(r) !== null)
    if (invalid.length > 0) {
      const reason = validateRowForSave(invalid[0])
      setError(
        `${invalid.length} row${invalid.length !== 1 ? 's are' : ' is'} not ready to save: ${reason}`
      )
      return
    }

    setBusy(true)
    try {
      for (const row of rowsToSave) {
        const ym = row.monthOverride ?? (row.parsedDate ? yearMonthFromDate(row.parsedDate) : null)
        if (!ym) continue
        const [year, month] = ym.split('-')
        const tx: Transaction = {
          id: crypto.randomUUID(),
          categoryId: row.categoryId,
          amount: row.amount,
          description: row.description,
          ...(row.tags ? { tags: row.tags } : {}),
        }
        insertTransaction(year, month, tx)
      }

      const savedIds = rowsToSave.map((r) => r.id)
      await supabase.from('import_rows').delete().in('id', savedIds)

      const remaining = rows.filter((r) => !savedIds.includes(r.id))
      setRows(remaining)

      if (remaining.length === 0 && session) {
        await supabase.from('import_sessions').delete().eq('id', session.id)
        setSessions((prev) => prev.filter((s) => s.id !== session.id))
        setActiveSessionId(null)
        setHeaders([])
        setNoHeaderWarning(false)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setBusy(false)
    }
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <svg className="animate-spin h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24">
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      </div>
    )
  }

  // ── Active session view ──────────────────────────────────────────────────────

  if (session) {
    const tabs = session.source === 'api' ? TABS_API : TABS_CSV

    const sessionActions = (
      <div className="flex items-center gap-2">
        <button
          onClick={handleDeleteImport}
          disabled={busy}
          className="px-3 py-1.5 rounded-md border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-40 transition-colors"
        >
          Delete Import
        </button>
        {rules.length > 0 && (
          <button
            onClick={() => {
              const { rows: enriched, matchedRules } = applyRulesToRows(rows, rules, {
                skipIfCategorized: false,
              })
              setAppliedRuleIds((prev) => ({ ...prev, ...matchedRules }))
              enriched.forEach((row, i) => {
                if (row !== rows[i])
                  handleRowChange(row.id, {
                    categoryId: row.categoryId,
                    tags: row.tags,
                    description: row.description,
                  })
              })
            }}
            disabled={busy}
            className="px-3 py-1.5 rounded-md border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 text-sm hover:bg-indigo-50 dark:hover:bg-indigo-950/30 disabled:opacity-40 transition-colors"
          >
            Apply rules
          </button>
        )}
        <button
          onClick={() => saveRows(rows.filter((r) => r.selected))}
          disabled={busy || selectedCount === 0}
          className="px-3 py-1.5 rounded-md border border-gray-300 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 transition-colors"
        >
          Save Selected ({selectedCount})
        </button>
        <button
          onClick={() => saveRows(rows)}
          disabled={busy || rows.length === 0}
          className="px-3 py-1.5 rounded-md bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-40 transition-colors"
        >
          Save All ({rows.length})
        </button>
      </div>
    )

    return (
      <div className="space-y-6">
        <PageHeader
          title="Import Data"
          subtitle={`${session.filename ?? 'Import'} — ${rows.length} row${rows.length !== 1 ? 's' : ''} remaining`}
          actions={sessionActions}
        />

        {error && (
          <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm text-red-700 dark:text-red-300">
            {error}
            <button
              onClick={() => setError(null)}
              className="ml-3 text-red-500 hover:text-red-700 dark:hover:text-red-300"
            >
              ×
            </button>
          </div>
        )}

        <div className="space-y-4">
          <button
            onClick={handleBackToList}
            className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            All imports
          </button>

          {noHeaderWarning && (
            <div className="rounded-lg border border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
              No header row detected — columns have been auto-named (Column 1, Column 2, …). Use the{' '}
              <button onClick={() => setActiveTab('advanced')} className="underline font-medium">
                Advanced tab
              </button>{' '}
              to map them to the correct fields.
            </div>
          )}

          <TabBar tabs={tabs} active={activeTab} onChange={setActiveTab} />

          {activeTab === 'raw' &&
            (session?.source === 'api' ? (
              <ApiRawDataTab rows={rows} onDeleteRow={handleDeleteRow} />
            ) : (
              <RawDataTab rows={rows} headers={headers} onDeleteRow={handleDeleteRow} />
            ))}

          {activeTab === 'enriched' && (
            <EnrichedDataTab
              rows={rows}
              categories={categories}
              suggestions={suggestions}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onRowChange={handleRowChange}
              onToggleSelected={handleToggleSelected}
              onToggleSelectAll={handleToggleSelectAll}
              selectedCount={selectedCount}
              rules={rules}
              appliedRuleIds={appliedRuleIds}
              onApplyRulesToSelected={handleApplyRulesToSelected}
            />
          )}

          {activeTab === 'rules' && (
            <RulesTab
              rules={rules}
              categories={categories}
              suggestions={suggestions}
              loading={rulesLoading}
              onAdd={handleAddRule}
              onUpdate={handleUpdateRule}
              onDelete={handleDeleteRule}
            />
          )}

          {activeTab === 'advanced' && (
            <>
              <SectionHeading>Import Settings</SectionHeading>
              {session.source === 'api' ? (
                <div className="space-y-2 max-w-lg">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={session.negateAmount}
                      onChange={(e) => handleApiNegateChange(e.target.checked)}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Negate amounts (bank shows expenses as positive numbers)
                    </span>
                  </label>
                </div>
              ) : (
                <AdvancedTab
                  headers={headers}
                  columnMap={session.columnMap}
                  dateFormat={session.dateFormat}
                  negateAmount={session.negateAmount}
                  detectedDateFormat={detectedDateFormat}
                  onColumnMapChange={(patch) =>
                    handleAdvancedChange(
                      { ...session.columnMap, ...patch },
                      session.dateFormat,
                      session.negateAmount
                    )
                  }
                  onDateFormatChange={(fmt) =>
                    handleAdvancedChange(session.columnMap, fmt, session.negateAmount)
                  }
                  onNegateAmountChange={(negate) =>
                    handleAdvancedChange(session.columnMap, session.dateFormat, negate)
                  }
                />
              )}
            </>
          )}
        </div>
      </div>
    )
  }

  // ── New import flow (source picker / uploader / API) ─────────────────────────

  if (importSource !== 'none') {
    return (
      <div className="space-y-6">
        <PageHeader title="Import Data" subtitle="Import transactions from a file or bank API" />

        {error && (
          <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm text-red-700 dark:text-red-300">
            {error}
            <button
              onClick={() => setError(null)}
              className="ml-3 text-red-500 hover:text-red-700 dark:hover:text-red-300"
            >
              ×
            </button>
          </div>
        )}

        {importSource === 'picker' ? (
          <div className="space-y-4">
            <button
              onClick={() => setImportSource('none')}
              className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Back
            </button>
            <ImportSourcePicker
              busy={busy}
              onPickCsv={() => setImportSource('csv')}
              onPickApi={() => setImportSource('api')}
            />
          </div>
        ) : importSource === 'csv' ? (
          <div className="max-w-lg space-y-4">
            <button
              onClick={() => setImportSource('picker')}
              className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Back
            </button>
            <ImportUploader onFileParsed={handleFileParsed} busy={busy} />
          </div>
        ) : (
          <div className="max-w-md space-y-4">
            <button
              onClick={() => setImportSource('picker')}
              className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Back
            </button>
            <BankImporter busy={busy} onImported={handleBankImported} />
          </div>
        )}
      </div>
    )
  }

  // ── Session list / source picker ─────────────────────────────────────────────

  if (sessions.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="Import Data" subtitle="Choose how to import your transactions" />
        <ImportSourcePicker
          busy={busy}
          onPickCsv={() => setImportSource('csv')}
          onPickApi={() => setImportSource('api')}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Import Data"
        subtitle={`${sessions.length} import${sessions.length !== 1 ? 's' : ''} in progress`}
        actions={
          <button
            onClick={() => setImportSource('picker')}
            disabled={busy}
            className="px-3 py-1.5 rounded-md bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-40 transition-colors"
          >
            New Import
          </button>
        }
      />

      {error && (
        <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-3 text-red-500 hover:text-red-700 dark:hover:text-red-300"
          >
            ×
          </button>
        </div>
      )}

      <div className="space-y-3 max-w-2xl">
        {sessions.map((s) => (
          <div
            key={s.id}
            className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                {s.filename ?? (s.source === 'api' ? 'API Import' : 'Import')}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {s.rowCount} row{s.rowCount !== 1 ? 's' : ''} · {formatSessionDate(s.createdAt)}
                {s.source === 'api' && (
                  <span className="ml-2 inline-flex items-center rounded-full bg-indigo-50 dark:bg-indigo-950/40 px-1.5 py-0.5 text-xs text-indigo-600 dark:text-indigo-400">
                    API
                  </span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2 ml-4 shrink-0">
              <button
                onClick={() => handleDeleteSession(s.id)}
                disabled={busy}
                className="text-xs text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 disabled:opacity-40 transition-colors"
              >
                Delete
              </button>
              <button
                onClick={() => handleSelectSession(s.id)}
                disabled={busy}
                className="px-3 py-1.5 rounded-md border border-gray-300 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 transition-colors"
              >
                Open
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
