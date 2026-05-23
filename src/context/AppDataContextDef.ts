import { createContext } from 'react'
import type {
  AppData,
  BudgetCategory,
  BudgetMonth,
  DebtRow,
  EmergencyFundData,
  ExpenseType,
  HomeAffordabilityData,
  NetworthEntry,
  SinkingFundRow,
  StorageMode,
  Transaction,
} from '../lib/types'

export type AppDataContextValue = {
  data: AppData
  loaded: boolean

  addCategory: (section: BudgetCategory['section'], defaultExpenseType?: ExpenseType) => void
  updateCategory: (id: string, patch: Partial<Omit<BudgetCategory, 'id'>>) => void
  removeCategory: (id: string) => void
  reorderCategories: (orderedIds: string[]) => void

  getBudgetMonth: (year: string, month: string) => BudgetMonth
  updateBudgeted: (year: string, month: string, categoryId: string, amount: string) => void
  addTransaction: (year: string, month: string) => void
  updateTransaction: (year: string, month: string, id: string, patch: Partial<Transaction>) => void
  removeTransaction: (year: string, month: string, id: string) => void
  condenseTransactions: (year: string, month: string) => void

  setEmergencyFund: (patch: Partial<EmergencyFundData>) => void

  addSinkingFund: () => void
  updateSinkingFund: (id: string, patch: Partial<Omit<SinkingFundRow, 'id'>>) => void
  removeSinkingFund: (id: string) => void

  addDebtRow: () => void
  updateDebtRow: (id: string, patch: Partial<Omit<DebtRow, 'id'>>) => void
  removeDebtRow: (id: string) => void
  setDebtExtraPayment: (value: string) => void

  addNetworthEntry: (type: 'asset' | 'liability') => void
  updateNetworthEntry: (
    type: 'asset' | 'liability',
    id: string,
    patch: Partial<Omit<NetworthEntry, 'id'>>
  ) => void
  removeNetworthEntry: (type: 'asset' | 'liability', id: string) => void
  setNetworthValue: (yearMonth: string, entryId: string, amount: string) => void

  setHomeAffordability: (patch: Partial<HomeAffordabilityData>) => void

  setStorageMode: (mode: StorageMode) => void
  migrateToAccount: (strategy: 'upload' | 'download') => Promise<void>
  syncFromCloud: () => Promise<void>
  hasCloudData: () => Promise<boolean>
  storageUsage: { usedBytes: number; totalBytes: number | null }
  storageError: string | null
}

export const AppDataContext = createContext<AppDataContextValue | null>(null)
