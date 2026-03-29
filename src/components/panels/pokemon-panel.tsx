'use client'

import React, { useState, useMemo } from 'react'

// ─── Collection data (from Sev's Colletr export, prices as of 2026-03-29) ─────

const SEALED = [
  { name: '151 Booster Bundle Display Cases', set: 'SV: 151', qty: 3, cost: 11433.33, market: 13404.64 },
  { name: 'Destined Rivals Booster Box Case', set: 'Destined Rivals', qty: 1, cost: 3150.00, market: 4498.64 },
  { name: 'Paldean Fates PC ETB Case', set: 'Paldean Fates', qty: 1, cost: 3000.00, market: 3218.29 },
  { name: 'Paldean Fates Booster Bundle Display', set: 'Paldean Fates', qty: 6, cost: 1875.00, market: 2118.03 },
  { name: 'Paldea Evolved ETB Case', set: 'Paldea Evolved', qty: 1, cost: 1700.00, market: 2412.77 },
  { name: '151 Booster Bundle Display', set: 'SV: 151', qty: 3, cost: 1966.67, market: 2784.48 },
  { name: 'Mega Evolution Enhanced Booster Box Cases', set: 'Mega Evolution', qty: 2, cost: 2302.50, market: 2138.20 },
  { name: 'Celebrations Ultra Premium Collection', set: 'Celebrations', qty: 1, cost: 1000.00, market: 1407.22 },
  { name: 'Surging Sparks PC ETB Case', set: 'Surging Sparks', qty: 1, cost: 1000.00, market: 1356.59 },
  { name: 'Shining Legends ETB', set: 'Shining Legends', qty: 1, cost: 800.00, market: 1172.19 },
  { name: 'Prismatic Evolutions Lucario/Tyranitar (Sam\'s Club)', set: 'Prismatic Evolutions', qty: 33, cost: 159.09, market: 256.47 },
  { name: 'Prismatic Evolutions Super Premium Collection', set: 'Prismatic Evolutions', qty: 6, cost: 304.17, market: 522.08 },
  { name: 'Obsidian Flames PC ETBs', set: 'Obsidian Flames', qty: 2, cost: 950.00, market: 890.95 },
  { name: 'XY Evolutions ETB [Mega Charizard Y]', set: 'Evolutions', qty: 1, cost: 625.00, market: 925.54 },
  { name: 'Evolving Skies Costco ETB w/ Tin', set: 'Evolving Skies', qty: 1, cost: 525.00, market: 822.33 },
  { name: 'Shrouded Fable PC ETB Case', set: 'Shrouded Fable', qty: 1, cost: 900.00, market: 817.62 },
  { name: 'Prismatic Evolutions PC ETB', set: 'Prismatic Evolutions', qty: 1, cost: 300.00, market: 755.37 },
  { name: 'Sword & Shield Charizard Ultra Premium', set: 'Lost Origin', qty: 1, cost: 440.00, market: 673.06 },
  { name: 'Fusion Strike PC ETBs', set: 'Fusion Strike', qty: 4, cost: 497.50, market: 674.91 },
  { name: 'Evolving Skies ETB', set: 'Evolving Skies', qty: 1, cost: 475.00, market: 686.74 },
  { name: 'Destined Rivals PC ETB (Exclusive)', set: 'Destined Rivals', qty: 1, cost: 300.00, market: 711.20 },
  { name: 'Celebrations PC ETB (Exclusive)', set: 'Celebrations', qty: 1, cost: 515.00, market: 701.35 },
  { name: 'Mega Evolution PC ETBs [Gardevoir]', set: 'Mega Evolution', qty: 12, cost: 231.92, market: 253.55 },
  { name: 'Mega Evolution PC ETBs [Lucario]', set: 'Mega Evolution', qty: 12, cost: 245.42, market: 253.46 },
  { name: 'Paldean Fates ETBs', set: 'Paldean Fates', qty: 5, cost: 320.00, market: 489.95 },
  { name: 'Brilliant Stars PC ETBs', set: 'Brilliant Stars', qty: 6, cost: 161.67, market: 282.78 },
  { name: 'Mega Evolution Enhanced Booster Boxes', set: 'Mega Evolution', qty: 5, cost: 336.20, market: 411.23 },
  { name: 'Prismatic Evolutions Booster Bundles', set: 'Prismatic Evolutions', qty: 15, cost: 47.00, market: 104.48 },
  { name: '151 Poster Collections', set: 'SV: 151', qty: 14, cost: 38.93, market: 109.88 },
  { name: 'Paldea Evolved Booster Boxes', set: 'Paldea Evolved', qty: 3, cost: 590.00, market: 633.99 },
  { name: 'McDonald\'s 2025 Promo Packs (JP)', set: 'McDonald\'s Promo (2025)', qty: 43, cost: 70.47, market: 42.74 },
  { name: 'Obsidian Flames ETBs', set: 'Obsidian Flames', qty: 6, cost: 205.00, market: 289.39 },
  { name: 'Black Bolt PC ETB', set: 'Black Bolt', qty: 1, cost: 175.00, market: 356.40 },
  { name: 'Unova Poster Collections', set: 'Black Bolt', qty: 15, cost: 42.00, market: 44.81 },
  { name: 'Phantasmal Flames PC ETB', set: 'Phantasmal Flames', qty: 2, cost: 450.00, market: 382.72 },
  { name: 'White Flare PC ETB', set: 'White Flare', qty: 1, cost: 175.00, market: 261.11 },
  { name: 'Journey Together PC ETBs', set: 'Journey Together', qty: 2, cost: 112.50, market: 222.49 },
]

const SLABS = [
  { name: 'Charizard ex 199/165 SIR', set: 'SV: 151', grade: 'PSA 10', cost: 0, market: 2449.05 },
  { name: 'Captain Pikachu (CN) 0709/09', set: 'Gem Pack', grade: 'PSA 10', cost: 0, market: 799.32 },
  { name: 'Reshiram & Charizard GX SM247', set: 'SM Promo', grade: 'CGC 10 Pristine', cost: 255.00, market: 546.67 },
  { name: 'Crown Zenith Pikachu 160/159', set: 'Crown Zenith', grade: 'PSA 10', cost: 220.00, market: 334.75 },
  { name: 'Charizard VMAX SV107/SV122 (x2)', set: 'Shining Fates', grade: 'PSA 10', cost: 470.00, market: 362.71 },
  { name: 'Venusaur & Snivy GX SM229', set: 'SM Promo', grade: 'PSA 10', cost: 580.00, market: 419.67 },
  { name: 'Kingdra ex 131 Promo (x3)', set: 'SV Promo', grade: 'PSA 10', cost: 450.00, market: 397.15 },
  { name: "Champion's Path Charizard VMAX 74/73", set: "Champion's Path", grade: 'PSA 10', cost: 435.00, market: 445.07 },
  { name: 'Obsidian Flames Charizard ex 215/197', set: 'Obsidian Flames', grade: 'PSA 10', cost: 160.00, market: 195.56 },
  { name: 'Darkness Ablaze Charizard VMAX', set: 'Darkness Ablaze', grade: 'PSA 10', cost: 180.00, market: 205.73 },
  { name: 'Meowth (JP) 192/SV-P', set: 'SV Promo JP', grade: 'PSA 10', cost: 0, market: 163.56 },
  { name: 'Scarlet & Violet Promo Charizard ex 056', set: 'SV Promo', grade: 'PSA 10', cost: 160.00, market: 138.47 },
  { name: 'Brilliant Stars Charizard VSTAR', set: 'Brilliant Stars', grade: 'PSA 10', cost: 100.00, market: 135.53 },
  { name: 'Crown Zenith Charizard VSTAR', set: 'Crown Zenith', grade: 'PSA 10', cost: 95.00, market: 129.26 },
  { name: 'Meowth VMAX SWSH005 (x2)', set: 'SWSH Promo', grade: 'PSA 10', cost: 102.50, market: 130.48 },
  { name: 'Alakazam ex 201/165 SIR', set: 'SV: 151', grade: 'Ungraded', cost: 0, market: 120.49 },
  { name: 'Paldean Fates Charizard ex 054/091', set: 'Paldean Fates', grade: 'PSA 10', cost: 90.00, market: 90.60 },
  { name: 'Mew ex 151/165', set: 'SV: 151', grade: 'PSA 10', cost: 80.00, market: 83.38 },
  { name: 'Meowth V SWSH004 (x2)', set: 'SWSH Promo', grade: 'PSA 10', cost: 70.00, market: 91.73 },
  { name: 'Lost Origin Charizard TG03', set: 'Lost Origin TG', grade: 'PSA 9', cost: 86.00, market: 46.78 },
]

const VINTAGE_GRADED = [
  { name: 'Venusaur #15 1st Ed Holo', grade: 'PSA 7', market: 2744.95 },
  { name: 'Unlimited Charizard #4', grade: 'CGC 9', market: 2223.76 },
  { name: 'Raichu #14 1st Ed Holo', grade: 'PSA 8', market: 2115.35 },
  { name: 'Chansey #3 1st Ed Holo', grade: 'PSA 8', market: 1930.50 },
  { name: 'Chansey #3 1st Ed Holo', grade: 'CGC 8.5', market: 1802.29 },
  { name: 'Charizard #4 1st Ed Holo', grade: 'CGC 5.5', market: 1801.33 },
  { name: 'Nidoking #11 1st Ed Holo', grade: 'PSA 8', market: 1642.80 },
  { name: 'Clefairy #5 1st Ed Holo', grade: 'PSA 8', market: 1632.81 },
  { name: 'Ninetales #12 1st Ed Holo', grade: 'PSA 8', market: 1629.60 },
  { name: 'Alakazam #1 1st Ed Holo', grade: 'CGC 7.5', market: 1389.85 },
  { name: 'Hitmonchan #7 1st Ed Holo', grade: 'PSA 8', market: 1386.58 },
  { name: 'Poliwrath #13 1st Ed Holo', grade: 'PSA 8', market: 1346.96 },
  { name: 'Unlimited Charizard #4', grade: 'PSA 7', market: 1045.61 },
  { name: 'Nidoking #11 1st Ed Holo', grade: 'CGC 8.5', market: 972.89 },
  { name: 'Magneton #9 1st Ed Holo', grade: 'PSA 8', market: 1181.37 },
  { name: 'Beedrill #17 1st Ed', grade: 'PSA 9', market: 903.40 },
  { name: 'Raichu #14 1st Ed Holo', grade: 'CGC 8', market: 868.66 },
  { name: 'Magneton #9 1st Ed Holo', grade: 'BGS 8.5', market: 833.91 },
  { name: 'Arcanine #23 1st Ed', grade: 'PSA 9', market: 625.43 },
  { name: 'Blastoise #2 Shadowless Holo', grade: 'CGC 7.5', market: 553.16 },
  { name: 'Chansey #3 1st Ed Holo', grade: 'Ungraded', market: 555.94 },
  { name: 'Unlimited Charizard #4', grade: 'CGC 6', market: 555.93 },
  { name: 'Unlimited Charizard #4', grade: 'CGC 5.5', market: 500.37 },
  { name: 'Dugtrio #19 1st Ed', grade: 'PSA 9', market: 500.35 },
  { name: 'Magikarp #35 1st Ed', grade: 'PSA 9', market: 478.75 },
  { name: 'Ivysaur #30 1st Ed', grade: 'BGS 9', market: 415.57 },
  { name: 'Wartortle #42 1st Ed', grade: 'PSA 8', market: 319.67 },
  { name: 'Charmeleon #24 1st Ed', grade: 'PSA 9', market: 590.69 },
  { name: 'Clefairy #5 1st Ed Holo', grade: 'CGC 7.5', market: 590.69 },
  { name: 'Pikachu Yellow Cheeks 1st Ed', grade: 'CGC 8.5', market: 277.97 },
  { name: 'Ivysaur #30 1st Ed', grade: 'CGC 8.5', market: 250.10 },
  { name: 'Onix #56 1st Ed', grade: 'PSA 9', market: 237.99 },
  { name: 'Poliwhirl #38 1st Ed', grade: 'PSA 9', market: 190.23 },
  { name: 'Charmander #46 1st Ed', grade: 'BGS 9', market: 171.27 },
  { name: 'Sandshrew #62 1st Ed', grade: 'PSA 9', market: 166.77 },
  { name: 'Machoke #34 1st Ed', grade: 'CGC 9', market: 208.48 },
  { name: 'Gastly #50 1st Ed', grade: 'PSA 9', market: 208.45 },
  { name: 'Pidgeotto #22 1st Ed', grade: 'CGC 8.5', market: 215.41 },
  { name: 'Machoke #34 1st Ed', grade: 'PSA 8', market: 150.56 },
  { name: 'Pikachu Yellow Cheeks 1st Ed', grade: 'CGC 7.5', market: 150.10 },
  { name: 'Diglett #47 1st Ed', grade: 'PSA 9', market: 132.04 },
  { name: 'Voltorb #67 1st Ed', grade: 'PSA 9', market: 137.60 },
  { name: 'Electabuzz #20 1st Ed', grade: 'CGC 8.5', market: 128.56 },
  { name: 'Electrode #21 1st Ed', grade: 'CGC 8', market: 138.98 },
  { name: 'Nidorino #37 1st Ed', grade: 'CGC 9', market: 138.98 },
  { name: 'Pidgey #57 1st Ed', grade: 'PSA 9', market: 112.58 },
  { name: 'Weedle #69 1st Ed', grade: 'CGC 8.5', market: 111.17 },
  { name: 'Raticate #40 1st Ed', grade: 'PSA 9', market: 105.38 },
  { name: 'Porygon #39 1st Ed', grade: 'CGC 8.5', market: 90.33 },
  { name: 'Vulpix #68 1st Ed', grade: 'CGC 8.5', market: 62.53 },
  { name: 'Magnemite #53 1st Ed', grade: 'CGC 8', market: 48.63 },
  { name: 'Tangela #66 1st Ed', grade: 'CGC 7.5', market: 41.68 },
  { name: 'Drowzee #49 1st Ed', grade: 'CGC 7.5', market: 40.31 },
  { name: 'Caterpie #45 1st Ed', grade: 'CGC 8', market: 37.53 },
  { name: 'Kakuna #33 1st Ed', grade: 'CGC 8.5', market: 36.58 },
  { name: 'Growlithe #28 1st Ed', grade: 'CGC 8.5', market: 14.59 },
]

// ─── Totals ────────────────────────────────────────────────────────────────

function calcTotal(items: { market: number; qty?: number }[]) {
  return items.reduce((sum, i) => sum + i.market * (i.qty ?? 1), 0)
}

const TOTALS = {
  sealed: calcTotal(SEALED),
  slabs: calcTotal(SLABS),
  vintage: calcTotal(VINTAGE_GRADED),
  singles: 2495, // base set singles portfolio (ungraded) - pre-calculated
  misc151: 31,   // 151 singles pocket change
}

const GRAND_TOTAL = Object.values(TOTALS).reduce((a, b) => a + b, 0)

// ─── Utils ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

function pnl(cost: number, market: number, qty = 1) {
  if (!cost) return null
  const diff = (market - cost) * qty
  const pct = ((market - cost) / cost) * 100
  return { diff, pct }
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className={`rounded-lg border border-border bg-card p-4 flex flex-col gap-1 ${color ? `border-l-4 ${color}` : ''}`}>
      <div className="text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
      <div className="text-2xl font-bold text-foreground">{value}</div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
    </div>
  )
}

function Badge({ text, variant = 'default' }: { text: string; variant?: 'default' | 'green' | 'red' | 'yellow' | 'blue' | 'purple' }) {
  const cls = {
    default: 'bg-secondary text-secondary-foreground',
    green: 'bg-green-900/40 text-green-400 border border-green-800/50',
    red: 'bg-red-900/40 text-red-400 border border-red-800/50',
    yellow: 'bg-yellow-900/40 text-yellow-400 border border-yellow-800/50',
    blue: 'bg-blue-900/40 text-blue-400 border border-blue-800/50',
    purple: 'bg-purple-900/40 text-purple-400 border border-purple-800/50',
  }[variant]
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${cls}`}>{text}</span>
}

// ─── Main Panel ─────────────────────────────────────────────────────────────

type Tab = 'overview' | 'slabs' | 'vintage' | 'sealed' | 'singles'

export function PokemonPanel() {
  const [tab, setTab] = useState<Tab>('overview')
  const [search, setSearch] = useState('')
  const [sortField, setSortField] = useState<'name' | 'market' | 'pnl'>('market')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const tabs: { id: Tab; label: string; emoji: string }[] = [
    { id: 'overview', label: 'Overview', emoji: '📊' },
    { id: 'vintage', label: 'Base Set', emoji: '🏆' },
    { id: 'slabs', label: 'Slabs', emoji: '💎' },
    { id: 'sealed', label: 'Sealed', emoji: '📦' },
    { id: 'singles', label: 'Singles', emoji: '🃏' },
  ]

  const sealedFiltered = useMemo(() => {
    let items = [...SEALED]
    if (search) items = items.filter(i => i.name.toLowerCase().includes(search.toLowerCase()) || i.set.toLowerCase().includes(search.toLowerCase()))
    items.sort((a, b) => {
      if (sortField === 'market') return sortDir === 'desc' ? b.market * b.qty - a.market * a.qty : a.market * a.qty - b.market * b.qty
      if (sortField === 'name') return sortDir === 'desc' ? b.name.localeCompare(a.name) : a.name.localeCompare(b.name)
      if (sortField === 'pnl') {
        const pa = (a.market - a.cost) * a.qty
        const pb = (b.market - b.cost) * b.qty
        return sortDir === 'desc' ? pb - pa : pa - pb
      }
      return 0
    })
    return items
  }, [search, sortField, sortDir])

  const slabsFiltered = useMemo(() => {
    let items = [...SLABS]
    if (search) items = items.filter(i => i.name.toLowerCase().includes(search.toLowerCase()) || i.set.toLowerCase().includes(search.toLowerCase()) || i.grade.toLowerCase().includes(search.toLowerCase()))
    items.sort((a, b) => sortDir === 'desc' ? b.market - a.market : a.market - b.market)
    return items
  }, [search, sortDir])

  const vintageFiltered = useMemo(() => {
    let items = [...VINTAGE_GRADED]
    if (search) items = items.filter(i => i.name.toLowerCase().includes(search.toLowerCase()) || i.grade.toLowerCase().includes(search.toLowerCase()))
    items.sort((a, b) => sortDir === 'desc' ? b.market - a.market : a.market - b.market)
    return items
  }, [search, sortDir])

  function toggleSort(field: typeof sortField) {
    if (sortField === field) setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    else { setSortField(field); setSortDir('desc') }
  }

  const sortIcon = (field: typeof sortField) => sortField === field ? (sortDir === 'desc' ? ' ↓' : ' ↑') : ''

  return (
    <div className="flex flex-col h-full bg-background text-foreground overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-border shrink-0">
        <span className="text-2xl">🎮</span>
        <div>
          <h1 className="text-lg font-bold text-foreground">Pokémon HQ</h1>
          <p className="text-xs text-muted-foreground">Sev's Collection Dashboard · Prices as of 2026-03-29</p>
        </div>
        <div className="ml-auto">
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Portfolio Value</div>
            <div className="text-xl font-bold text-green-400">{fmt(GRAND_TOTAL)}</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 px-4 pt-3 border-b border-border shrink-0">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => { setTab(t.id); setSearch('') }}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-t-lg transition-colors ${
              tab === t.id
                ? 'bg-primary/20 text-primary border-b-2 border-primary font-medium'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
            }`}
          >
            <span>{t.emoji}</span>
            <span>{t.label}</span>
          </button>
        ))}
        {tab !== 'overview' && (
          <div className="ml-auto mb-1">
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="h-7 px-3 rounded bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary w-48"
            />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">

        {/* ── OVERVIEW ── */}
        {tab === 'overview' && (
          <div className="space-y-6">
            {/* Stat cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
              <StatCard label="Grand Total" value={fmt(GRAND_TOTAL)} sub="All portfolios" color="border-l-green-500" />
              <StatCard label="Sealed Product" value={fmt(TOTALS.sealed)} sub={`${SEALED.length} lines`} color="border-l-blue-500" />
              <StatCard label="Modern Slabs" value={fmt(TOTALS.slabs)} sub={`${SLABS.length} slabs`} color="border-l-purple-500" />
              <StatCard label="Vintage Graded" value={fmt(TOTALS.vintage)} sub={`${VINTAGE_GRADED.length} slabs`} color="border-l-yellow-500" />
              <StatCard label="Base Set Singles" value={fmt(TOTALS.singles + TOTALS.misc151)} sub="Ungraded + misc" color="border-l-red-500" />
            </div>

            {/* Portfolio breakdown bar */}
            <div className="rounded-lg border border-border bg-card p-4 space-y-3">
              <div className="text-sm font-semibold text-foreground">Portfolio Breakdown</div>
              {[
                { label: 'Sealed Product', value: TOTALS.sealed, color: 'bg-blue-500' },
                { label: 'Vintage Graded (Base Set)', value: TOTALS.vintage, color: 'bg-yellow-500' },
                { label: 'Modern Slabs', value: TOTALS.slabs, color: 'bg-purple-500' },
                { label: 'Singles', value: TOTALS.singles + TOTALS.misc151, color: 'bg-red-500' },
              ].map(({ label, value, color }) => {
                const pct = (value / GRAND_TOTAL) * 100
                return (
                  <div key={label} className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{label}</span>
                      <span className="font-medium text-foreground">{fmt(value)} <span className="text-muted-foreground">({pct.toFixed(1)}%)</span></span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Top 10 by value */}
            <div className="rounded-lg border border-border bg-card p-4 space-y-3">
              <div className="text-sm font-semibold text-foreground">🔥 Top 10 Cards by Market Value</div>
              <div className="space-y-2">
                {[...VINTAGE_GRADED, ...SLABS]
                  .map(i => ({ name: i.name, market: i.market, grade: 'grade' in i ? (i as typeof SLABS[0]).grade : (i as typeof VINTAGE_GRADED[0]).grade }))
                  .sort((a, b) => b.market - a.market)
                  .slice(0, 10)
                  .map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground w-5 text-right">{idx + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-foreground truncate">{item.name}</div>
                        <div className="text-xs text-muted-foreground">{item.grade}</div>
                      </div>
                      <div className="text-sm font-semibold text-green-400 shrink-0">{fmt(item.market)}</div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Sealed top 5 */}
            <div className="rounded-lg border border-border bg-card p-4 space-y-3">
              <div className="text-sm font-semibold text-foreground">📦 Top Sealed Holdings</div>
              <div className="space-y-2">
                {[...SEALED]
                  .sort((a, b) => b.market * b.qty - a.market * a.qty)
                  .slice(0, 8)
                  .map((item, idx) => {
                    const totalMkt = item.market * item.qty
                    const totalCost = item.cost * item.qty
                    const gain = totalMkt - totalCost
                    return (
                      <div key={idx} className="flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-foreground truncate">{item.name}</div>
                          <div className="text-xs text-muted-foreground">qty: {item.qty} · {item.set}</div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-sm font-semibold text-foreground">{fmt(totalMkt)}</div>
                          {item.cost > 0 && (
                            <div className={`text-xs ${gain >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {gain >= 0 ? '+' : ''}{fmt(gain)}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
              </div>
            </div>
          </div>
        )}

        {/* ── VINTAGE GRADED ── */}
        {tab === 'vintage' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">{vintageFiltered.length} cards · {fmt(calcTotal(vintageFiltered))}</div>
              <button onClick={() => toggleSort('market')} className="text-xs text-muted-foreground hover:text-foreground">
                Value{sortIcon('market')}
              </button>
            </div>
            {vintageFiltered.map((item, idx) => (
              <div key={idx} className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground">{item.name}</div>
                </div>
                <Badge
                  text={item.grade}
                  variant={
                    item.grade.includes('PSA 9') || item.grade.includes('BGS 9') || item.grade.includes('CGC 9') ? 'green' :
                    item.grade.includes('PSA 8') || item.grade.includes('CGC 8') || item.grade.includes('BGS 8') ? 'blue' :
                    item.grade.includes('PSA 7') || item.grade.includes('CGC 7') ? 'yellow' : 'default'
                  }
                />
                <div className="text-sm font-semibold text-green-400 w-24 text-right">{fmt(item.market)}</div>
              </div>
            ))}
          </div>
        )}

        {/* ── SLABS ── */}
        {tab === 'slabs' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">{slabsFiltered.length} slabs · {fmt(calcTotal(slabsFiltered))}</div>
              <button onClick={() => toggleSort('market')} className="text-xs text-muted-foreground hover:text-foreground">
                Value{sortIcon('market')}
              </button>
            </div>
            {slabsFiltered.map((item, idx) => {
              const p = item.cost > 0 ? pnl(item.cost, item.market) : null
              return (
                <div key={idx} className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">{item.name}</div>
                    <div className="text-xs text-muted-foreground">{item.set}</div>
                  </div>
                  <Badge
                    text={item.grade}
                    variant={item.grade.includes('PSA 10') || item.grade.includes('CGC 10') ? 'green' : item.grade.includes('PSA 9') ? 'blue' : 'default'}
                  />
                  <div className="text-right shrink-0 w-28">
                    <div className="text-sm font-semibold text-green-400">{fmt(item.market)}</div>
                    {p && (
                      <div className={`text-xs ${p.diff >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {p.diff >= 0 ? '+' : ''}{fmt(p.diff)} ({p.pct >= 0 ? '+' : ''}{p.pct.toFixed(0)}%)
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ── SEALED ── */}
        {tab === 'sealed' && (
          <div className="space-y-2">
            <div className="flex items-center gap-4 mb-1">
              <div className="text-sm text-muted-foreground">{sealedFiltered.length} lines · {fmt(calcTotal(sealedFiltered.map(i => ({ market: i.market * i.qty }))))}</div>
              <div className="ml-auto flex gap-3 text-xs text-muted-foreground">
                <button onClick={() => toggleSort('name')} className="hover:text-foreground">Name{sortIcon('name')}</button>
                <button onClick={() => toggleSort('market')} className="hover:text-foreground">Value{sortIcon('market')}</button>
                <button onClick={() => toggleSort('pnl')} className="hover:text-foreground">P&L{sortIcon('pnl')}</button>
              </div>
            </div>
            {sealedFiltered.map((item, idx) => {
              const totalMkt = item.market * item.qty
              const totalCost = item.cost * item.qty
              const gain = totalCost > 0 ? totalMkt - totalCost : null
              const gainPct = totalCost > 0 ? ((item.market - item.cost) / item.cost) * 100 : null
              return (
                <div key={idx} className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">{item.name}</div>
                    <div className="text-xs text-muted-foreground">{item.set} · qty {item.qty}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-semibold text-foreground">{fmt(totalMkt)}</div>
                    {gain !== null && (
                      <div className={`text-xs ${gain >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {gain >= 0 ? '+' : ''}{fmt(gain)} ({gainPct! >= 0 ? '+' : ''}{gainPct!.toFixed(0)}%)
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ── SINGLES ── */}
        {tab === 'singles' && (
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
              Base Set 1st Edition, Shadowless, and Unlimited ungraded singles. Full detail in your Colletr CSV.
            </div>
            {[
              { label: '🥇 Top 1st Edition Ungraded', items: [
                { name: 'Beedrill #17 1st Ed', market: 216.26 },
                { name: 'Lass #75 1st Ed', market: 140.10 },
                { name: 'Charmander #46 1st Ed', market: 133.91 },
                { name: 'Kadabra #32 1st Ed', market: 83.66 },
                { name: 'Devolution Spray 1st Ed', market: 79.28 },
                { name: 'Pokemon Trader #77 1st Ed', market: 91.51 },
                { name: 'Double Colorless Energy ×3', market: 65.04 },
                { name: 'Haunter #29 1st Ed', market: 64.68 },
                { name: 'Machoke #34 1st Ed', market: 64.84 },
                { name: 'Professor Oak ×2 1st Ed', market: 64.21 },
              ]},
              { label: '⭐ Notable Shadowless', items: [
                { name: 'Pikachu Yellow Cheeks ×2 SL', market: 36.53 },
                { name: 'Wartortle #42 SL', market: 35.01 },
                { name: 'Squirtle #63 SL', market: 27.98 },
                { name: 'Bulbasaur #44 ×2 SL', market: 25.21 },
                { name: 'Magikarp #35 SL', market: 22.74 },
                { name: 'Growlithe #28 SL', market: 18.39 },
                { name: 'Haunter #29 ×2 SL', market: 14.45 },
                { name: 'Porygon #39 SL', market: 10.31 },
              ]},
              { label: '✨ Unlimited Highlights', items: [
                { name: 'Magneton #9 Holo ×2', market: 47.59 },
                { name: 'Scoop Up #78 ×2', market: 11.38 },
                { name: 'Dragonair #18', market: 18.76 },
                { name: 'Item Finder #74', market: 12.30 },
              ]},
            ].map(({ label, items }) => (
              <div key={label} className="rounded-lg border border-border bg-card p-4 space-y-3">
                <div className="text-sm font-semibold text-foreground">{label}</div>
                <div className="space-y-1.5">
                  {items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{item.name}</span>
                      <span className="text-green-400 font-medium">{fmt(item.market)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  )
}
