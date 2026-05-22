import { useContext } from 'react'
import type { AuthContextValue } from './AuthContextDef'
import { AuthContext } from './AuthContextDef'

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
