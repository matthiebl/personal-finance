import { useEffect, useMemo } from 'react'
import type { DonutSegment, NetworthDatum, NetworthSeriesEntry } from '../components/charts'
import {
  DonutChart,
  ExpandableChart,
  NETWORTH_ASSET_COLORS,
  NETWORTH_LIABILITY_COLORS,
  NetworthStackedChart,
} from '../components/charts'
import { HeroStats } from '../components/hero'
import { CurrencyInput, TextInput } from '../components/inputs'
import type { MonthSlot } from '../components/layout'
import {
  PageHeader,
  SectionHeading,
  ViewToggle,
  YearSelector,
  useAnnualPicker,
} from '../components/layout'
import { useAppData } from '../context/AppDataContext'
import { fmt, fmtCents } from '../lib/finance'
import type { NetworthEntry } from '../lib/types'

const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTH_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const MONTH_KEYS = MONTH_ABBR.map((_, i) => String(i + 1).padStart(2, '0'))

// ─── NetworthEntryTable ───────────────────────────────────────────────────────

type NetworthEntryTableProps = {
  type: 'asset' | 'liability'
  entries: NetworthEntry[]
  monthSlots: MonthSlot[]
  getValue: (yearMonth: string, entryId: string) => string
  onAdd: () => void
  onUpdate: (id: string, patch: Partial<Omit<NetworthEntry, 'id'>>) => void
  onRemove: (id: string) => void
  onSetValue: (yearMonth: string, entryId: string, amount: string) => void
}

function NetworthEntryTable({
  type,
  entries,
  monthSlots,
  getValue,
  onAdd,
  onUpdate,
  onRemove,
  onSetValue,
}: NetworthEntryTableProps) {
  const isAsset = type === 'asset'
  const accentClass = isAsset
    ? 'text-green-600 dark:text-green-400'
    : 'text-red-500 dark:text-red-400'

  // Monthly totals across all entries
  const monthTotals = monthSlots.map((slot) => {
    const ym = `${slot.year}-${slot.monthKey}`
    return entries.reduce((sum, e) => sum + (parseFloat(getValue(ym, e.id)) || 0), 0)
  })

  const colSpan = monthSlots.length + 3 // name + months + latest + delete

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-x-auto">
      <table className="w-full min-w-max text-sm border-collapse">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-800">
            <th className="sticky left-0 z-10 bg-white dark:bg-gray-900 text-left py-2.5 pl-4 pr-2 font-medium text-gray-500 dark:text-gray-400 min-w-44">
              Name
            </th>
            {monthSlots.map((slot) => (
              <th
                key={`${slot.year}-${slot.monthKey}`}
                className="text-right py-2.5 px-2 font-medium text-gray-500 dark:text-gray-400 min-w-28 whitespace-nowrap"
              >
                {slot.abbr}
              </th>
            ))}
            <th className="text-right py-2.5 px-2 font-medium text-gray-500 dark:text-gray-400 min-w-24 whitespace-nowrap">
              Latest
            </th>
            <th className="w-8 pr-3" />
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, rowIdx) => {
            const latestYm = `${monthSlots[monthSlots.length - 1].year}-${monthSlots[monthSlots.length - 1].monthKey}`
            const latestVal = parseFloat(getValue(latestYm, entry.id)) || 0
            const isEven = rowIdx % 2 === 1
            return (
              <tr
                key={entry.id}
                className={`border-b border-gray-100 dark:border-gray-800/60 ${isEven ? 'bg-gray-50/50 dark:even:bg-gray-900/30' : ''}`}
              >
                <td
                  className={`sticky left-0 z-10 py-1.5 pl-4 pr-2 ${isEven ? 'bg-gray-50/50 dark:bg-gray-900/30' : 'bg-white dark:bg-gray-900'}`}
                >
                  <TextInput
                    value={entry.name}
                    onChange={(v) => onUpdate(entry.id, { name: v })}
                    placeholder="Name"
                    compact
                  />
                </td>
                {monthSlots.map((slot) => {
                  const ym = `${slot.year}-${slot.monthKey}`
                  return (
                    <td key={ym} className="py-1.5 px-2 align-middle">
                      <CurrencyInput
                        value={getValue(ym, entry.id)}
                        onChange={(v) => onSetValue(ym, entry.id, v)}
                        compact
                      />
                    </td>
                  )
                })}
                <td className="py-1.5 px-2 text-right tabular-nums text-gray-700 dark:text-gray-300 font-medium">
                  {latestVal > 0 ? fmt(latestVal) : <span className="text-gray-300 dark:text-gray-700">—</span>}
                </td>
                <td className="py-1.5 pr-3 text-center">
                  <button
                    onClick={() => onRemove(entry.id)}
                    className="text-gray-300 dark:text-gray-700 hover:text-red-400 dark:hover:text-red-500 transition-colors text-base leading-none"
                    aria-label="Remove"
                  >
                    ×
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800/50 font-semibold">
            <td className={`sticky left-0 z-10 py-2.5 pl-4 pr-2 bg-gray-100 dark:bg-gray-800/50 ${accentClass}`}>
              Total {isAsset ? 'Assets' : 'Liabilities'}
            </td>
            {monthTotals.map((total, i) => (
              <td key={i} className={`py-2.5 px-2 text-right tabular-nums ${accentClass}`}>
                {total > 0 ? fmt(total) : <span className="text-gray-300 dark:text-gray-700">—</span>}
              </td>
            ))}
            <td className={`py-2.5 px-2 text-right tabular-nums ${accentClass}`}>
              {monthTotals[monthTotals.length - 1] > 0
                ? fmt(monthTotals[monthTotals.length - 1])
                : <span className="text-gray-300 dark:text-gray-700">—</span>}
            </td>
            <td />
          </tr>
          <tr className="bg-white dark:bg-gray-900">
            <td colSpan={colSpan} className="pl-4 py-2">
              <button
                onClick={onAdd}
                className="text-xs text-gray-400 dark:text-gray-600 hover:text-gray-700 dark:hover:text-gray-400 transition-colors flex items-center gap-1.5"
              >
                <span className="text-sm font-medium leading-none">+</span> Add {isAsset ? 'asset' : 'liability'}
              </button>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NetWorth() {
  const { data, addNetworthEntry, updateNetworthEntry, removeNetworthEntry, setNetworthValue } =
    useAppData()
  const { selectedYear, viewMode, setYear, setViewMode } = useAnnualPicker()

  // Seed one empty row per type on first visit
  useEffect(() => {
    if (data.networth.assets.length === 0) addNetworthEntry('asset')
    if (data.networth.liabilities.length === 0) addNetworthEntry('liability')
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Active month slots — 12 entries, either the selected calendar year or rolling 12M
  const activeMonthSlots = useMemo((): MonthSlot[] => {
    if (viewMode === 'rolling12') {
      const now = new Date()
      return Array.from({ length: 12 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1)
        return {
          year: String(d.getFullYear()),
          monthKey: String(d.getMonth() + 1).padStart(2, '0'),
          abbr: `${MONTH_ABBR[d.getMonth()]} '${String(d.getFullYear()).slice(2)}`,
          full: `${MONTH_FULL[d.getMonth()]} ${d.getFullYear()}`,
        }
      })
    }
    return MONTH_KEYS.map((key, i) => ({
      year: selectedYear,
      monthKey: key,
      abbr: MONTH_ABBR[i],
      full: MONTH_FULL[i],
    }))
  }, [viewMode, selectedYear])

  function getValue(yearMonth: string, entryId: string): string {
    return data.networth.months[yearMonth]?.[entryId] ?? ''
  }

  // Latest month stats
  const { totalAssets, totalLiabilities, netWorth, ratio } = useMemo(() => {
    const latest = activeMonthSlots[activeMonthSlots.length - 1]
    const ym = `${latest.year}-${latest.monthKey}`
    const vals = data.networth.months[ym] ?? {}
    const totalAssets = data.networth.assets.reduce(
      (s, e) => s + (parseFloat(vals[e.id] ?? '') || 0),
      0,
    )
    const totalLiabilities = data.networth.liabilities.reduce(
      (s, e) => s + (parseFloat(vals[e.id] ?? '') || 0),
      0,
    )
    const netWorth = totalAssets - totalLiabilities
    const ratio = totalLiabilities > 0 ? totalAssets / totalLiabilities : null
    return { totalAssets, totalLiabilities, netWorth, ratio }
  }, [data.networth, activeMonthSlots])

  // Chart series and data
  const { chartData, assetSeries, liabilitySeries } = useMemo(() => {
    const assetSeries: NetworthSeriesEntry[] = data.networth.assets.map((e, i) => ({
      id: e.id,
      label: e.name || `Asset ${i + 1}`,
      color: NETWORTH_ASSET_COLORS[i % NETWORTH_ASSET_COLORS.length],
    }))
    const liabilitySeries: NetworthSeriesEntry[] = data.networth.liabilities.map((e, i) => ({
      id: e.id,
      label: e.name || `Liability ${i + 1}`,
      color: NETWORTH_LIABILITY_COLORS[i % NETWORTH_LIABILITY_COLORS.length],
    }))

    const chartData: NetworthDatum[] = activeMonthSlots.map((slot) => {
      const ym = `${slot.year}-${slot.monthKey}`
      const vals = data.networth.months[ym] ?? {}
      const datum: NetworthDatum = { month: slot.abbr, networth: 0 }
      let totalA = 0
      let totalL = 0
      for (const e of data.networth.assets) {
        const v = parseFloat(vals[e.id] ?? '') || 0
        datum[e.id] = v
        totalA += v
      }
      for (const e of data.networth.liabilities) {
        const v = parseFloat(vals[e.id] ?? '') || 0
        datum[e.id] = -v
        totalL += v
      }
      datum.networth = totalA - totalL
      return datum
    })

    return { chartData, assetSeries, liabilitySeries }
  }, [data.networth, activeMonthSlots])

  // Donut segments from latest month
  const { assetSegments, liabilitySegments } = useMemo((): {
    assetSegments: DonutSegment[]
    liabilitySegments: DonutSegment[]
  } => {
    const latest = activeMonthSlots[activeMonthSlots.length - 1]
    const ym = `${latest.year}-${latest.monthKey}`
    const vals = data.networth.months[ym] ?? {}
    return {
      assetSegments: data.networth.assets
        .map((e, i) => ({
          label: e.name || `Asset ${i + 1}`,
          value: parseFloat(vals[e.id] ?? '') || 0,
          color: NETWORTH_ASSET_COLORS[i % NETWORTH_ASSET_COLORS.length],
        }))
        .filter((s) => s.value > 0),
      liabilitySegments: data.networth.liabilities
        .map((e, i) => ({
          label: e.name || `Liability ${i + 1}`,
          value: parseFloat(vals[e.id] ?? '') || 0,
          color: NETWORTH_LIABILITY_COLORS[i % NETWORTH_LIABILITY_COLORS.length],
        }))
        .filter((s) => s.value > 0),
    }
  }, [data.networth, activeMonthSlots])

  const networthColor =
    netWorth > 0
      ? 'text-indigo-600 dark:text-indigo-400'
      : netWorth < 0
        ? 'text-red-500 dark:text-red-400'
        : 'text-gray-900 dark:text-gray-100'

  return (
    <div>
      <PageHeader
        title="Net Worth"
        subtitle="Track your assets and liabilities over time."
        actions={
          <div className="flex items-center gap-2">
            <ViewToggle mode={viewMode} onChange={setViewMode} />
            {viewMode === 'year' && <YearSelector year={selectedYear} onChange={setYear} />}
          </div>
        }
      />

      <HeroStats
        stats={[
          {
            label: 'Total Assets',
            value: fmtCents(totalAssets),
            colorClass: 'text-green-600 dark:text-green-400',
          },
          {
            label: 'Total Liabilities',
            value: fmtCents(totalLiabilities),
            colorClass: 'text-red-500 dark:text-red-400',
          },
          {
            label: 'Net Worth',
            value: fmtCents(netWorth),
            colorClass: networthColor,
          },
          {
            label: 'Asset / Liability Ratio',
            value: ratio !== null ? `${ratio.toFixed(2)}×` : '—',
            colorClass: 'text-gray-700 dark:text-gray-300',
          },
        ]}
        cols={4}
      />

      <SectionHeading>Net Worth Over Time</SectionHeading>
      <div className="mb-8">
        {(assetSeries.length > 0 || liabilitySeries.length > 0) && (
          <div className="flex flex-wrap gap-x-4 gap-y-1 mb-3">
            {assetSeries.map((s) => (
              <div key={s.id} className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: s.color }} />
                {s.label}
              </div>
            ))}
            {liabilitySeries.map((s) => (
              <div key={s.id} className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: s.color }} />
                {s.label}
              </div>
            ))}
            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
              <span className="w-2.5 h-0.5 rounded-full bg-indigo-500 shrink-0" />
              Net Worth
            </div>
          </div>
        )}
        <ExpandableChart
          title="Net Worth Over Time"
          height={320}
          expandedHeight={500}
          renderChart={(h) => (
            <NetworthStackedChart
              data={chartData}
              assetSeries={assetSeries}
              liabilitySeries={liabilitySeries}
              height={h}
            />
          )}
        />
      </div>

      <SectionHeading>Breakdown ({activeMonthSlots[activeMonthSlots.length - 1].full})</SectionHeading>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
          <p className="text-xs font-semibold text-green-600 dark:text-green-400 mb-3">Assets</p>
          <DonutChart segments={assetSegments} height={200} emptyMessage="No assets recorded" />
          {assetSegments.length > 0 && (
            <div className="mt-3 space-y-1">
              {assetSegments.map((s) => (
                <div key={s.label} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: s.color }} />
                    <span className="text-gray-600 dark:text-gray-400 truncate max-w-32">{s.label}</span>
                  </div>
                  <span className="tabular-nums text-gray-700 dark:text-gray-300 ml-2">
                    {fmt(s.value)}{' '}
                    <span className="text-gray-400 dark:text-gray-600">
                      ({totalAssets > 0 ? Math.round((s.value / totalAssets) * 100) : 0}%)
                    </span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
          <p className="text-xs font-semibold text-red-500 dark:text-red-400 mb-3">Liabilities</p>
          <DonutChart segments={liabilitySegments} height={200} emptyMessage="No liabilities recorded" />
          {liabilitySegments.length > 0 && (
            <div className="mt-3 space-y-1">
              {liabilitySegments.map((s) => (
                <div key={s.label} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: s.color }} />
                    <span className="text-gray-600 dark:text-gray-400 truncate max-w-32">{s.label}</span>
                  </div>
                  <span className="tabular-nums text-gray-700 dark:text-gray-300 ml-2">
                    {fmt(s.value)}{' '}
                    <span className="text-gray-400 dark:text-gray-600">
                      ({totalLiabilities > 0 ? Math.round((s.value / totalLiabilities) * 100) : 0}%)
                    </span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <SectionHeading>Assets</SectionHeading>
      <div className="mb-8">
        <NetworthEntryTable
          type="asset"
          entries={data.networth.assets}
          monthSlots={activeMonthSlots}
          getValue={getValue}
          onAdd={() => addNetworthEntry('asset')}
          onUpdate={(id, patch) => updateNetworthEntry('asset', id, patch)}
          onRemove={(id) => removeNetworthEntry('asset', id)}
          onSetValue={(ym, entryId, amount) => setNetworthValue(ym, entryId, amount)}
        />
      </div>

      <SectionHeading>Liabilities</SectionHeading>
      <div className="mb-8">
        <NetworthEntryTable
          type="liability"
          entries={data.networth.liabilities}
          monthSlots={activeMonthSlots}
          getValue={getValue}
          onAdd={() => addNetworthEntry('liability')}
          onUpdate={(id, patch) => updateNetworthEntry('liability', id, patch)}
          onRemove={(id) => removeNetworthEntry('liability', id)}
          onSetValue={(ym, entryId, amount) => setNetworthValue(ym, entryId, amount)}
        />
      </div>

      <div className="bg-gray-100 dark:bg-gray-800/50 rounded-xl px-6 py-4 flex justify-between items-center">
        <span className="font-semibold text-gray-700 dark:text-gray-200">Net Worth</span>
        <span className={`text-xl font-bold tabular-nums ${networthColor}`}>
          {fmtCents(netWorth)}
        </span>
      </div>
    </div>
  )
}
