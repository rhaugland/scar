'use client'

import { useState } from 'react'
import type { Monster } from '@/engine/types'
import { MonsterCard } from './MonsterCard'

type SortKey = 'newest' | 'hp' | 'attack' | 'level'

interface CollectionGridProps {
  monsters: Monster[]
  onSelect: (monster: Monster) => void
}

function sortMonsters(monsters: Monster[], key: SortKey): Monster[] {
  const sorted = [...monsters]
  switch (key) {
    case 'newest':
      return sorted.sort((a, b) => b.createdAt - a.createdAt)
    case 'hp':
      return sorted.sort((a, b) => b.stats.hp - a.stats.hp)
    case 'attack':
      return sorted.sort((a, b) => b.stats.attack - a.stats.attack)
    case 'level':
      return sorted.sort((a, b) => b.level - a.level)
  }
}

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'newest', label: 'NEWEST' },
  { key: 'hp', label: 'HP' },
  { key: 'attack', label: 'ATK' },
  { key: 'level', label: 'LVL' },
]

export function CollectionGrid({ monsters, onSelect }: CollectionGridProps) {
  const [sortKey, setSortKey] = useState<SortKey>('newest')
  const sorted = sortMonsters(monsters, sortKey)

  return (
    <div className="flex flex-col gap-4 w-full max-w-[700px] mx-auto px-4">
      {/* Sort bar */}
      <div className="flex gap-2 justify-center">
        {SORT_OPTIONS.map(opt => (
          <button
            key={opt.key}
            onClick={() => setSortKey(opt.key)}
            className={`font-mono text-xs px-3 py-1 border transition-colors ${
              sortKey === opt.key
                ? 'border-pink-500/60 text-pink-400'
                : 'border-white/10 text-white/30 hover:border-white/30'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      {sorted.length === 0 ? (
        <p className="text-white/30 font-mono text-sm text-center mt-12">
          No monsters yet. Play SCAR to create your first!
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {sorted.map(monster => (
            <MonsterCard
              key={monster.id}
              monster={monster}
              onClick={() => onSelect(monster)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
