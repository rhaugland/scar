'use client'

import { useState, useCallback } from 'react'
import { CollectionGrid } from './CollectionGrid'
import { MonsterDetail } from './MonsterDetail'
import type { CollectedCard } from '@/engine/types'

interface CollectionTabProps {
  cards: CollectedCard[]
  onCardsChange: () => void
}

export function CollectionTab({ cards, onCardsChange }: CollectionTabProps) {
  const [selected, setSelected] = useState<CollectedCard | null>(null)

  const handleSelect = useCallback((card: CollectedCard) => {
    setSelected(card)
  }, [])

  const handleBack = useCallback(() => {
    setSelected(null)
  }, [])

  return (
    <div className="flex flex-col items-center h-full pt-6 pb-20 overflow-y-auto">
      <div className="flex items-center gap-3 mb-6">
        <h2 className="text-white font-mono text-2xl font-bold tracking-widest">
          COLLECTION
        </h2>
        <span className="text-white/30 font-mono text-sm">
          {cards.length}
        </span>
      </div>

      <CollectionGrid cards={cards} onSelect={handleSelect} />

      {selected && (
        <MonsterDetail
          card={selected}
          onBack={handleBack}
        />
      )}
    </div>
  )
}
