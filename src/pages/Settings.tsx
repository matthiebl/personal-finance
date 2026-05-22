import { useEffect, useMemo, useRef, useState } from 'react'
import { PageHeader, SectionHeading } from '../components/layout'
import { useAuth } from '../context/AuthContext'
import { useAppData } from '../context/AppDataContext'
import type { BudgetCategory } from '../lib/types'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  return `${(bytes / 1024).toFixed(1)} KB`
}

function formatMonthKey(key: string): string {
  const [year, month] = key.split('-')
  const date = new Date(parseInt(year), parseInt(month) - 1)
  return date.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' })
}

const SECTIONS = ['income', 'fixed', 'variable', 'savings'] as const
const SECTION_LABELS: Record<string, string> = {
  income: 'Income',
  fixed: 'Fixed Expenses',
  variable: 'Variable Expenses',
  savings: 'Savings & Investments',
}

type PendingDelete = {
  id: string
  label: string
  budgetCount: number
  transactionCount: number
}

type Tab = 'account' | 'categories' | 'data'

// ─── Tab bar ─────────────────────────────────────────────────────────────────

function TabBar({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  const tabs: { id: Tab; label: string }[] = [
    { id: 'account', label: 'Account' },
    { id: 'categories', label: 'Categories' },
    { id: 'data', label: 'Data' },
  ]
  return (
    <div className="flex gap-1 mb-8 border-b border-gray-200 dark:border-gray-800">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
            active === t.id
              ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}

// ─── Account tab ─────────────────────────────────────────────────────────────

type MigrationConflictModalProps = {
  onUpload: () => void
  onDownload: () => void
  onCancel: () => void
  busy: boolean
}

function MigrationConflictModal({ onUpload, onDownload, onCancel, busy }: MigrationConflictModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onCancel}
    >
      <div
        className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 max-w-sm w-full mx-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
          Data already exists in your account
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-5 leading-relaxed">
          Your family already has data saved in the cloud. Choose which version to keep.
        </p>
        <div className="space-y-2 mb-4">
          <button
            onClick={onUpload}
            disabled={busy}
            className="w-full text-left px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors disabled:opacity-50"
          >
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Upload local data</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Replace cloud data with what's on this device.
            </p>
          </button>
          <button
            onClick={onDownload}
            disabled={busy}
            className="w-full text-left px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors disabled:opacity-50"
          >
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Use account data</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Discard local data and load from the cloud.
            </p>
          </button>
        </div>
        <button
          onClick={onCancel}
          disabled={busy}
          className="w-full px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

function AccountTab() {
  const { user, family, profile, authLoaded, sendMagicLink, signOut, createFamily, joinFamily, leaveFamily, refreshFamily } = useAuth()
  const { data, setStorageMode, migrateToAccount, hasCloudData, storageUsage } = useAppData()

  const [showCreateForm, setShowCreateForm] = useState(false)
  const [familyName, setFamilyName] = useState('')
  const [showJoinForm, setShowJoinForm] = useState(false)
  const [inviteCode, setInviteCode] = useState('')
  const [familyError, setFamilyError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const [showMigrationModal, setShowMigrationModal] = useState(false)
  const [migrationBusy, setMigrationBusy] = useState(false)
  const [migrationMessage, setMigrationMessage] = useState<string | null>(null)

  const [magicEmail, setMagicEmail] = useState('')
  const [magicSent, setMagicSent] = useState(false)
  const [magicError, setMagicError] = useState<string | null>(null)
  const [magicBusy, setMagicBusy] = useState(false)

  const [copiedInvite, setCopiedInvite] = useState(false)
  const [editingFamilyName, setEditingFamilyName] = useState(false)
  const [editFamilyNameVal, setEditFamilyNameVal] = useState('')

  const usagePct =
    storageUsage.totalBytes && storageUsage.totalBytes > 0
      ? Math.min((storageUsage.usedBytes / storageUsage.totalBytes) * 100, 100)
      : null

  async function handleCreateFamily() {
    if (!familyName.trim()) return
    setBusy(true)
    setFamilyError(null)
    try {
      await createFamily(familyName.trim())
      setShowCreateForm(false)
      setFamilyName('')
    } catch (e) {
      setFamilyError(e instanceof Error ? e.message : 'Failed to create family')
    } finally {
      setBusy(false)
    }
  }

  async function handleJoinFamily() {
    if (!inviteCode.trim()) return
    setBusy(true)
    setFamilyError(null)
    const err = await joinFamily(inviteCode.trim())
    setBusy(false)
    if (err) {
      setFamilyError(err)
    } else {
      setShowJoinForm(false)
      setInviteCode('')
    }
  }

  async function handleLeaveFamily() {
    if (!confirm('Leave this family? You can rejoin with the invite code.')) return
    setBusy(true)
    try {
      await leaveFamily()
    } catch (e) {
      setFamilyError(e instanceof Error ? e.message : 'Failed to leave family')
    } finally {
      setBusy(false)
    }
  }

  async function handleSwitchToAccount() {
    const cloudExists = await hasCloudData()
    if (!cloudExists) {
      setMigrationBusy(true)
      try {
        await migrateToAccount('upload')
        setMigrationMessage('Data uploaded to your account.')
        setTimeout(() => setMigrationMessage(null), 3000)
      } finally {
        setMigrationBusy(false)
      }
    } else {
      setShowMigrationModal(true)
    }
  }

  async function handleMigrate(strategy: 'upload' | 'download') {
    setMigrationBusy(true)
    try {
      await migrateToAccount(strategy)
      setShowMigrationModal(false)
      setMigrationMessage(strategy === 'upload' ? 'Local data uploaded.' : 'Account data loaded.')
      setTimeout(() => setMigrationMessage(null), 3000)
    } finally {
      setMigrationBusy(false)
    }
  }

  function handleCancelMigration() {
    setShowMigrationModal(false)
    setStorageMode('local')
  }

  function handleCopyInvite() {
    if (!family) return
    navigator.clipboard.writeText(family.invite_code)
    setCopiedInvite(true)
    setTimeout(() => setCopiedInvite(false), 2000)
  }

  if (!authLoaded) {
    return <p className="text-sm text-gray-400 dark:text-gray-500">Loading…</p>
  }

  return (
    <div className="space-y-8">
      {/* Auth */}
      <div>
        <SectionHeading>Sign in</SectionHeading>
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
          {user ? (
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-gray-700 dark:text-gray-300">{user.email}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Signed in</p>
              </div>
              <button
                onClick={signOut}
                className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Sign out
              </button>
            </div>
          ) : magicSent ? (
            <div>
              <p className="text-sm text-gray-700 dark:text-gray-200 mb-1">Check your email</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">
                We sent a login link to <span className="font-medium">{magicEmail}</span>. Click it to sign in.
              </p>
              <button
                onClick={() => { setMagicSent(false); setMagicEmail(''); setMagicError(null) }}
                className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                Use a different email
              </button>
            </div>
          ) : (
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                Sign in to sync your data across devices and share with family members.
              </p>
              {magicError && (
                <p className="text-xs text-red-500 mb-2">{magicError}</p>
              )}
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={magicEmail}
                  onChange={(e) => setMagicEmail(e.target.value)}
                  onKeyDown={async (e) => {
                    if (e.key === 'Enter') {
                      if (!magicEmail.trim()) return
                      setMagicBusy(true)
                      setMagicError(null)
                      try {
                        await sendMagicLink(magicEmail.trim())
                        setMagicSent(true)
                      } catch (err) {
                        setMagicError(err instanceof Error ? err.message : 'Failed to send link')
                      } finally {
                        setMagicBusy(false)
                      }
                    }
                  }}
                  className="flex-1 border border-gray-300 dark:border-gray-700 rounded px-2.5 py-1.5 text-sm bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                />
                <button
                  disabled={magicBusy || !magicEmail.trim()}
                  onClick={async () => {
                    if (!magicEmail.trim()) return
                    setMagicBusy(true)
                    setMagicError(null)
                    try {
                      await sendMagicLink(magicEmail.trim())
                      setMagicSent(true)
                    } catch (err) {
                      setMagicError(err instanceof Error ? err.message : 'Failed to send link')
                    } finally {
                      setMagicBusy(false)
                    }
                  }}
                  className="px-3 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded disabled:opacity-50 transition-colors"
                >
                  {magicBusy ? 'Sending…' : 'Send link'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Family — only shown when signed in */}
      {user && (
        <div>
          <SectionHeading>Family</SectionHeading>
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl divide-y divide-gray-100 dark:divide-gray-800">
            {family ? (
              <>
                {/* Family name */}
                <div className="p-4">
                  {editingFamilyName ? (
                    <div className="flex gap-2">
                      <input
                        autoFocus
                        value={editFamilyNameVal}
                        onChange={(e) => setEditFamilyNameVal(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            // TODO: persist name update via Supabase
                            setEditingFamilyName(false)
                            refreshFamily()
                          }
                          if (e.key === 'Escape') setEditingFamilyName(false)
                        }}
                        className="flex-1 border border-gray-300 dark:border-gray-700 rounded px-2.5 py-1 text-sm bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                      />
                      <button
                        onClick={() => setEditingFamilyName(false)}
                        className="px-3 py-1 text-sm border border-gray-200 dark:border-gray-700 rounded text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-200">{family.name}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Family</p>
                      </div>
                      {profile?.id === family.owner_id && (
                        <button
                          onClick={() => { setEditFamilyNameVal(family.name); setEditingFamilyName(true) }}
                          className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                        >
                          Rename
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Invite code */}
                <div className="p-4">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Invite code</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">
                    Share this code with family members so they can join.
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 px-3 py-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded text-sm font-mono text-gray-700 dark:text-gray-300 tracking-widest">
                      {family.invite_code}
                    </code>
                    <button
                      onClick={handleCopyInvite}
                      className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors min-w-15"
                    >
                      {copiedInvite ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>

                {/* Leave */}
                <div className="p-4">
                  {profile?.id === family.owner_id ? (
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      As the owner you cannot leave the family. Transfer ownership first.
                    </p>
                  ) : (
                    <button
                      onClick={handleLeaveFamily}
                      disabled={busy}
                      className="text-sm text-red-500 hover:text-red-600 dark:hover:text-red-400 transition-colors disabled:opacity-50"
                    >
                      Leave family
                    </button>
                  )}
                  {familyError && (
                    <p className="text-xs text-red-500 mt-2">{familyError}</p>
                  )}
                </div>
              </>
            ) : (
              <div className="p-4 space-y-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Create a family to sync your data and share with others.
                </p>
                {familyError && (
                  <p className="text-xs text-red-500">{familyError}</p>
                )}
                {!showCreateForm && !showJoinForm && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setShowCreateForm(true); setShowJoinForm(false); setFamilyError(null) }}
                      className="px-3 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded transition-colors"
                    >
                      Create family
                    </button>
                    <button
                      onClick={() => { setShowJoinForm(true); setShowCreateForm(false); setFamilyError(null) }}
                      className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      Join with code
                    </button>
                  </div>
                )}
                {showCreateForm && (
                  <div className="space-y-2">
                    <input
                      autoFocus
                      placeholder="Family name"
                      value={familyName}
                      onChange={(e) => setFamilyName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleCreateFamily()}
                      className="w-full border border-gray-300 dark:border-gray-700 rounded px-2.5 py-1.5 text-sm bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleCreateFamily}
                        disabled={busy || !familyName.trim()}
                        className="px-3 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded disabled:opacity-50 transition-colors"
                      >
                        Create
                      </button>
                      <button
                        onClick={() => { setShowCreateForm(false); setFamilyError(null) }}
                        className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
                {showJoinForm && (
                  <div className="space-y-2">
                    <input
                      autoFocus
                      placeholder="Invite code"
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleJoinFamily()}
                      className="w-full border border-gray-300 dark:border-gray-700 rounded px-2.5 py-1.5 text-sm bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-indigo-400 font-mono tracking-widest"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleJoinFamily}
                        disabled={busy || !inviteCode.trim()}
                        className="px-3 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded disabled:opacity-50 transition-colors"
                      >
                        Join
                      </button>
                      <button
                        onClick={() => { setShowJoinForm(false); setFamilyError(null) }}
                        className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Storage mode — only shown when signed in and in a family */}
      {user && family && (
        <div>
          <SectionHeading>Storage</SectionHeading>
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl divide-y divide-gray-100 dark:divide-gray-800">
            <div className="p-4">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-3">Storage mode</p>
              {migrationMessage && (
                <p className="text-xs text-green-600 dark:text-green-400 mb-3">{migrationMessage}</p>
              )}
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
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="storageMode"
                    value="account"
                    checked={data.storageMode === 'account'}
                    disabled={migrationBusy}
                    onChange={handleSwitchToAccount}
                    className="mt-0.5"
                  />
                  <div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      Account sync
                      {migrationBusy && (
                        <span className="ml-2 text-xs text-indigo-500">Syncing…</span>
                      )}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      Sync across devices with your family.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            <div className="p-4">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Storage usage</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                {formatBytes(storageUsage.usedBytes)} used
                {storageUsage.totalBytes ? ` of ${formatBytes(storageUsage.totalBytes)}` : ''}
                {data.storageMode === 'account' && (
                  <span className="ml-2 text-indigo-500">· Account sync active</span>
                )}
              </p>
              {usagePct !== null && (
                <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      usagePct > 90 ? 'bg-red-500' : usagePct > 70 ? 'bg-amber-500' : 'bg-indigo-500'
                    }`}
                    style={{ width: `${usagePct}%` }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showMigrationModal && (
        <MigrationConflictModal
          onUpload={() => handleMigrate('upload')}
          onDownload={() => handleMigrate('download')}
          onCancel={handleCancelMigration}
          busy={migrationBusy}
        />
      )}
    </div>
  )
}

// ─── Categories tab ───────────────────────────────────────────────────────────

function CategoriesTab() {
  const { data, removeCategory, reorderCategories } = useAppData()

  const sortedCats = useMemo(
    () => [...data.budget.categories].sort((a, b) => a.order - b.order),
    [data.budget.categories]
  )

  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null)
  const [dragId, setDragId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)

  function countCategoryUsage(id: string) {
    let budgetCount = 0
    let transactionCount = 0
    for (const yearData of Object.values(data.budget.years)) {
      for (const month of Object.values(yearData.months)) {
        if (!month) continue
        if (month.budgeted[id]) budgetCount++
        transactionCount += month.transactions.filter((t) => t.categoryId === id).length
      }
    }
    return { budgetCount, transactionCount }
  }

  function handleDeleteClick(cat: BudgetCategory) {
    const { budgetCount, transactionCount } = countCategoryUsage(cat.id)
    setPendingDelete({ id: cat.id, label: cat.label, budgetCount, transactionCount })
  }

  function handleDrop(targetId: string, sectionCats: BudgetCategory[]) {
    const dragged = dragId
    setDragOverId(null)
    setDragId(null)
    if (!dragged || dragged === targetId) return
    const ids = sectionCats.map((c) => c.id)
    const fromIdx = ids.indexOf(dragged)
    const toIdx = ids.indexOf(targetId)
    if (fromIdx === -1 || toIdx === -1) return
    const newIds = [...ids]
    newIds.splice(fromIdx, 1)
    newIds.splice(toIdx, 0, dragged)
    reorderCategories(newIds)
  }

  function buildDeleteMessage({ budgetCount, transactionCount }: PendingDelete) {
    const parts: string[] = []
    if (budgetCount > 0) parts.push(`${budgetCount} budget month${budgetCount !== 1 ? 's' : ''}`)
    if (transactionCount > 0)
      parts.push(`${transactionCount} transaction${transactionCount !== 1 ? 's' : ''}`)
    if (parts.length === 0) return 'This category has no associated data and can be safely deleted.'
    return `This category is referenced in ${parts.join(' and ')}. The data will remain but the category will no longer appear.`
  }

  return (
    <div>
      <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
        Drag to reorder. Changes apply across all months.
      </p>
      <div className="space-y-4">
        {SECTIONS.map((section) => {
          const cats = sortedCats.filter((c) => c.section === section)
          return (
            <div key={section}>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                {SECTION_LABELS[section]}
              </p>
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden divide-y divide-gray-100 dark:divide-gray-800">
                {cats.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-gray-400 dark:text-gray-600">No categories</p>
                ) : (
                  cats.map((cat) => (
                    <div
                      key={cat.id}
                      draggable
                      onDragStart={() => setDragId(cat.id)}
                      onDragOver={(e) => { e.preventDefault(); setDragOverId(cat.id) }}
                      onDragLeave={() => setDragOverId((prev) => (prev === cat.id ? null : prev))}
                      onDrop={() => handleDrop(cat.id, cats)}
                      onDragEnd={() => { setDragId(null); setDragOverId(null) }}
                      className={`flex items-center gap-3 px-4 py-2.5 select-none transition-colors ${
                        dragOverId === cat.id && dragId !== cat.id
                          ? 'bg-indigo-50 dark:bg-indigo-900/20'
                          : ''
                      }`}
                      style={{ opacity: dragId === cat.id ? 0.4 : 1 }}
                    >
                      <svg
                        className="w-4 h-4 text-gray-300 dark:text-gray-700 cursor-grab shrink-0"
                        viewBox="0 0 16 16"
                        fill="currentColor"
                      >
                        <circle cx="5.5" cy="4" r="1.2" />
                        <circle cx="5.5" cy="8" r="1.2" />
                        <circle cx="5.5" cy="12" r="1.2" />
                        <circle cx="10.5" cy="4" r="1.2" />
                        <circle cx="10.5" cy="8" r="1.2" />
                        <circle cx="10.5" cy="12" r="1.2" />
                      </svg>
                      <span className="flex-1 text-sm text-gray-700 dark:text-gray-300 truncate">
                        {cat.label || (
                          <span className="text-gray-400 dark:text-gray-600 italic">Unnamed</span>
                        )}
                      </span>
                      <button
                        onClick={() => handleDeleteClick(cat)}
                        className="shrink-0 text-gray-300 dark:text-gray-700 hover:text-red-400 dark:hover:text-red-500 transition-colors"
                        title="Delete category"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <line x1="3" y1="3" x2="13" y2="13" />
                          <line x1="13" y1="3" x2="3" y2="13" />
                        </svg>
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>

      {pendingDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setPendingDelete(null)}
        >
          <div
            className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 max-w-sm w-full mx-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
              Delete &ldquo;{pendingDelete.label || 'Unnamed'}&rdquo;?
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-5 leading-relaxed">
              {buildDeleteMessage(pendingDelete)}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setPendingDelete(null)}
                className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => { removeCategory(pendingDelete.id); setPendingDelete(null) }}
                className="px-3 py-1.5 text-sm text-white bg-red-500 hover:bg-red-600 rounded transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Data tab ─────────────────────────────────────────────────────────────────

function DataTab() {
  const { data } = useAppData()
  const { condenseTransactions } = useAppData()

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

  // Export
  function handleExport() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'finances-backup.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  // Import
  const [importError, setImportError] = useState<string | null>(null)
  const [importPending, setImportPending] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const raw = ev.target?.result as string
        JSON.parse(raw) // validate before storing pending
        setImportPending(raw)
        setImportError(null)
      } catch {
        setImportError('Invalid JSON file.')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  function handleImportConfirm() {
    if (!importPending) return
    try {
      const parsed = JSON.parse(importPending)
      // Basic sanity check
      if (typeof parsed !== 'object' || !parsed.budget) {
        setImportError('File does not look like a valid backup.')
        setImportPending(null)
        return
      }
      // Use setStorageMode-style reset: replace data via localStorage direct write then reload
      localStorage.setItem('finances:data', importPending)
      window.location.reload()
    } catch {
      setImportError('Failed to import data.')
    }
    setImportPending(null)
  }

  return (
    <div className="space-y-8">
      {/* Condense */}
      <div>
        <SectionHeading>Condense transactions</SectionHeading>
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
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
                <option key={key} value={key}>{formatMonthKey(key)}</option>
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
            <p className="text-xs text-gray-400 dark:text-gray-600 mt-3">No transaction data yet.</p>
          )}
        </div>
      </div>

      {/* Export / Import */}
      <div>
        <SectionHeading>Backup &amp; Restore</SectionHeading>
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl divide-y divide-gray-100 dark:divide-gray-800">
          <div className="p-4">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Export data</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">
              Download all your data as a JSON file.
            </p>
            <button
              onClick={handleExport}
              className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Download backup
            </button>
          </div>

          <div className="p-4">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Import data</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">
              Restore from a previously exported JSON backup. This will replace all current data.
            </p>
            {importError && (
              <p className="text-xs text-red-500 mb-2">{importError}</p>
            )}
            <input
              ref={fileRef}
              type="file"
              accept=".json"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              onClick={() => fileRef.current?.click()}
              className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Choose file
            </button>
          </div>
        </div>
      </div>

      {/* Import confirm modal */}
      {importPending && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setImportPending(null)}
        >
          <div
            className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 max-w-sm w-full mx-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
              Replace all data?
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-5 leading-relaxed">
              Importing this backup will replace everything currently in the app. This cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setImportPending(null)}
                className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleImportConfirm}
                className="px-3 py-1.5 text-sm text-white bg-red-500 hover:bg-red-600 rounded transition-colors"
              >
                Import &amp; replace
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Settings page ────────────────────────────────────────────────────────────

export default function Settings() {
  const [tab, setTab] = useState<Tab>('account')

  return (
    <div className="max-w-2xl">
      <PageHeader title="Settings" subtitle="Manage your account, categories, and data." />
      <TabBar active={tab} onChange={setTab} />
      {tab === 'account' && <AccountTab />}
      {tab === 'categories' && <CategoriesTab />}
      {tab === 'data' && <DataTab />}
    </div>
  )
}
