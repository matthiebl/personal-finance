import { useEffect, useState } from 'react'
import { BrowserRouter, NavLink, Route, Routes } from 'react-router-dom'
import Calculators from './pages/Calculators'
import DebtSnowball from './pages/DebtSnowball'
import EmergencyFund from './pages/EmergencyFund'
import HomeAffordability from './pages/HomeAffordability'
import Investments from './pages/Investments'
import MonthlyData from './pages/MonthlyData'
import NetWorth from './pages/NetWorth'
import NotFound from './pages/NotFound'
import Overview from './pages/Overview'
import SinkingFunds from './pages/SinkingFunds'
import Welcome from './pages/Welcome'

const NAV_GROUPS = [
  {
    label: 'Getting Started',
    links: [{ to: '/', label: 'Welcome', end: true }],
  },
  {
    label: 'Dashboards',
    links: [
      { to: '/overview', label: 'Annual Overview' },
      { to: '/networth', label: 'Net Worth' },
    ],
  },
  {
    label: 'Monthly',
    links: [
      { to: '/monthly', label: 'Monthly Budget' },
    ],
  },
  {
    label: 'Planning',
    links: [
      { to: '/emergency-fund', label: 'Emergency Fund' },
      { to: '/sinking-funds', label: 'Sinking Funds' },
      { to: '/debt-snowball', label: 'Debt Snowball' },
      { to: '/home', label: 'Home Affordability' },
    ],
  },
  {
    label: 'Tools',
    links: [
      { to: '/calculators', label: 'Calculators' },
      { to: '/investments', label: 'Investment Calc' },
    ],
  },
]

function Sidebar({ dark, onToggleDark }: { dark: boolean; onToggleDark: () => void }) {
  return (
    <aside className="w-60 shrink-0 h-screen sticky top-0 flex flex-col border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
      <div className="px-5 h-14 flex items-center border-b border-gray-200 dark:border-gray-800">
        <span className="font-semibold text-base tracking-tight">Personal Finance</span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="px-2 mb-1 text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
              {group.label}
            </p>
            <ul className="space-y-0.5">
              {group.links.map((link) => (
                <li key={link.to}>
                  <NavLink
                    to={link.to}
                    end={'end' in link ? link.end : false}
                    className={({ isActive }) =>
                      `block px-3 py-1.5 rounded-md text-sm transition-colors ${
                        isActive
                          ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-medium'
                          : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                      }`
                    }
                  >
                    {link.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="px-5 py-4 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between">
        <span className="text-xs text-gray-400 dark:text-gray-500">2026</span>
        <button
          onClick={onToggleDark}
          aria-label="Toggle dark mode"
          className="w-8 h-8 flex items-center justify-center rounded-md border border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          {dark ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 3a1 1 0 0 1 1 1v1a1 1 0 1 1-2 0V4a1 1 0 0 1 1-1Zm0 15a1 1 0 0 1 1 1v1a1 1 0 1 1-2 0v-1a1 1 0 0 1 1-1Zm9-8a1 1 0 1 1 0 2h-1a1 1 0 1 1 0-2h1ZM4 11a1 1 0 1 1 0 2H3a1 1 0 1 1 0-2h1Zm14.95-6.364a1 1 0 0 1 0 1.414l-.707.707a1 1 0 1 1-1.414-1.414l.707-.707a1 1 0 0 1 1.414 0ZM7.172 16.828a1 1 0 0 1 0 1.414l-.707.707a1 1 0 1 1-1.414-1.414l.707-.707a1 1 0 0 1 1.414 0ZM18.95 18.95a1 1 0 0 1-1.414 0l-.707-.707a1 1 0 1 1 1.414-1.414l.707.707a1 1 0 0 1 0 1.414ZM7.172 7.172a1 1 0 0 1-1.414 0l-.707-.707A1 1 0 0 1 6.465 5.05l.707.707a1 1 0 0 1 0 1.414ZM12 7a5 5 0 1 0 0 10A5 5 0 0 0 12 7Z" />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79Z" />
            </svg>
          )}
        </button>
      </div>
    </aside>
  )
}

function App() {
  const [dark, setDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
  }, [dark])

  return (
    <BrowserRouter>
      <div className="min-h-screen flex bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors">
        <Sidebar dark={dark} onToggleDark={() => setDark((d) => !d)} />
        <main className="flex-1 min-h-screen overflow-y-auto px-8 py-8">
          <Routes>
            <Route path="/" element={<Welcome />} />
            <Route path="/overview" element={<Overview />} />
            <Route path="/networth" element={<NetWorth />} />
            <Route path="/monthly" element={<MonthlyData />} />
<Route path="/emergency-fund" element={<EmergencyFund />} />
            <Route path="/sinking-funds" element={<SinkingFunds />} />
            <Route path="/debt-snowball" element={<DebtSnowball />} />
            <Route path="/home" element={<HomeAffordability />} />
            <Route path="/calculators" element={<Calculators />} />
            <Route path="/investments" element={<Investments />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}

export default App
