export type BankTransaction = {
  externalId: string
  description: string
  rawText: string | null
  amountCents: number
  isoDate: string
  note: string | null
  rawJson: string
}

export type FetchProgress = {
  fetched: number
  total: number | null
}

export type BankAccount = {
  id: string
  label: string
  balanceCents: number
}

export type BankProvider = {
  id: string
  label: string
  validateToken(token: string): Promise<void>
  listAccounts(token: string): Promise<BankAccount[]>
  fetchTransactions(params: {
    token: string
    accountId: string | null
    since: string
    until: string
    onProgress: (p: FetchProgress) => void
  }): Promise<BankTransaction[]>
}

const UP_BASE = 'https://api.up.com.au/api/v1'

function upHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` }
}

const UP_BANK: BankProvider = {
  id: 'up',
  label: 'Up Bank',

  async validateToken(token) {
    const res = await fetch(`${UP_BASE}/util/ping`, { headers: upHeaders(token) })
    if (!res.ok) throw new Error('Invalid token — check your Up Bank personal access token.')
  },

  async listAccounts(token) {
    const res = await fetch(`${UP_BASE}/accounts`, { headers: upHeaders(token) })
    if (!res.ok) throw new Error('Failed to fetch accounts from Up Bank.')
    const json = await res.json()
    return (json.data as UpAccount[]).map((a) => ({
      id: a.id,
      label: a.attributes.displayName,
      balanceCents: a.attributes.balance.valueInBaseUnits,
    }))
  },

  async fetchTransactions({ token, accountId, since, until, onProgress }) {
    const results: BankTransaction[] = []
    let url: string | null = buildTransactionsUrl(accountId, since, until)

    while (url) {
      const res = await fetch(url, { headers: upHeaders(token) })
      if (!res.ok) throw new Error('Failed to fetch transactions from Up Bank.')
      const json = (await res.json()) as UpTransactionsResponse

      for (const tx of json.data) {
        results.push({
          externalId: tx.id,
          description: tx.attributes.description,
          rawText: tx.attributes.rawText ?? null,
          amountCents: tx.attributes.amount.valueInBaseUnits,
          isoDate: (tx.attributes.createdAt ?? tx.attributes.settledAt).slice(0, 10),
          note: tx.attributes.message ?? null,
          rawJson: JSON.stringify(tx),
        })
      }

      onProgress({ fetched: results.length, total: null })
      url = json.links.next ?? null
    }

    return results
  },
}

function buildTransactionsUrl(accountId: string | null, since: string, until: string): string {
  const params = new URLSearchParams({
    'page[size]': '100',
    'filter[since]': `${since}T00:00:00+10:00`,
    'filter[until]': `${until}T23:59:59+10:00`,
  })
  if (accountId) params.set('filter[account][id]', accountId)
  return `${UP_BASE}/transactions?${params}`
}

export function bankTxToImportRowData(tx: BankTransaction): {
  rawData: Record<string, string>
  description: string
  amount: string
  parsedDate: string
} {
  const amount = (tx.amountCents / 100).toFixed(2)
  return {
    rawData: { _raw: tx.rawJson },
    description: tx.description,
    amount,
    parsedDate: tx.isoDate,
  }
}

export const PROVIDERS: BankProvider[] = [UP_BANK]

// ─── Up Bank API response types ───────────────────────────────────────────────

type UpAccount = {
  id: string
  attributes: {
    displayName: string
    balance: { valueInBaseUnits: number }
  }
}

type UpTransaction = {
  id: string
  attributes: {
    description: string
    rawText?: string
    message?: string
    amount: { valueInBaseUnits: number }
    createdAt: string
    settledAt?: string
  }
}

type UpTransactionsResponse = {
  data: UpTransaction[]
  links: { next?: string | null }
}
