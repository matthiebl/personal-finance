import { useEffect, useState } from 'react'
import { PageHeader, SectionHeading } from '../components/layout'
import { useAppData } from '../context/AppDataContext'

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  return `${(bytes / 1024).toFixed(1)} KB`
}

function formatMonthKey(key: string): string {
  const [year, month] = key.split('-')
  const date = new Date(parseInt(year), parseInt(month) - 1)
  return date.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' })
}

export default function Settings() {
  const { data, setStorageMode, storageUsage, condenseTransactions } = useAppData()

  // Collect distinct month keys across all years for the condense filter
  const monthKeys: string[] = []
  for (const [year, yearData] of Object.entries(data.budget.years)) {
    for (const month of Object.keys(yearData.months)) {
      monthKeys.push(`${year}-${month}`)
    }
  }
  monthKeys.sort()

  const [condenseMonth, setCondenseMonth] = useState('all')
  const [condenseDone, setCondenseDone] = useState(false)

  useEffect(() => {
    if (!condenseDone) return
    const id = setTimeout(() => setCondenseDone(false), 2500)
    return () => clearTimeout(id)
  }, [condenseDone])

  function handleCondense() {
    if (condenseMonth === 'all') {
      for (const key of monthKeys) {
        const [year, month] = key.split('-')
        condenseTransactions(year, month)
      }
    } else {
      const [year, month] = condenseMonth.split('-')
      condenseTransactions(year, month)
    }
    setCondenseDone(true)
  }

  const usagePct =
    storageUsage.totalBytes && storageUsage.totalBytes > 0
      ? Math.min((storageUsage.usedBytes / storageUsage.totalBytes) * 100, 100)
      : null

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Settings"
        subtitle="Manage how your data is stored."
      />

      {/* Storage mode */}
      <div className="mb-8">
        <SectionHeading>Storage</SectionHeading>
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl divide-y divide-gray-100 dark:divide-gray-800">

          {/* Mode toggle */}
          <div className="p-4">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-3">Storage mode</p>
            <div className="space-y-2">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="storageMode"
                  value="local"
                  checked={data.storageMode === 'local'}
                  onChange={() => setStorageMode('local')}
                  className="mt-0.5"
                />
                <div>
                  <p className="text-sm text-gray-700 dark:text-gray-300">Local browser storage</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    Data is saved in this browser only. Nothing leaves your device.
                  </p>
                </div>
              </label>
              <label className="flex items-start gap-3 cursor-not-allowed opacity-50">
                <input
                  type="radio"
                  name="storageMode"
                  value="account"
                  disabled
                  className="mt-0.5"
                />
                <div>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    Account sync
                    <span className="ml-2 text-xs bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 px-1.5 py-0.5 rounded">
                      Coming soon
                    </span>
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    Sync across devices with a free account.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Usage */}
          <div className="p-4">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Storage usage</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
              {formatBytes(storageUsage.usedBytes)} used
              {storageUsage.totalBytes ? ` of ${formatBytes(storageUsage.totalBytes)}` : ''}
            </p>
            {usagePct !== null && (
              <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    usagePct > 90
                      ? 'bg-red-500'
                      : usagePct > 70
                        ? 'bg-amber-500'
                        : 'bg-indigo-500'
                  }`}
                  style={{ width: `${usagePct}%` }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Data maintenance */}
      <div>
        <SectionHeading>Data</SectionHeading>
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
            Condense transactions
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
            Groups multiple transactions per category into one per month to reduce storage size.
            This cannot be undone.
          </p>
          <div className="flex items-center gap-3">
            <select
              value={condenseMonth}
              onChange={(e) => setCondenseMonth(e.target.value)}
              className="border border-gray-300 dark:border-gray-700 rounded px-2.5 py-1.5 text-sm bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-400 dark:focus:ring-gray-600"
            >
              <option value="all">All months</option>
              {monthKeys.map((key) => (
                <option key={key} value={key}>
                  {formatMonthKey(key)}
                </option>
              ))}
            </select>
            <button
              onClick={handleCondense}
              disabled={monthKeys.length === 0}
              className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Condense
            </button>
            {condenseDone && (
              <span className="text-xs text-green-600 dark:text-green-400">Done.</span>
            )}
          </div>
          {monthKeys.length === 0 && (
            <p className="text-xs text-gray-400 dark:text-gray-600 mt-3">
              No transaction data yet.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
