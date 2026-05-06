'use client'

import { useState, useCallback, useEffect } from 'react'
import { GameCanvas } from '@/components/GameCanvas'
import { StartScreen } from '@/components/StartScreen'
import { DeathScreen } from '@/components/DeathScreen'
import { HatchingScreen } from '@/components/HatchingScreen'
import { TabBar } from '@/components/TabBar'
import { CollectionTab } from '@/components/CollectionTab'
import { BattleTab } from '@/components/BattleTab'
import { shareArenaPainting } from '@/lib/share'
import { getHighScore } from '@/lib/storage'
import { addMonster, getMonsterCount, getMonsters } from '@/lib/monsterStorage'
import type { GameState, Monster } from '@/engine/types'

type Tab = 'play' | 'collection' | 'battle'

export default function Home() {
  const [tab, setTab] = useState<Tab>('play')
  const [screen, setScreen] = useState<'start' | 'playing' | 'hatching' | 'dead'>('start')
  const [deathState, setDeathState] = useState<GameState | null>(null)
  const [highScore, setHighScore] = useState(0)
  const [monsterCount, setMonsterCount] = useState(0)
  const [monsters, setMonsters] = useState<Monster[]>([])

  const refreshMonsters = useCallback(() => {
    setMonsters(getMonsters())
    setMonsterCount(getMonsterCount())
  }, [])

  useEffect(() => {
    setHighScore(getHighScore())
    refreshMonsters()
  }, [refreshMonsters])

  const handleStart = useCallback(() => {
    setScreen('playing')
  }, [])

  const handleHatching = useCallback((state: GameState) => {
    setDeathState(state)
    setHighScore(state.highScore)
    setScreen('hatching')
  }, [])

  const handleDeath = useCallback((state: GameState) => {
    setDeathState(state)
    setHighScore(state.highScore)
    setScreen('dead')
  }, [])

  const handleAddMonster = useCallback((monster: Monster) => {
    addMonster(monster)
    refreshMonsters()
    setScreen('dead')
  }, [refreshMonsters])

  const handleSkipMonster = useCallback(() => {
    setScreen('dead')
  }, [])

  const handleRestart = useCallback(() => {
    setScreen('playing')
    const canvas = document.querySelector('canvas')
    canvas?.click()
  }, [])

  const handleShare = useCallback(() => {
    const canvas = document.querySelector('canvas')
    if (canvas && deathState) {
      shareArenaPainting(canvas, deathState.score, deathState.kills)
    }
  }, [deathState])

  const handleTabChange = useCallback((newTab: Tab) => {
    setTab(newTab)
    if (newTab === 'collection') refreshMonsters()
  }, [refreshMonsters])

  return (
    <div className="w-screen h-screen bg-black relative overflow-hidden">
      {/* Play tab */}
      <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-200 ${tab === 'play' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
        <GameCanvas onDeath={handleDeath} onHatching={handleHatching} onStart={handleStart} />

        {screen === 'start' && (
          <StartScreen highScore={highScore} onStart={handleStart} monsterCount={monsterCount} />
        )}

        {screen === 'hatching' && deathState && (
          <HatchingScreen
            scars={deathState.scars}
            level={deathState.level}
            kills={deathState.kills}
            lineColor={deathState.lineColor}
            onAddMonster={handleAddMonster}
            onSkip={handleSkipMonster}
          />
        )}

        {screen === 'dead' && deathState && (
          <DeathScreen
            score={deathState.score}
            kills={deathState.kills}
            level={deathState.level}
            highScore={deathState.highScore}
            isNewHighScore={deathState.score >= deathState.highScore}
            onRestart={handleRestart}
            onShare={handleShare}
          />
        )}
      </div>

      {/* Collection tab */}
      <div className={`absolute inset-0 transition-opacity duration-200 ${tab === 'collection' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
        <CollectionTab monsters={monsters} onMonstersChange={refreshMonsters} />
      </div>

      {/* Battle tab */}
      <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-200 ${tab === 'battle' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
        <BattleTab />
      </div>

      {/* Tab bar */}
      <TabBar active={tab} onChange={handleTabChange} monsterCount={monsterCount} />
    </div>
  )
}
