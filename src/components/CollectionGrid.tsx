'use client'

import { useState } from 'react'
import type { CollectedCard, Tier } from '@/engine/types'
import { CardTile } from './CardTile'

type SortKey = 'newest' | 'tier' | 'name'

interface CollectionGridProps {
  cards: CollectedCard[]
  onSelect: (card: CollectedCard) => void
}

const TIER_RANK: Record<Tier, number> = { bronze: 1, silver: 2, gold: 3 }

function sortCards(cards: CollectedCard[], key: SortKey): CollectedCard[] {
  const sorted = [...cards]
  switch (key) {
    case 'newest':
      return sorted.sort((a, b) => b.unlockedAt - a.unlockedAt)
    case 'tier':
      return sorted.sort((a, b) => TIER_RANK[b.tier] - TIER_RANK[a.tier])
    case 'name':
      return sorted.sort((a, b) => a.name.localeCompare(b.name))
  }
}

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'newest', label: 'NEWEST' },
  { key: 'tier', label: 'TIER' },
  { key: 'name', label: 'NAME' },
]

export function CollectionGrid({ cards, onSelect }: CollectionGridProps) {
  const [sortKey, setSortKey] = useState<SortKey>('newest')
  const sorted = sortCards(cards, sortKey)

  return (
    <div className="flex flex-col gap-4 w-full max-w-[700px] mx-auto px-4">
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

      {sorted.length === 0 ? (
        <p className="text-white/30 font-mono text-sm text-center mt-12">
          No cards yet. Play to unlock today&apos;s card!
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {sorted.map(card => (
            <CardTile
              key={card.date}
              card={card}
              onClick={() => onSelect(card)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
