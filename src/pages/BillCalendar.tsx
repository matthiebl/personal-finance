const BILLS = [
  { name: 'Rent / Mortgage', amount: '$—', due: 1, category: 'Housing' },
  { name: 'Car Insurance', amount: '$—', due: 5, category: 'Insurance' },
  { name: 'Internet', amount: '$—', due: 8, category: 'Utilities' },
  { name: 'Electricity', amount: '$—', due: 12, category: 'Utilities' },
  { name: 'Netflix', amount: '$—', due: 14, category: 'Subscriptions' },
  { name: 'Spotify', amount: '$—', due: 14, category: 'Subscriptions' },
  { name: 'Phone Plan', amount: '$—', due: 20, category: 'Utilities' },
  { name: 'Gym Membership', amount: '$—', due: 22, category: 'Health' },
  { name: 'Car Payment', amount: '$—', due: 25, category: 'Loans' },
  { name: 'Student Loan', amount: '$—', due: 28, category: 'Loans' },
]

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function CalendarGrid() {
  const today = new Date()
  const year = today.getFullYear()
  const month = today.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const cells: (number | null)[] = [...Array(firstDay).fill(null)]
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)

  const billsByDay: Record<number, typeof BILLS> = {}
  BILLS.forEach((b) => {
    if (!billsByDay[b.due]) billsByDay[b.due] = []
    billsByDay[b.due].push(b)
  })

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden mb-8">
      <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-800">
        {DAYS_OF_WEEK.map((d) => (
          <div
            key={d}
            className="py-2 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 border-r last:border-r-0 border-gray-100 dark:border-gray-800"
          >
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((day, i) => {
          const isToday = day === today.getDate()
          const dayBills = day ? (billsByDay[day] ?? []) : []
          return (
            <div
              key={i}
              className={`min-h-20 p-1.5 border-r border-b last:border-r-0 border-gray-100 dark:border-gray-800/60 ${
                !day ? 'bg-gray-50/50 dark:bg-gray-900/30' : ''
              }`}
            >
              {day && (
                <>
                  <span
                    className={`inline-flex w-6 h-6 items-center justify-center rounded-full text-xs mb-1 ${
                      isToday
                        ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-semibold'
                        : 'text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    {day}
                  </span>
                  <div className="space-y-0.5">
                    {dayBills.map((b) => (
                      <div
                        key={b.name}
                        className="text-xs bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 rounded px-1 py-0.5 truncate"
                        title={b.name}
                      >
                        {b.name}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function BillCalendar() {
  const monthName = new Date().toLocaleString('default', { month: 'long', year: 'numeric' })

  return (
    <div>
      <div className="mb-6 pb-5 border-b border-gray-200 dark:border-gray-800 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-1">Bill Calendar</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Visualise when your bills are due throughout the month.
          </p>
        </div>
        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{monthName}</span>
      </div>

      <CalendarGrid />

      <h2 className="text-sm font-semibold mb-3 text-gray-700 dark:text-gray-300">All Bills</h2>
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-800">
            <th className="text-left py-2 pr-4 font-medium text-gray-500 dark:text-gray-400">
              Bill
            </th>
            <th className="text-left py-2 pr-4 font-medium text-gray-500 dark:text-gray-400">
              Category
            </th>
            <th className="text-center py-2 pr-4 font-medium text-gray-500 dark:text-gray-400">
              Due Day
            </th>
            <th className="text-right py-2 font-medium text-gray-500 dark:text-gray-400">Amount</th>
          </tr>
        </thead>
        <tbody>
          {BILLS.map((bill) => (
            <tr
              key={bill.name}
              className="border-b border-gray-100 dark:border-gray-800/60 even:bg-gray-50/50 dark:even:bg-gray-900/30"
            >
              <td className="py-2 pr-4 text-gray-700 dark:text-gray-300">{bill.name}</td>
              <td className="py-2 pr-4 text-xs text-gray-500 dark:text-gray-500">
                {bill.category}
              </td>
              <td className="py-2 pr-4 text-center tabular-nums text-gray-600 dark:text-gray-400">
                {bill.due}
              </td>
              <td className="py-2 text-right tabular-nums text-gray-400 dark:text-gray-600">
                {bill.amount}
              </td>
            </tr>
          ))}
          <tr className="border-t-2 border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800/50 font-semibold">
            <td className="py-2 pr-4 text-gray-700 dark:text-gray-200" colSpan={3}>
              Total Monthly Bills
            </td>
            <td className="py-2 text-right tabular-nums text-gray-700 dark:text-gray-200">$—</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}
