import type { User } from '@supabase/supabase-js'
import { createContext } from 'react'
import type { DbFamily, DbUserProfile } from '../lib/supabase'

export type AuthContextValue = {
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

export const AuthContext = createContext<AuthContextValue | null>(null)
