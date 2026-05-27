import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import type {
  BankAccount,
  BankProvider,
  BankTransaction,
  FetchProgress,
} from '../../lib/bankProviders'
import { PROVIDERS } from '../../lib/bankProviders'

type Step = 'provider' | 'token' | 'accounts' | 'daterange' | 'fetching'

type BankImporterProps = {
  busy: boolean
  onImported: (transactions: BankTransaction[], provider: BankProvider) => void
}

export function BankImporter({ busy, onImported }: BankImporterProps) {
  const [step, setStep] = useState<Step>(PROVIDERS.length === 1 ? 'token' : 'provider')
  const [provider, setProvider] = useState<BankProvider>(PROVIDERS[0])

  const [token, setToken] = useState(() => tokenFromStorage(PROVIDERS[0].id))
  const [rememberToken, setRememberToken] = useState(() => !!tokenFromStorage(PROVIDERS[0].id))
  const [showToken, setShowToken] = useState(false)
  const [tokenError, setTokenError] = useState<string | null>(null)
  const [validating, setValidating] = useState(false)

  const [accounts, setAccounts] = useState<BankAccount[]>([])
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)
  const [accountsError, setAccountsError] = useState<string | null>(null)

  const [searchParams] = useSearchParams()
  const [since, setSince] = useState(() => searchParams.get('since') ?? defaultSince())
  const [until, setUntil] = useState(() => searchParams.get('until') ?? defaultUntil())

  const [progress, setProgress] = useState<FetchProgress>({ fetched: 0, total: null })
  const [fetchError, setFetchError] = useState<string | null>(null)

  const fetchStarted = useRef(false)

  // ─── Provider step ──────────────────────────────────────────────────────────

  function handlePickProvider(p: BankProvider) {
    setProvider(p)
    setToken(tokenFromStorage(p.id))
    setRememberToken(!!tokenFromStorage(p.id))
    setStep('token')
  }

  // ─── Token step ─────────────────────────────────────────────────────────────

  async function handleValidateToken() {
    setTokenError(null)
    setValidating(true)
    try {
      await provider.validateToken(token)
      if (rememberToken) localStorage.setItem(tokenKey(provider.id), token)
      else localStorage.removeItem(tokenKey(provider.id))
      const fetched = await provider.listAccounts(token)
      setAccounts(fetched)
      setAccountsError(null)
      setStep('accounts')
    } catch (err) {
      setTokenError(err instanceof Error ? err.message : 'Connection failed.')
    } finally {
      setValidating(false)
    }
  }

  // ─── Accounts step ──────────────────────────────────────────────────────────

  // ─── Date range step ────────────────────────────────────────────────────────

  // ─── Fetching step ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (step !== 'fetching' || fetchStarted.current) return
    fetchStarted.current = true
    setProgress({ fetched: 0, total: null })
    setFetchError(null)

    provider
      .fetchTransactions({
        token,
        accountId: selectedAccountId,
        since,
        until,
        onProgress: (p) => setProgress(p),
      })
      .then((txs) => onImported(txs, provider))
      .catch((err) => {
        setFetchError(err instanceof Error ? err.message : 'Fetch failed.')
        setStep('daterange')
        fetchStarted.current = false
      })
  }, [step]) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Render ─────────────────────────────────────────────────────────────────

  if (step === 'provider') {
    return (
      <div className="space-y-3">
        <p className="text-sm text-gray-600 dark:text-gray-400">Select your bank:</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {PROVIDERS.map((p) => (
            <button
              key={p.id}
              onClick={() => handlePickProvider(p)}
              className="flex items-center gap-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-3 text-left hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors"
            >
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {p.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  if (step === 'token') {
    const savedToken = tokenFromStorage(provider.id)
    return (
      <div className="space-y-4 max-w-md">
        <div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {provider.label} personal access token
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            Generate a token at{' '}
            <a
              href="https://api.up.com.au"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 dark:text-indigo-400 underline"
            >
              api.up.com.au
            </a>
          </p>
          <div className="relative">
            <input
              type={showToken ? 'text' : 'password'}
              value={token}
              onChange={(e) => setToken(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !validating && token && handleValidateToken()}
              placeholder="up:yeah:..."
              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 pr-10 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-400"
            />
            <button
              type="button"
              onClick={() => setShowToken((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              tabIndex={-1}
            >
              {showToken ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                  />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            id="remember-token"
            type="checkbox"
            checked={rememberToken}
            onChange={(e) => setRememberToken(e.target.checked)}
            className="rounded border-gray-300 dark:border-gray-600 text-indigo-600"
          />
          <label htmlFor="remember-token" className="text-xs text-gray-500 dark:text-gray-400">
            Remember in this browser (localStorage, never sent to our servers)
          </label>
          {savedToken && (
            <button
              onClick={() => {
                localStorage.removeItem(tokenKey(provider.id))
                setToken('')
                setRememberToken(false)
              }}
              className="ml-auto text-xs text-red-500 hover:text-red-700 dark:hover:text-red-400 shrink-0"
            >
              Clear saved
            </button>
          )}
        </div>

        {tokenError && <p className="text-sm text-red-600 dark:text-red-400">{tokenError}</p>}

        <button
          onClick={handleValidateToken}
          disabled={!token || validating || busy}
          className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-40 transition-colors flex items-center gap-2"
        >
          {validating && (
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          )}
          {validating ? 'Connecting…' : 'Connect'}
        </button>
      </div>
    )
  }

  if (step === 'accounts') {
    return (
      <div className="space-y-4 max-w-md">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Which account would you like to import from?
        </p>

        {accountsError && <p className="text-sm text-red-600 dark:text-red-400">{accountsError}</p>}

        <div className="space-y-2">
          <label className="flex items-center gap-3 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-3 cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors">
            <input
              type="radio"
              name="account"
              checked={selectedAccountId === null}
              onChange={() => setSelectedAccountId(null)}
              className="text-indigo-600"
            />
            <span className="text-sm text-gray-900 dark:text-gray-100">All accounts</span>
          </label>
          {accounts.map((a) => (
            <label
              key={a.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-3 cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors"
            >
              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  name="account"
                  checked={selectedAccountId === a.id}
                  onChange={() => setSelectedAccountId(a.id)}
                  className="text-indigo-600"
                />
                <span className="text-sm text-gray-900 dark:text-gray-100">{a.label}</span>
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                ${(a.balanceCents / 100).toLocaleString('en-AU', { minimumFractionDigits: 2 })}
              </span>
            </label>
          ))}
        </div>

        <button
          onClick={() => setStep('daterange')}
          className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          Continue
        </button>
      </div>
    )
  }

  if (step === 'daterange') {
    return (
      <div className="space-y-4 max-w-md">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Select date range to import
        </p>

        {fetchError && <p className="text-sm text-red-600 dark:text-red-400">{fetchError}</p>}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">From</label>
            <input
              type="date"
              value={since}
              onChange={(e) => setSince(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">To</label>
            <input
              type="date"
              value={until}
              onChange={(e) => setUntil(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setStep('accounts')}
            className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Back
          </button>
          <button
            onClick={() => {
              fetchStarted.current = false
              setStep('fetching')
            }}
            disabled={!since || !until || since > until || busy}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-40 transition-colors"
          >
            Import transactions
          </button>
        </div>
      </div>
    )
  }

  // fetching step
  return (
    <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
      <svg
        className="animate-spin h-5 w-5 text-indigo-600 shrink-0"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
      </svg>
      <span>
        {progress.total != null
          ? `Fetching… ${progress.fetched} / ${progress.total} transactions`
          : `Fetching… ${progress.fetched} transaction${progress.fetched !== 1 ? 's' : ''}`}
      </span>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function tokenKey(providerId: string) {
  return `import:${providerId}:token`
}

function tokenFromStorage(providerId: string): string {
  return localStorage.getItem(tokenKey(providerId)) ?? ''
}

function defaultSince(): string {
  const d = new Date()
  d.setDate(1)
  d.setMonth(d.getMonth() - 1)
  return d.toISOString().slice(0, 10)
}

function defaultUntil(): string {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toISOString().slice(0, 10)
}
