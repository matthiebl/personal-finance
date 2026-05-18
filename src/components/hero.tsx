export type HeroStat = {
  label: string
  value: string
  colorClass?: string
  progress?: { pct: number; colorClass: string }
}

const GRID_COLS: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
  5: 'grid-cols-5',
  6: 'grid-cols-6',
}

export function HeroStats({ stats, cols }: { stats: HeroStat[]; cols?: number }) {
  const colsClass = GRID_COLS[cols ?? stats.length] ?? 'grid-cols-3'
  return (
    <div className={`grid gap-3 mb-8 ${colsClass}`}>
      {stats.map((s) => (
        <div
          key={s.label}
          className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3"
        >
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
            {s.label}
            {s.progress && ` ${s.value}`}
          </p>
          {!s.progress && (
            <p className={`text-xl font-semibold tabular-nums ${s.colorClass ?? ''}`}>
              {s.value}
            </p>
          )}
          {s.progress && (
            <div className="h-4 mt-2.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${s.progress.colorClass}`}
                style={{ width: `${s.progress.pct}%` }}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
