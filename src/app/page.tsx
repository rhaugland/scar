'use client'

import { useState, useCallback, useEffect } from 'react'
import { GameCanvas } from '@/components/GameCanvas'
import { StartScreen } from '@/components/StartScreen'
import { DeathScreen } from '@/components/DeathScreen'
import { HatchingScreen } from '@/components/HatchingScreen'
import { shareArenaPainting } from '@/lib/share'
import { getHighScore } from '@/lib/storage'
import { addMonster, getMonsterCount } from '@/lib/monsterStorage'
import type { GameState, Monster } from '@/engine/types'

export default function Home() {
  const [screen, setScreen] = useState<'start' | 'playing' | 'hatching' | 'dead'>('start')
  const [deathState, setDeathState] = useState<GameState | null>(null)
  const [highScore, setHighScore] = useState(0)
  const [monsterCount, setMonsterCount] = useState(0)
  useEffect(() => {
    setHighScore(getHighScore())
    setMonsterCount(getMonsterCount())
  }, [])

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
    setMonsterCount(getMonsterCount())
    setScreen('dead')
  }, [])

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

  return (
    <div className="w-screen h-screen flex items-center justify-center bg-black relative">
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
  )
}
