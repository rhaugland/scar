'use client'

import { useRef, useEffect, useCallback, useState } from 'react'
import type { GameState } from '@/engine/types'
import { createGameState, startGame, tick } from '@/engine/game'
import { render, renderDeathScreen, triggerScreenShake } from '@/engine/renderer'
import { KeyboardInput } from '@/input/keyboard'
import { TouchInput } from '@/input/touch'
import { CANVAS_SIZE } from '@/engine/constants'
import { getHighScore, setHighScore } from '@/lib/storage'

interface GameCanvasProps {
  onDeath: (state: GameState) => void
  onStart: () => void
}

export function GameCanvas({ onDeath, onStart }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stateRef = useRef<GameState>(createGameState(getHighScore()))
  const inputRef = useRef<KeyboardInput | TouchInput | null>(null)
  const rafRef = useRef<number>(0)
  const [gameStatus, setGameStatus] = useState<'idle' | 'playing' | 'dead'>('idle')

  const gameLoop = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const state = stateRef.current
    if (state.status === 'playing') {
      const input = inputRef.current?.getState() ?? { moveX: 0, moveY: 0, dashDirection: null }
      const prevKills = state.kills
      const newState = tick(state, input)

      // Screen shake on kill
      if (newState.kills > prevKills) {
        triggerScreenShake()
      }

      stateRef.current = newState

      if (newState.status === 'dead') {
        // Update high score
        if (newState.score > newState.highScore) {
          setHighScore(newState.score)
          stateRef.current = { ...newState, highScore: newState.score }
        }
        setGameStatus('dead')
        renderDeathScreen(ctx, stateRef.current)
        onDeath(stateRef.current)
        return
      }

      render(ctx, newState)
    } else if (state.status === 'dead') {
      renderDeathScreen(ctx, state)
      return
    }

    rafRef.current = requestAnimationFrame(gameLoop)
  }, [onDeath])

  const handleStart = useCallback(() => {
    stateRef.current = startGame(stateRef.current)
    setGameStatus('playing')
    // Consume the dash input from the start/restart click so it doesn't fire a dash
    inputRef.current?.getState()
    onStart()
    rafRef.current = requestAnimationFrame(gameLoop)
  }, [gameLoop, onStart])

  const handleRestart = useCallback(() => {
    handleStart()
  }, [handleStart])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Detect touch support
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0
    const handler = isTouchDevice ? new TouchInput() : new KeyboardInput()
    handler.attach(canvas)
    inputRef.current = handler

    return () => {
      handler.detach()
      cancelAnimationFrame(rafRef.current)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_SIZE}
      height={CANVAS_SIZE}
      className="w-full h-full max-w-[700px] max-h-[700px] aspect-square"
      style={{ imageRendering: 'pixelated' }}
      onClick={() => {
        if (gameStatus === 'idle') handleStart()
        else if (gameStatus === 'dead') handleRestart()
      }}
      tabIndex={0}
    />
  )
}
