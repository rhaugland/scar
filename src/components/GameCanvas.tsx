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
      // Update player position for dash direction calculation
      const handler = inputRef.current
      if (handler && 'setPlayerPos' in handler) {
        (handler as KeyboardInput).setPlayerPos(state.player.position)
      }
      const input = handler?.getState() ?? { moveX: 0, moveY: 0, dashDirection: null }
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
        inputRef.current?.disable()
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
    // Disable input briefly so the start/restart click doesn't fire a dash
    inputRef.current?.disable()
    // Focus canvas for keyboard input
    canvasRef.current?.focus()
    onStart()
    rafRef.current = requestAnimationFrame(gameLoop)
    // Enable dash input after 300ms (well after the click event finishes propagating)
    setTimeout(() => {
      inputRef.current?.enable()
    }, 300)
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

  // Handle clicks: start/restart when not playing, dash passthrough when playing
  const handleCanvasClick = useCallback(() => {
    if (gameStatus === 'idle') {
      handleStart()
    } else if (gameStatus === 'dead') {
      handleRestart()
    }
    // When 'playing', do nothing — let the KeyboardInput's native listener handle dash
  }, [gameStatus, handleStart, handleRestart])

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_SIZE}
      height={CANVAS_SIZE}
      className="w-full h-full max-w-[700px] max-h-[700px] aspect-square cursor-crosshair"
      onClick={handleCanvasClick}
      onFocus={() => {}} // ensure focusable
      tabIndex={0}
    />
  )
}
