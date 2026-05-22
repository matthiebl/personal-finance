import { useState } from 'react'

export type ViewMode = 'year' | 'rolling12'

export type MonthSlot = {
  year: string
  monthKey: string
  abbr: string
  full: string
}

export function useAnnualPicker() {
  const [selectedYear, setYearState] = useState(
    () => localStorage.getItem('finances:annual:year') ?? String(new Date().getFullYear())
  )
  const [viewMode, setViewModeState] = useState<ViewMode>(
    () => (localStorage.getItem('finances:annual:view') as ViewMode) ?? 'year'
  )

  function setYear(delta: number) {
    const next = String(parseInt(selectedYear) + delta)
    localStorage.setItem('finances:annual:year', next)
    setYearState(next)
  }

  function setViewMode(mode: ViewMode) {
    localStorage.setItem('finances:annual:view', mode)
    setViewModeState(mode)
  }

  return { selectedYear, viewMode, setYear, setViewMode }
}
