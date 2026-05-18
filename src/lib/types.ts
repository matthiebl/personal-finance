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
}

export type BudgetMonth = {
  budgeted: Record<string, string>
  transactions: Transaction[]
}

export type BudgetYear = {
  months: Partial<Record<string, BudgetMonth>>
}

export type EmergencyFundData = {
  expenses: Record<string, string>  // categoryId -> adjustment amount
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

export type AppData = {
  version: 1
  storageMode: StorageMode
  budget: {
    categories: BudgetCategory[]
    years: Record<string, BudgetYear>
  }
  emergencyFund: EmergencyFundData
  sinkingFunds: SinkingFundRow[]
}
