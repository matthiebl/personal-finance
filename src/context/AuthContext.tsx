import type { User } from '@supabase/supabase-js'
import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { DbFamily, DbUserProfile } from '../lib/supabase'

type AuthContextValue = {
  user: User | null
  profile: DbUserProfile | null
  family: DbFamily | null
  authLoaded: boolean
  sendMagicLink: (email: string) => Promise<void>
  signOut: () => Promise<void>
  createFamily: (name: string) => Promise<void>
  joinFamily: (inviteCode: string) => Promise<string | null>
  leaveFamily: () => Promise<void>
  refreshFamily: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

async function fetchProfile(userId: string): Promise<DbUserProfile | null> {
  const { data } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()
  return data
}

async function fetchFamily(familyId: string): Promise<DbFamily | null> {
  const { data } = await supabase
    .from('families')
    .select('*')
    .eq('id', familyId)
    .maybeSingle()
  return data
}

// Retries fetching the profile a few times — the DB trigger that creates it
// runs asynchronously after the auth event, so it may not be there immediately.
async function fetchProfileWithRetry(userId: string, attempts = 5): Promise<DbUserProfile | null> {
  for (let i = 0; i < attempts; i++) {
    const prof = await fetchProfile(userId)
    if (prof) return prof
    if (i < attempts - 1) await new Promise((r) => setTimeout(r, 400))
  }
  return null
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<DbUserProfile | null>(null)
  const [family, setFamily] = useState<DbFamily | null>(null)
  const [authLoaded, setAuthLoaded] = useState(false)

  async function loadUserData(u: User) {
    const prof = await fetchProfileWithRetry(u.id)
    setProfile(prof)
    if (prof?.family_id) {
      const fam = await fetchFamily(prof.family_id)
      setFamily(fam)
    } else {
      setFamily(null)
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null
      setUser(u)
      if (u) {
        loadUserData(u).finally(() => setAuthLoaded(true))
      } else {
        setAuthLoaded(true)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null
      setUser(u)
      if (u) {
        loadUserData(u)
      } else {
        setProfile(null)
        setFamily(null)
      }
    })

    return () => subscription.unsubscribe()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function sendMagicLink(email: string) {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    })
    if (error) throw new Error(error.message)
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  async function createFamily(name: string) {
    if (!user) throw new Error('Not signed in')
    const { data: fam, error: famErr } = await supabase
      .from('families')
      .insert({ name, owner_id: user.id })
      .select()
      .single()
    if (famErr) throw new Error(famErr.message)

    const { error: profErr } = await supabase
      .from('user_profiles')
      .update({ family_id: fam.id })
      .eq('id', user.id)
    if (profErr) throw new Error(profErr.message)

    setFamily(fam)
    setProfile((p) => p ? { ...p, family_id: fam.id } : p)
  }

  async function joinFamily(inviteCode: string): Promise<string | null> {
    if (!user) throw new Error('Not signed in')
    const { data: familyId, error: rpcErr } = await supabase.rpc('join_family_by_code', { code: inviteCode })
    if (rpcErr) return rpcErr.message
    if (!familyId) return 'No family found with that invite code.'

    const fam = await fetchFamily(familyId as string)
    if (!fam) return 'Failed to load family details.'

    setFamily(fam)
    setProfile((p) => p ? { ...p, family_id: fam.id } : p)
    return null
  }

  async function leaveFamily() {
    if (!user) return
    if (family?.owner_id === user.id) throw new Error('Owner cannot leave the family.')

    const { error } = await supabase
      .from('user_profiles')
      .update({ family_id: null })
      .eq('id', user.id)
    if (error) throw new Error(error.message)

    setFamily(null)
    setProfile((p) => p ? { ...p, family_id: null } : p)
  }

  async function refreshFamily() {
    if (!profile?.family_id) return
    const fam = await fetchFamily(profile.family_id)
    setFamily(fam)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        family,
        authLoaded,
        sendMagicLink,
        signOut,
        createFamily,
        joinFamily,
        leaveFamily,
        refreshFamily,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
