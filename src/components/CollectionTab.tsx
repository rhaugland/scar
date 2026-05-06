'use client'

import { useState, useCallback } from 'react'
import { CollectionGrid } from './CollectionGrid'
import { MonsterDetail } from './MonsterDetail'
import { removeMonster, getMonsters } from '@/lib/monsterStorage'
import type { Monster } from '@/engine/types'

interface CollectionTabProps {
  monsters: Monster[]
  onMonstersChange: () => void
}

export function CollectionTab({ monsters, onMonstersChange }: CollectionTabProps) {
  const [selected, setSelected] = useState<Monster | null>(null)

  const handleSelect = useCallback((monster: Monster) => {
    setSelected(monster)
  }, [])

  const handleBack = useCallback(() => {
    setSelected(null)
  }, [])

  const handleRelease = useCallback(() => {
    if (!selected) return
    removeMonster(selected.id)
    onMonstersChange()
    setSelected(null)
  }, [selected, onMonstersChange])

  return (
    <div className="flex flex-col items-center h-full pt-6 pb-20 overflow-y-auto">
      <div className="flex items-center gap-3 mb-6">
        <h2 className="text-white font-mono text-2xl font-bold tracking-widest">
          COLLECTION
        </h2>
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
