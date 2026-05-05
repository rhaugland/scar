'use client'

import { useState, useCallback, useEffect } from 'react'
import { GameCanvas } from '@/components/GameCanvas'
import { StartScreen } from '@/components/StartScreen'
import { DeathScreen } from '@/components/DeathScreen'
import { shareArenaPainting } from '@/lib/share'
import { getHighScore } from '@/lib/storage'
import type { GameState } from '@/engine/types'

export default function Home() {
  const [screen, setScreen] = useState<'start' | 'playing' | 'dead'>('start')
  const [deathState, setDeathState] = useState<GameState | null>(null)
  const [highScore, setHighScore] = useState(0)
  useEffect(() => { setHighScore(getHighScore()) }, [])

  const handleStart = useCallback(() => {
    setScreen('playing')
  }, [])

  const handleDeath = useCallback((state: GameState) => {
    setDeathState(state)
    setHighScore(state.highScore)
    setScreen('dead')
  }, [])

  const handleRestart = useCallback(() => {
    setScreen('playing')
    // Trigger canvas click to restart game loop
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
      <GameCanvas onDeath={handleDeath} onStart={handleStart} />

      {screen === 'start' && (
        <StartScreen highScore={highScore} onStart={handleStart} />
      )}

      {screen === 'dead' && deathState && (
        <DeathScreen
          score={deathState.score}
          kills={deathState.kills}
          highScore={deathState.highScore}
          isNewHighScore={deathState.score >= deathState.highScore}
          onRestart={handleRestart}
          onShare={handleShare}
        />
      )}
    </div>
  )
}
