import { useContext } from 'react'
import type { AppDataContextValue } from './AppDataContextDef'
import { AppDataContext } from './AppDataContextDef'

export function useAppData(): AppDataContextValue {
  const ctx = useContext(AppDataContext)
  if (!ctx) throw new Error('useAppData must be within AppDataProvider')
  return ctx
}
