'use client'

import { useState, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { CollectionGrid } from '@/components/CollectionGrid'
import { MonsterDetail } from '@/components/MonsterDetail'
import { getMonsters, removeMonster } from '@/lib/monsterStorage'
import type { Monster } from '@/engine/types'

export default function CollectionPage() {
  const [monsters, setMonsters] = useState<Monster[]>([])
  const [selected, setSelected] = useState<Monster | null>(null)

  useEffect(() => {
    setMonsters(getMonsters())
  }, [])

  const handleSelect = useCallback((monster: Monster) => {
    setSelected(monster)
  }, [])

  const handleBack = useCallback(() => {
    setSelected(null)
  }, [])

  const handleRelease = useCallback(() => {
    if (!selected) return
    removeMonster(selected.id)
    setMonsters(getMonsters())
    setSelected(null)
  }, [selected])

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
          {monsters.length}/50
        </span>
      </div>

      <CollectionGrid monsters={monsters} onSelect={handleSelect} />

      {selected && (
        <MonsterDetail
          monster={selected}
          onRelease={handleRelease}
          onBack={handleBack}
        />
      )}
    </div>
  )
}
