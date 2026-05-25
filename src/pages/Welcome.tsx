import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader, SectionHeading } from '../components/layout'
import { useAppData } from '../context/useAppData'

type SetupStepCardProps = {
  title: string
  descriptionPending: string
  descriptionDone: string
  done: boolean
  optional?: boolean
  to: string
}

function SetupStepCard({
  title,
  descriptionPending,
  descriptionDone,
  done,
  optional,
  to,
}: SetupStepCardProps) {
  return (
    <Link
      to={to}
      className={`block rounded-xl border p-5 transition-colors bg-white dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-700 ${
        done ? 'border-green-200 dark:border-green-900' : 'border-gray-200 dark:border-gray-800'
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 min-w-0 flex-wrap">
          <p className="font-medium text-sm text-gray-800 dark:text-gray-100">{title}</p>
          {optional && (
            <span className="shrink-0 text-xs px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
              Optional
            </span>
          )}
        </div>
        <div
          className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
            done
              ? 'bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400'
              : 'border-2 border-gray-200 dark:border-gray-700'
          }`}
        >
          {done && (
            <svg
              className="w-3.5 h-3.5"
              viewBox="0 0 14 14"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="2,7 5.5,10.5 12,3.5" />
            </svg>
          )}
        </div>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
        {done ? descriptionDone : descriptionPending}
      </p>
      <p className="mt-3 text-xs font-medium text-indigo-600 dark:text-indigo-400">
        {done ? 'View' : 'Go'} &rarr;
      </p>
    </Link>
  )
}

type QuickAccessCardProps = {
  title: string
  description: string
  to: string
}

function QuickAccessCard({ title, description, to }: QuickAccessCardProps) {
  return (
    <Link
      to={to}
      className="block bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 hover:border-gray-300 dark:hover:border-gray-700 transition-colors"
    >
      <p className="font-medium text-sm mb-1 text-gray-800 dark:text-gray-100">{title}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
    </Link>
  )
}

function SetupProgress({
  coreStepsDone,
  total,
  allCoreDone,
}: {
  coreStepsDone: number
  total: number
  allCoreDone: boolean
}) {
  if (allCoreDone) {
    return (
      <div className="mb-6 px-4 py-3 rounded-xl border border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/30 flex items-center gap-3">
        <svg
          className="w-5 h-5 text-green-600 dark:text-green-400 shrink-0"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="10" cy="10" r="8" />
          <polyline points="6,10 9,13 14,7" />
        </svg>
        <div>
          <p className="text-sm font-medium text-green-800 dark:text-green-300">Setup complete</p>
          <p className="text-xs text-green-700 dark:text-green-500 mt-0.5">
            All core sections are configured. Keep this page as your home base.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Core setup &mdash; {coreStepsDone} of {total} complete
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500">
          {Math.round((coreStepsDone / total) * 100)}%
        </p>
      </div>
      <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-indigo-500 rounded-full transition-all duration-500"
          style={{ width: `${(coreStepsDone / total) * 100}%` }}
        />
      </div>
    </div>
  )
}

export default function Welcome() {
  const { data } = useAppData()

  const budgetDone = useMemo(
    () =>
      Object.values(data.budget.years).some((year) =>
        Object.values(year.months ?? {}).some(
          (month) => Object.keys(month?.budgeted ?? {}).length > 0
        )
      ),
    [data.budget.years]
  )

  const networthDone = useMemo(
    () => data.networth.assets.length > 0 || data.networth.liabilities.length > 0,
    [data.networth.assets, data.networth.liabilities]
  )

  const emergencyFundDone = useMemo(
    () => data.emergencyFund.currentBalance !== '',
    [data.emergencyFund.currentBalance]
  )

  const categoriesDone = useMemo(() => data.budget.categories.length > 9, [data.budget.categories])

  const transactionsDone = useMemo(() => {
    let count = 0
    for (const year of Object.values(data.budget.years)) {
      for (const month of Object.values(year.months ?? {})) {
        count += (month?.transactions ?? []).length
      }
    }
    return count >= 10
  }, [data.budget.years])

  const debtDone = useMemo(() => data.debtRows.length > 0, [data.debtRows])

  const sinkingFundsDone = useMemo(() => data.sinkingFunds.length > 0, [data.sinkingFunds])

  const TOTAL_CORE = 5
  const coreStepsDone = [
    budgetDone,
    networthDone,
    emergencyFundDone,
    categoriesDone,
    transactionsDone,
  ].filter(Boolean).length
  const allCoreDone = coreStepsDone === TOTAL_CORE

  const setupSteps: SetupStepCardProps[] = [
    {
      title: 'Custom Categories',
      descriptionPending:
        'Add at least one category beyond the defaults to personalise your budget structure.',
      descriptionDone: 'Custom categories added. Manage them any time in Settings.',
      done: categoriesDone,
      to: '/settings#categories',
    },
    {
      title: 'Enter Transactions',
      descriptionPending:
        'Log at least 10 transactions across your monthly budgets to build a useful spending history.',
      descriptionDone: 'Great start — you have a solid transaction history to work from.',
      done: transactionsDone,
      to: '/monthly',
    },
    {
      title: 'Monthly Budget',
      descriptionPending:
        'Set budgeted amounts for at least one month to start tracking income and expenses.',
      descriptionDone: 'Budget data exists. Review or update monthly targets any time.',
      done: budgetDone,
      to: '/monthly',
    },
    {
      title: 'Net Worth',
      descriptionPending:
        'Add at least one asset or liability to begin tracking your financial position over time.',
      descriptionDone: 'Net worth entries found. Keep balances updated each month.',
      done: networthDone,
      to: '/networth',
    },
    {
      title: 'Emergency Fund',
      descriptionPending:
        'Enter your current emergency fund balance to see how many months of expenses it covers.',
      descriptionDone: 'Emergency fund balance is set. Review your coverage target any time.',
      done: emergencyFundDone,
      to: '/emergency-fund',
    },
    {
      title: 'Debt Snowball',
      descriptionPending:
        'Add your debts to generate a payoff plan using the snowball or avalanche method.',
      descriptionDone: `${data.debtRows.length} debt${data.debtRows.length !== 1 ? 's' : ''} tracked. Your payoff schedule is active.`,
      done: debtDone,
      optional: true,
      to: '/debt-snowball',
    },
    {
      title: 'Sinking Funds',
      descriptionPending:
        'Create dedicated savings pots for irregular future expenses like holidays or car repairs.',
      descriptionDone: `${data.sinkingFunds.length} fund${data.sinkingFunds.length !== 1 ? 's' : ''} active. Review goals and contributions any time.`,
      done: sinkingFundsDone,
      optional: true,
      to: '/sinking-funds',
    },
  ]

  const quickAccess: QuickAccessCardProps[] = [
    {
      title: 'Annual Overview',
      description: 'Month-by-month income, expenses, and savings grid.',
      to: '/overview',
    },
    {
      title: 'Calculators',
      description: 'Compound interest, loan repayments, and more.',
      to: '/calculators',
    },
    {
      title: 'Home Affordability',
      description: 'Estimate borrowing capacity and mortgage repayments.',
      to: '/home',
    },
  ]

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Welcome"
        subtitle="Track your finances, build your plan, and stay on top of your goals."
      />

      <SetupProgress coreStepsDone={coreStepsDone} total={TOTAL_CORE} allCoreDone={allCoreDone} />

      <SectionHeading>Setup checklist</SectionHeading>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
        {setupSteps.map((step) => (
          <SetupStepCard key={step.to} {...step} />
        ))}
      </div>

      <SectionHeading>Quick access</SectionHeading>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        {quickAccess.map((card) => (
          <QuickAccessCard key={card.to} {...card} />
        ))}
      </div>

      <SectionHeading>Tips</SectionHeading>
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
        <p className="font-medium text-sm text-gray-800 dark:text-gray-100 mb-2">
          Customise your budget categories
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-3">
          The app ships with common categories like Salary, Rent, Groceries, and Investments. Visit
          Settings to add, rename, reorder, or remove them &mdash; changes apply across all months.
        </p>
        <Link
          to="/settings#categories"
          className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
        >
          Open Settings &rarr; Categories
        </Link>
      </div>
    </div>
  )
}
