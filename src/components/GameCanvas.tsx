'use client'

import { useRef, useEffect, useCallback, useState } from 'react'
import type { GameState } from '@/engine/types'
import { createGameState, startGame, tick, togglePause, changeLineColor, nextLevel } from '@/engine/game'
import { render, renderDeathScreen, triggerScreenShake } from '@/engine/renderer'
import { KeyboardInput } from '@/input/keyboard'
import { TouchInput } from '@/input/touch'
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '@/engine/constants'
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
  const [gameStatus, setGameStatus] = useState<'idle' | 'playing' | 'paused' | 'dead' | 'level-complete'>('idle')

  const gameLoop = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const state = stateRef.current

    if (state.status === 'playing') {
      const handler = inputRef.current
      if (handler && 'setPlayerPos' in handler) {
        (handler as KeyboardInput).setPlayerPos(state.player.position)
      }
      const input = handler?.getState() ?? { moveX: 0, moveY: 0, dashDirection: null }
      const prevKills = state.kills
      const newState = tick(state, input)

      if (newState.kills > prevKills) {
        triggerScreenShake()
      }

      stateRef.current = newState

      if (newState.status === 'dead') {
        if (newState.score > newState.highScore) {
          setHighScore(newState.score)
          stateRef.current = { ...newState, highScore: newState.score }
        }
        setGameStatus('dead')
        inputRef.current?.disable()
        renderDeathScreen(ctx, stateRef.current)
        onDeath(stateRef.current)
        return
      }

      if (newState.status === 'level-complete') {
        setGameStatus('level-complete')
        render(ctx, newState)
        return // stop RAF, wait for click
      }

      render(ctx, newState)
    } else if (state.status === 'paused') {
      render(ctx, state)
      return
    } else if (state.status === 'dead') {
      renderDeathScreen(ctx, state)
      return
    } else if (state.status === 'level-complete') {
      render(ctx, state)
      return
    }

    rafRef.current = requestAnimationFrame(gameLoop)
  }, [onDeath])

  const handleStart = useCallback(() => {
    stateRef.current = startGame(stateRef.current)
    setGameStatus('playing')
    inputRef.current?.disable()
    canvasRef.current?.focus()
    onStart()
    rafRef.current = requestAnimationFrame(gameLoop)
    setTimeout(() => {
      inputRef.current?.enable()
    }, 300)
  }, [gameLoop, onStart])

  const handleRestart = useCallback(() => {
    handleStart()
  }, [handleStart])

  // Keyboard handler for pause + color change
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase()

      // Space = pause/unpause
      if (key === ' ' || key === 'escape') {
        e.preventDefault()
        const state = stateRef.current
        if (state.status === 'playing' || state.status === 'paused') {
          stateRef.current = togglePause(state)
          const newStatus = stateRef.current.status
          setGameStatus(newStatus as 'playing' | 'paused')

          if (newStatus === 'playing') {
            // Resume game loop
            rafRef.current = requestAnimationFrame(gameLoop)
          } else {
            // Render pause screen
            const canvas = canvasRef.current
            const ctx = canvas?.getContext('2d')
            if (ctx) render(ctx, stateRef.current)
          }
        }
      }

      // C = change line color (only while paused)
      if (key === 'c' && stateRef.current.status === 'paused') {
        stateRef.current = changeLineColor(stateRef.current)
        const canvas = canvasRef.current
        const ctx = canvas?.getContext('2d')
        if (ctx) render(ctx, stateRef.current)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [gameLoop])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0
    const handler = isTouchDevice ? new TouchInput() : new KeyboardInput()
    handler.attach(canvas)
    inputRef.current = handler

    return () => {
      handler.detach()
      cancelAnimationFrame(rafRef.current)
    }
  }, [])

  const handleNextLevel = useCallback(() => {
    stateRef.current = nextLevel(stateRef.current)
    setGameStatus('playing')
    inputRef.current?.disable()
    rafRef.current = requestAnimationFrame(gameLoop)
    setTimeout(() => { inputRef.current?.enable() }, 300)
  }, [gameLoop])

  const handleCanvasClick = useCallback(() => {
    if (gameStatus === 'idle') {
      handleStart()
    } else if (gameStatus === 'dead') {
      handleRestart()
    } else if (gameStatus === 'level-complete') {
      handleNextLevel()
    }
  }, [gameStatus, handleStart, handleRestart, handleNextLevel])

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_WIDTH}
      height={CANVAS_HEIGHT}
      className="w-full h-full max-w-[700px] max-h-[700px] aspect-square cursor-crosshair"
      onClick={handleCanvasClick}
      tabIndex={0}
    />
  )
}
