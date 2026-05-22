import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { AccountStorageAdapter, DEFAULT_APP_DATA, StorageFullError, localStorageAdapter } from '../lib/storage'
import type { StorageAdapter } from '../lib/storage'
import type {
  AppData,
  BudgetCategory,
  BudgetMonth,
  EmergencyFundData,
  ExpenseType,
  NetworthEntry,
  SinkingFundRow,
  StorageMode,
  Transaction,
} from '../lib/types'
import { useAuth } from './AuthContext'

type AppDataContextValue = {
  data: AppData
  loaded: boolean

  // Categories (shared templates)
  addCategory: (section: BudgetCategory['section'], defaultExpenseType?: ExpenseType) => void
  updateCategory: (id: string, patch: Partial<Omit<BudgetCategory, 'id'>>) => void
  removeCategory: (id: string) => void
  reorderCategories: (orderedIds: string[]) => void

  // Monthly budget (scoped to year + zero-padded month)
  getBudgetMonth: (year: string, month: string) => BudgetMonth
  updateBudgeted: (year: string, month: string, categoryId: string, amount: string) => void
  addTransaction: (year: string, month: string) => void
  updateTransaction: (year: string, month: string, id: string, patch: Partial<Transaction>) => void
  removeTransaction: (year: string, month: string, id: string) => void
  condenseTransactions: (year: string, month: string) => void

  // Emergency fund
  setEmergencyFund: (patch: Partial<EmergencyFundData>) => void

  // Sinking funds
  addSinkingFund: () => void
  updateSinkingFund: (id: string, patch: Partial<Omit<SinkingFundRow, 'id'>>) => void
  removeSinkingFund: (id: string) => void

  // Net worth
  addNetworthEntry: (type: 'asset' | 'liability') => void
  updateNetworthEntry: (
    type: 'asset' | 'liability',
    id: string,
    patch: Partial<Omit<NetworthEntry, 'id'>>,
  ) => void
  removeNetworthEntry: (type: 'asset' | 'liability', id: string) => void
  setNetworthValue: (yearMonth: string, entryId: string, amount: string) => void

  // Settings
  setStorageMode: (mode: StorageMode) => void
  migrateToAccount: (strategy: 'upload' | 'download') => Promise<void>
  hasCloudData: () => Promise<boolean>
  storageUsage: { usedBytes: number; totalBytes: number | null }
  storageError: string | null
}

const AppDataContext = createContext<AppDataContextValue | null>(null)

function emptyBudgetMonth(): BudgetMonth {
  return { budgeted: {}, transactions: [] }
}

function getOrCreateMonth(data: AppData, year: string, month: string): BudgetMonth {
  return data.budget.years[year]?.months[month] ?? emptyBudgetMonth()
}

function setMonth(data: AppData, year: string, month: string, bm: BudgetMonth): AppData {
  return {
    ...data,
    budget: {
      ...data.budget,
      years: {
        ...data.budget.years,
        [year]: {
          months: {
            ...(data.budget.years[year]?.months ?? {}),
            [month]: bm,
          },
        },
      },
    },
  }
}

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const { family, authLoaded } = useAuth()

  const [data, setData] = useState<AppData>(() => structuredClone(DEFAULT_APP_DATA))
  const [loaded, setLoaded] = useState(false)
  const [storageUsage, setStorageUsage] = useState<{
    usedBytes: number
    totalBytes: number | null
  }>({ usedBytes: 0, totalBytes: null })
  const [storageError, setStorageError] = useState<string | null>(null)

  const adapterRef = useRef<StorageAdapter>(localStorageAdapter)
  // Tracks which adapter is currently active: 'local' | 'account:<familyId>'
  const adapterKeyRef = useRef<string>('local')

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const loadedRef = useRef(false)

  // Load initial data from localStorage on mount
  useEffect(() => {
    localStorageAdapter.load().then((persisted) => {
      setData(persisted)
      setLoaded(true)
      loadedRef.current = true
    })
    localStorageAdapter.estimateUsage().then(setStorageUsage)
  }, [])

  // Switch adapter when family or storageMode changes (after both loads are complete)
  useEffect(() => {
    if (!authLoaded || !loaded) return

    const desiredKey =
      data.storageMode === 'account' && family ? `account:${family.id}` : 'local'

    if (desiredKey === adapterKeyRef.current) return
    adapterKeyRef.current = desiredKey

    if (desiredKey.startsWith('account:') && family) {
      const accountAdapter = new AccountStorageAdapter(family.id)
      adapterRef.current = accountAdapter
      // Reload from cloud when switching into account mode
      accountAdapter.load().then((cloudData) => {
        setData({ ...cloudData, storageMode: 'account' })
        accountAdapter.estimateUsage().then(setStorageUsage)
      })
    } else {
      adapterRef.current = localStorageAdapter
      localStorageAdapter.estimateUsage().then(setStorageUsage)
    }
  }, [authLoaded, loaded, family, data.storageMode]) // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced save whenever data changes (after initial load)
  useEffect(() => {
    if (!loadedRef.current) return
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      adapterRef.current
        .save(data)
        .then(() => {
          setStorageError(null)
          adapterRef.current.estimateUsage().then(setStorageUsage)
        })
        .catch((e) => {
          if (e instanceof StorageFullError) setStorageError(e.message)
        })
    }, 300)

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
        adapterRef.current.save(data).catch(() => {})
      }
    }
  }, [data])

  // ─── Category mutations ───────────────────────────────────────────────────

  function addCategory(section: BudgetCategory['section'], defaultExpenseType?: ExpenseType) {
    setData((prev) => {
      const maxOrder = prev.budget.categories.reduce((m, c) => Math.max(m, c.order), -1)
      const cat: BudgetCategory = {
        id: crypto.randomUUID(),
        label: '',
        section,
        expenseType: defaultExpenseType,
        order: maxOrder + 1,
      }
      return { ...prev, budget: { ...prev.budget, categories: [...prev.budget.categories, cat] } }
    })
  }

  function updateCategory(id: string, patch: Partial<Omit<BudgetCategory, 'id'>>) {
    setData((prev) => ({
      ...prev,
      budget: {
        ...prev.budget,
        categories: prev.budget.categories.map((c) => (c.id === id ? { ...c, ...patch } : c)),
      },
    }))
  }

  function removeCategory(id: string) {
    setData((prev) => ({
      ...prev,
      budget: {
        ...prev.budget,
        categories: prev.budget.categories.filter((c) => c.id !== id),
      },
    }))
  }

  function reorderCategories(orderedIds: string[]) {
    setData((prev) => {
      const sectionSet = new Set(orderedIds)
      const sorted = [...prev.budget.categories].sort((a, b) => a.order - b.order)
      const sectionItems = orderedIds.map((id) => sorted.find((c) => c.id === id)!)
      let sectionIdx = 0
      const newSorted = sorted.map((c) => (sectionSet.has(c.id) ? sectionItems[sectionIdx++] : c))
      return {
        ...prev,
        budget: {
          ...prev.budget,
          categories: newSorted.map((c, i) => ({ ...c, order: i })),
        },
      }
    })
  }

  // ─── Monthly budget mutations ─────────────────────────────────────────────

  function getBudgetMonth(year: string, month: string): BudgetMonth {
    return getOrCreateMonth(data, year, month)
  }

  function updateBudgeted(year: string, month: string, categoryId: string, amount: string) {
    setData((prev) => {
      const bm = getOrCreateMonth(prev, year, month)
      return setMonth(prev, year, month, {
        ...bm,
        budgeted: { ...bm.budgeted, [categoryId]: amount },
      })
    })
  }

  function addTransaction(year: string, month: string) {
    setData((prev) => {
      const bm = getOrCreateMonth(prev, year, month)
      const tx: Transaction = {
        id: crypto.randomUUID(),
        categoryId: '',
        amount: '',
        description: '',
      }
      return setMonth(prev, year, month, { ...bm, transactions: [...bm.transactions, tx] })
    })
  }

  function updateTransaction(year: string, month: string, id: string, patch: Partial<Transaction>) {
    setData((prev) => {
      const bm = getOrCreateMonth(prev, year, month)
      return setMonth(prev, year, month, {
        ...bm,
        transactions: bm.transactions.map((t) => (t.id === id ? { ...t, ...patch } : t)),
      })
    })
  }

  function removeTransaction(year: string, month: string, id: string) {
    setData((prev) => {
      const bm = getOrCreateMonth(prev, year, month)
      return setMonth(prev, year, month, {
        ...bm,
        transactions: bm.transactions.filter((t) => t.id !== id),
      })
    })
  }

  function condenseTransactions(year: string, month: string) {
    setData((prev) => {
      const bm = getOrCreateMonth(prev, year, month)
      const groups = new Map<string, Transaction[]>()
      for (const t of bm.transactions) {
        const sortedTags = (t.tags ?? '').split(/\s+/).filter(Boolean).sort().join(' ')
        const key = `${t.categoryId}\0${t.description}\0${sortedTags}`
        if (!groups.has(key)) groups.set(key, [])
        groups.get(key)!.push(t)
      }
      const condensed: Transaction[] = []
      for (const txs of groups.values()) {
        const sum = txs.reduce((s, t) => s + (parseFloat(t.amount) || 0), 0)
        if (sum === 0) continue
        const mergedTags = [
          ...new Set(txs.flatMap((t) => (t.tags ?? '').split(/\s+/).filter(Boolean))),
        ].join(' ')
        condensed.push({
          id: crypto.randomUUID(),
          categoryId: txs[0].categoryId,
          amount: sum.toFixed(2),
          description: txs[0].description,
          ...(mergedTags ? { tags: mergedTags } : {}),
        })
      }
      const next = setMonth(prev, year, month, { ...bm, transactions: condensed })
      // Save immediately (bypass debounce) since this is an explicit user action
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      adapterRef.current.save(next).catch(() => {})
      return next
    })
  }

  // ─── Emergency fund ───────────────────────────────────────────────────────

  function setEmergencyFund(patch: Partial<EmergencyFundData>) {
    setData((prev) => ({ ...prev, emergencyFund: { ...prev.emergencyFund, ...patch } }))
  }

  // ─── Sinking funds ────────────────────────────────────────────────────────

  function addSinkingFund() {
    const row: SinkingFundRow = {
      id: crypto.randomUUID(),
      name: '',
      goal: '',
      saved: '',
      monthly: '',
      interestRate: '',
    }
    setData((prev) => ({ ...prev, sinkingFunds: [...prev.sinkingFunds, row] }))
  }

  function updateSinkingFund(id: string, patch: Partial<Omit<SinkingFundRow, 'id'>>) {
    setData((prev) => ({
      ...prev,
      sinkingFunds: prev.sinkingFunds.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    }))
  }

  function removeSinkingFund(id: string) {
    setData((prev) => ({ ...prev, sinkingFunds: prev.sinkingFunds.filter((r) => r.id !== id) }))
  }

  // ─── Net worth ────────────────────────────────────────────────────────────

  function addNetworthEntry(type: 'asset' | 'liability') {
    const entry: NetworthEntry = { id: crypto.randomUUID(), name: '' }
    const key = type === 'asset' ? 'assets' : 'liabilities'
    setData((prev) => ({
      ...prev,
      networth: { ...prev.networth, [key]: [...prev.networth[key], entry] },
    }))
  }

  function updateNetworthEntry(
    type: 'asset' | 'liability',
    id: string,
    patch: Partial<Omit<NetworthEntry, 'id'>>,
  ) {
    const key = type === 'asset' ? 'assets' : 'liabilities'
    setData((prev) => ({
      ...prev,
      networth: {
        ...prev.networth,
        [key]: prev.networth[key].map((e) => (e.id === id ? { ...e, ...patch } : e)),
      },
    }))
  }

  function removeNetworthEntry(type: 'asset' | 'liability', id: string) {
    const key = type === 'asset' ? 'assets' : 'liabilities'
    setData((prev) => {
      const cleanedMonths: Record<string, Record<string, string>> = {}
      for (const [ym, entries] of Object.entries(prev.networth.months)) {
        const { [id]: _removed, ...rest } = entries
        if (Object.keys(rest).length > 0) cleanedMonths[ym] = rest
      }
      return {
        ...prev,
        networth: {
          ...prev.networth,
          [key]: prev.networth[key].filter((e) => e.id !== id),
          months: cleanedMonths,
        },
      }
    })
  }

  function setNetworthValue(yearMonth: string, entryId: string, amount: string) {
    setData((prev) => ({
      ...prev,
      networth: {
        ...prev.networth,
        months: {
          ...prev.networth.months,
          [yearMonth]: {
            ...(prev.networth.months[yearMonth] ?? {}),
            [entryId]: amount,
          },
        },
      },
    }))
  }

  // ─── Settings ────────────────────────────────────────────────────────────

  function setStorageMode(mode: StorageMode) {
    setData((prev) => ({ ...prev, storageMode: mode }))
  }

  async function migrateToAccount(strategy: 'upload' | 'download') {
    if (!family) throw new Error('No family to migrate to')
    const accountAdapter = new AccountStorageAdapter(family.id)
    const newKey = `account:${family.id}`

    if (strategy === 'upload') {
      const dataToUpload: AppData = { ...data, storageMode: 'account' }
      await accountAdapter.save(dataToUpload)
      // Stamp mode in localStorage so the adapter switches correctly after a refresh
      localStorageAdapter.save(dataToUpload).catch(() => {})
      adapterRef.current = accountAdapter
      adapterKeyRef.current = newKey
      setData(dataToUpload)
      accountAdapter.estimateUsage().then(setStorageUsage)
    } else {
      const cloudData = await accountAdapter.load()
      const merged: AppData = { ...cloudData, storageMode: 'account' }
      localStorageAdapter.save(merged).catch(() => {})
      adapterRef.current = accountAdapter
      adapterKeyRef.current = newKey
      setData(merged)
      accountAdapter.estimateUsage().then(setStorageUsage)
    }
  }

  async function hasCloudData(): Promise<boolean> {
    if (!family) return false
    const accountAdapter = new AccountStorageAdapter(family.id)
    return accountAdapter.exists()
  }

  const value: AppDataContextValue = {
    data,
    loaded,
    addCategory,
    updateCategory,
    removeCategory,
    reorderCategories,
    getBudgetMonth,
    updateBudgeted,
    addTransaction,
    updateTransaction,
    removeTransaction,
    condenseTransactions,
    setEmergencyFund,
    addSinkingFund,
    updateSinkingFund,
    removeSinkingFund,
    addNetworthEntry,
    updateNetworthEntry,
    removeNetworthEntry,
    setNetworthValue,
    setStorageMode,
    migrateToAccount,
    hasCloudData,
    storageUsage,
    storageError,
  }

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAppData(): AppDataContextValue {
  const ctx = useContext(AppDataContext)
  if (!ctx) throw new Error('useAppData must be used within AppDataProvider')
  return ctx
}
