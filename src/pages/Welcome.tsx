import { useState } from 'react'
import { CurrencyInput, TextInput } from '../components/inputs'
import { PageHeader } from '../components/layout'

export default function Welcome() {
  const [name, setName] = useState('')
  const [income, setIncome] = useState('')

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Welcome"
        subtitle="Set up your basic profile to personalise the app."
      />

      <div className="grid grid-cols-2 gap-8">
        <div>
          <h2 className="font-semibold mb-3">Get started</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-4">
            Fill in your details on the right to set the context for all your financial pages. You
            can update these at any time.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
            Use the sidebar to navigate between pages — from your annual overview and net worth
            tracker, through monthly data entry and bill tracking, to planning tools like debt
            snowball and home affordability.
          </p>
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
              Your name
            </label>
            <TextInput value={name} onChange={setName} placeholder="e.g. Alex" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
              Annual gross income
            </label>
            <CurrencyInput value={income} onChange={setIncome} placeholder="85,000" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
              Financial year
            </label>
            <select className="border border-gray-300 dark:border-gray-700 rounded-md px-3 py-1.5 text-sm bg-white dark:bg-gray-900 w-full focus:outline-none focus:ring-1 focus:ring-gray-400 dark:focus:ring-gray-600">
              <option>2026</option>
              <option>2025</option>
              <option>2024</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
              Currency
            </label>
            <select className="border border-gray-300 dark:border-gray-700 rounded-md px-3 py-1.5 text-sm bg-white dark:bg-gray-900 w-full focus:outline-none focus:ring-1 focus:ring-gray-400 dark:focus:ring-gray-600">
              <option value="AUD">AUD — Australian Dollar</option>
              <option value="USD">USD — US Dollar</option>
              <option value="EUR">EUR — Euro</option>
              <option value="GBP">GBP — British Pound</option>
              <option value="CAD">CAD — Canadian Dollar</option>
            </select>
          </div>
          <button className="w-full mt-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-md px-4 py-2 text-sm font-medium hover:bg-gray-700 dark:hover:bg-gray-200 transition-colors">
            Save profile
          </button>
        </div>
      </div>

      <div className="mt-10 grid grid-cols-3 gap-4">
        {[
          { label: 'Annual Overview', desc: 'Month-by-month income & expense grid', to: '/overview' },
          { label: 'Net Worth', desc: 'Track assets and liabilities over time', to: '/networth' },
          { label: 'Debt Snowball', desc: 'Plan your debt payoff strategy', to: '/debt-snowball' },
        ].map((card) => (
          <a
            key={card.to}
            href={card.to}
            className="block bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 hover:border-gray-300 dark:hover:border-gray-700 transition-colors"
          >
            <p className="font-medium text-sm mb-1">{card.label}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{card.desc}</p>
          </a>
        ))}
      </div>
    </div>
  )
}
