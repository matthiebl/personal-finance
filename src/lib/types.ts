export type ExpenseType = 'need' | 'want' | 'debt'
export type StorageMode = 'local' | 'account'

export type BudgetCategory = {
  id: string
  label: string
  section: 'income' | 'fixed' | 'variable' | 'savings'
  expenseType?: ExpenseType
  order: number
}

export type Transaction = {
  id: string
  categoryId: string
  amount: string
  description: string
  tags?: string
}

export type BudgetMonth = {
  budgeted: Record<string, string>
  transactions: Transaction[]
}

export type BudgetYear = {
  months: Partial<Record<string, BudgetMonth>>
}

export type EmergencyFundData = {
  expenses: Record<string, string> // categoryId -> adjustment amount
  coverageMonths: string
  currentBalance: string
  monthlyContribution: string
  annualInterest: string
  startDate: string
}

export type SinkingFundRow = {
  id: string
  name: string
  goal: string
  saved: string
  monthly: string
  interestRate: string
}

export type DebtRow = {
  id: string
  name: string
  balance: string
  minPayment: string
  interestRate: string
  keepPayment?: boolean
}

export type NetworthEntry = {
  id: string
  name: string
}

export type NetworthData = {
  assets: NetworthEntry[]
  liabilities: NetworthEntry[]
  months: Record<string, Record<string, string>> // "YYYY-MM" -> { entryId -> amount }
}

export type HomeAffordabilityData = {
  annualIncome: string
  monthlyCommitments: string
  deposit: string
  interestRate: string
  loanTerm: string
  repaymentType: string
  ausState: string
  firstHomeBuyer: boolean
}

export type ImportColumnMap = {
  date: string
  amount: string
  description: string
  tags: string
}

export type ImportRow = {
  id: string
  rowIndex: number
  rawData: Record<string, string>
  description: string
  amount: string
  categoryId: string
  tags: string
  monthOverride: string | null
  parsedDate: string | null
  selected: boolean
}

export type ImportSession = {
  id: string
  familyId: string
  createdAt: string
  source: 'csv' | 'api'
  filename: string | null
  rowCount: number
  columnMap: ImportColumnMap
  dateFormat: string
  negateAmount: boolean
}

export type AppData = {
  version: 1
  storageMode: StorageMode
  budget: {
    categories: BudgetCategory[]
    years: Record<string, BudgetYear>
  }
  emergencyFund: EmergencyFundData
  sinkingFunds: SinkingFundRow[]
  debtRows: DebtRow[]
  debtExtraPayment: string
  networth: NetworthData
  homeAffordability: HomeAffordabilityData
}
