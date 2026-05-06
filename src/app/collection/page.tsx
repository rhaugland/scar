'use client'

import { useState, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { CollectionGrid } from '@/components/CollectionGrid'
import { MonsterDetail } from '@/components/MonsterDetail'
import { getCards } from '@/lib/cardStorage'
import type { CollectedCard } from '@/engine/types'

export default function CollectionPage() {
  const [cards, setCards] = useState<CollectedCard[]>([])
  const [selected, setSelected] = useState<CollectedCard | null>(null)

  useEffect(() => {
    setCards(getCards())
  }, [])

  const handleSelect = useCallback((card: CollectedCard) => {
    setSelected(card)
  }, [])

  const handleBack = useCallback(() => {
    setSelected(null)
  }, [])

  return (
    <div className="min-h-screen bg-black flex flex-col items-center py-8">
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/"
          className="text-white/40 font-mono text-sm hover:text-white/60 transition-colors"
        >
          &larr; BACK
        </Link>
        <h1 className="text-white font-mono text-2xl font-bold tracking-widest">
          COLLECTION
        </h1>
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
