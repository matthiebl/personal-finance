import { supabase } from './supabase'
import type { AppData, BudgetCategory, EmergencyFundData, HomeAffordabilityData } from './types'

export class StorageFullError extends Error {
  constructor() {
    super('Browser storage is full. Condense transactions to free up space.')
    this.name = 'StorageFullError'
  }
}

export interface StorageAdapter {
  load(): Promise<AppData>
  save(data: AppData): Promise<void>
  estimateUsage(): Promise<{ usedBytes: number; totalBytes: number | null }>
}

const STORAGE_KEY = 'finances:data'

// Seed category IDs — stable UUIDs so cross-references survive reloads
const SEED_IDS = {
  salary: crypto.randomUUID(),
  rent: crypto.randomUUID(),
  phone: crypto.randomUUID(),
  internet: crypto.randomUUID(),
  groceries: crypto.randomUUID(),
  transport: crypto.randomUUID(),
  utilities: crypto.randomUUID(),
  emergencyFund: crypto.randomUUID(),
  investments: crypto.randomUUID(),
} as const

const SEED_CATEGORIES: BudgetCategory[] = [
  { id: SEED_IDS.salary, label: 'Salary / Wages', section: 'income', order: 0 },
  { id: SEED_IDS.rent, label: 'Rent / Mortgage', section: 'fixed', expenseType: 'need', order: 1 },
  { id: SEED_IDS.phone, label: 'Phone', section: 'fixed', expenseType: 'need', order: 2 },
  { id: SEED_IDS.internet, label: 'Internet', section: 'fixed', expenseType: 'need', order: 3 },
  {
    id: SEED_IDS.groceries,
    label: 'Groceries',
    section: 'variable',
    expenseType: 'need',
    order: 4,
  },
  {
    id: SEED_IDS.transport,
    label: 'Transport',
    section: 'variable',
    expenseType: 'need',
    order: 5,
  },
  {
    id: SEED_IDS.utilities,
    label: 'Utilities',
    section: 'variable',
    expenseType: 'need',
    order: 6,
  },
  { id: SEED_IDS.emergencyFund, label: 'Emergency Fund', section: 'savings', order: 7 },
  { id: SEED_IDS.investments, label: 'Investments', section: 'savings', order: 8 },
]

const SEED_EMERGENCY_FUND: EmergencyFundData = {
  expenses: {},
  coverageMonths: '6',
  currentBalance: '',
  monthlyContribution: '',
  annualInterest: '',
  startDate: (() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })(),
}

const DEFAULT_HOME_AFFORDABILITY: HomeAffordabilityData = {
  annualIncome: '',
  monthlyCommitments: '',
  deposit: '',
  interestRate: '',
  loanTerm: '30',
  repaymentType: 'pi',
  ausState: 'NSW',
  firstHomeBuyer: false,
}

export const DEFAULT_APP_DATA: AppData = {
  version: 1,
  storageMode: 'local',
  budget: {
    categories: SEED_CATEGORIES,
    years: {},
  },
  emergencyFund: SEED_EMERGENCY_FUND,
  sinkingFunds: [],
  debtRows: [],
  debtExtraPayment: '',
  networth: {
    assets: [],
    liabilities: [],
    months: {},
  },
  homeAffordability: DEFAULT_HOME_AFFORDABILITY,
}

export class LocalStorageAdapter implements StorageAdapter {
  async load(): Promise<AppData> {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return structuredClone(DEFAULT_APP_DATA)
      const parsed = JSON.parse(raw) as Partial<AppData>
      return {
        ...structuredClone(DEFAULT_APP_DATA),
        ...parsed,
        networth: {
          ...DEFAULT_APP_DATA.networth,
          ...(parsed.networth ?? {}),
        },
        homeAffordability: {
          ...DEFAULT_APP_DATA.homeAffordability,
          ...(parsed.homeAffordability ?? {}),
        },
      }
    } catch {
      return structuredClone(DEFAULT_APP_DATA)
    }
  }

  async save(data: AppData): Promise<void> {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch (e) {
      if (e instanceof DOMException && e.name === 'QuotaExceededError') {
        throw new StorageFullError()
      }
      throw e
    }
  }

  async estimateUsage(): Promise<{ usedBytes: number; totalBytes: number | null }> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const { usage, quota } = await navigator.storage.estimate()
      return { usedBytes: usage ?? 0, totalBytes: quota ?? null }
    }
    const raw = localStorage.getItem(STORAGE_KEY) ?? ''
    const usedBytes = new Blob([raw]).size
    return { usedBytes, totalBytes: null }
  }
}

export class AccountStorageAdapter implements StorageAdapter {
  familyId: string
  constructor(familyId: string) {
    this.familyId = familyId
  }

  async load(): Promise<AppData> {
    const { data, error } = await supabase
      .from('family_data')
      .select('data')
      .eq('family_id', this.familyId)
      .single()

    if (error || !data) return structuredClone(DEFAULT_APP_DATA)

    const parsed = data.data as Partial<AppData>
    return {
      ...structuredClone(DEFAULT_APP_DATA),
      ...parsed,
      networth: {
        ...DEFAULT_APP_DATA.networth,
        ...(parsed.networth ?? {}),
      },
      homeAffordability: {
        ...DEFAULT_APP_DATA.homeAffordability,
        ...(parsed.homeAffordability ?? {}),
      },
    }
  }

  async save(appData: AppData): Promise<void> {
    const { error } = await supabase
      .from('family_data')
      .upsert(
        { family_id: this.familyId, data: appData, updated_at: new Date().toISOString() },
        { onConflict: 'family_id' }
      )
    if (error) throw new Error(error.message)
  }

  async estimateUsage(): Promise<{ usedBytes: number; totalBytes: number | null }> {
    return { usedBytes: 0, totalBytes: null }
  }

  async exists(): Promise<boolean> {
    const { data } = await supabase
      .from('family_data')
      .select('family_id')
      .eq('family_id', this.familyId)
      .maybeSingle()
    return data !== null
  }
}

export const localStorageAdapter = new LocalStorageAdapter()
