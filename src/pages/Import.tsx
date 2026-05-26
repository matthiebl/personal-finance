import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AdvancedTab } from '../components/import/AdvancedTab'
import { EnrichedDataTab } from '../components/import/EnrichedDataTab'
import { ImportUploader } from '../components/import/ImportUploader'
import { RawDataTab } from '../components/import/RawDataTab'
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
import type { TxSuggestion } from '../components/inputs'
import type {
  BudgetCategory,
  ImportColumnMap,
  ImportRow,
  ImportSession,
  Transaction,
} from '../lib/types'

type ImportTab = 'enriched' | 'raw' | 'advanced'

const TABS: { id: ImportTab; label: string }[] = [
  { id: 'enriched', label: 'Enriched' },
  { id: 'raw', label: 'Raw Data' },
  { id: 'advanced', label: 'Advanced' },
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

  const [session, setSession] = useState<ImportSession | null>(null)
  const [rows, setRows] = useState<ImportRow[]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [noHeaderWarning, setNoHeaderWarning] = useState(false)
  const [detectedDateFormat, setDetectedDateFormat] = useState<string | null>(null)

  const [activeTab, setActiveTab] = useState<ImportTab>('enriched')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const rowSaveTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  // Load existing session on mount
  useEffect(() => {
    async function load() {
      const { data: sessions } = await supabase
        .from('import_sessions')
        .select('*')
        .eq('family_id', familyId)
        .order('created_at', { ascending: false })
        .limit(1)

      if (sessions && sessions.length > 0) {
        const s = mapDbSession(sessions[0] as Record<string, unknown>)
        const { data: dbRows } = await supabase
          .from('import_rows')
          .select('*')
          .eq('session_id', s.id)
          .order('row_index', { ascending: true })

        const importRows = (dbRows ?? []).map((r) => mapDbRow(r as Record<string, unknown>))
        setSession(s)
        setRows(importRows)
        setHeaders(importRows[0] ? Object.keys(importRows[0].rawData) : [])
      }
      setLoading(false)
    }
    load()
  }, [familyId])

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

      setSession(newSession)
      setRows(importRows)
      setHeaders(csvHeaders)
      setActiveTab(noHeader ? 'advanced' : 'enriched')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setBusy(false)
    }
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
    setSession((prev) =>
      prev
        ? { ...prev, columnMap: newColumnMap, dateFormat: newDateFormat, negateAmount: newNegate }
        : null
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

  // ─── Delete row ─────────────────────────────────────────────────────────────

  async function handleDeleteRow(id: string) {
    setRows((prev) => prev.filter((r) => r.id !== id))
    await supabase.from('import_rows').delete().eq('id', id)
  }

  // ─── Delete import ──────────────────────────────────────────────────────────

  async function handleDeleteImport() {
    if (!session) return
    if (!confirm('Delete this entire import? All rows will be removed permanently.')) return
    setBusy(true)
    await supabase.from('import_sessions').delete().eq('id', session.id)
    setSession(null)
    setRows([])
    setHeaders([])
    setNoHeaderWarning(false)
    setDetectedDateFormat(null)
    setBusy(false)
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
        setSession(null)
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

  const sessionActions = session ? (
    <div className="flex items-center gap-2">
      <button
        onClick={handleDeleteImport}
        disabled={busy}
        className="px-3 py-1.5 rounded-md border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-40 transition-colors"
      >
        Delete Import
      </button>
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
  ) : undefined

  return (
    <div className="space-y-6">
      <PageHeader
        title="Import Data"
        subtitle={
          session
            ? `${session.filename ?? 'Import'} — ${rows.length} row${rows.length !== 1 ? 's' : ''} remaining`
            : 'Import transactions from a CSV file'
        }
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

      {!session ? (
        <div className="max-w-lg">
          <ImportUploader onFileParsed={handleFileParsed} busy={busy} />
        </div>
      ) : (
        <div className="space-y-4">
          {noHeaderWarning && (
            <div className="rounded-lg border border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
              No header row detected — columns have been auto-named (Column 1, Column 2, …). Use the{' '}
              <button onClick={() => setActiveTab('advanced')} className="underline font-medium">
                Advanced tab
              </button>{' '}
              to map them to the correct fields.
            </div>
          )}

          <TabBar tabs={TABS} active={activeTab} onChange={setActiveTab} />

          {activeTab === 'raw' && (
            <RawDataTab rows={rows} headers={headers} onDeleteRow={handleDeleteRow} />
          )}

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
            />
          )}

          {activeTab === 'advanced' && session && (
            <>
              <SectionHeading>Import Settings</SectionHeading>
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
            </>
          )}
        </div>
      )}
    </div>
  )
}
