import { describe, it, expect } from 'vitest'
import { createGameState, tick, startGame } from '@/engine/game'
import { ARENA_CENTER, TIMER_START } from '@/engine/constants'

describe('game', () => {
  it('createGameState returns idle state', () => {
    const state = createGameState(0)
    expect(state.status).toBe('idle')
    expect(state.timer).toBe(TIMER_START)
    expect(state.scars).toEqual([])
    expect(state.enemies).toEqual([])
    expect(state.kills).toBe(0)
  })

  it('tick with idle status does nothing', () => {
    const state = createGameState(0)
    const input = { moveX: 1, moveY: 0, dashDirection: null }
    const next = tick(state, input)
    expect(next.player.position).toEqual(state.player.position)
  })

  it('tick with playing status moves player', () => {
    const state = startGame(createGameState(0))
    const input = { moveX: 1, moveY: 0, dashDirection: null }
    const next = tick(state, input)
    expect(next.player.position.x).toBeGreaterThan(ARENA_CENTER.x)
  })

  it('tick decreases timer when playing', () => {
    const state = startGame(createGameState(0))
    const input = { moveX: 0, moveY: 0, dashDirection: null }
    const next = tick(state, input)
    expect(next.timer).toBeLessThan(TIMER_START)
  })

  it('tick kills player when timer hits 0', () => {
    const state = { ...startGame(createGameState(0)), timer: 0.001 }
    const input = { moveX: 0, moveY: 0, dashDirection: null }
    const next = tick(state, input)
    expect(next.status).toBe('dead')
  })

  it('dash creates a scar when complete', () => {
    let state = startGame(createGameState(0))
    const input = { moveX: 0, moveY: 0, dashDirection: { x: 1, y: 0 } }
    state = tick(state, input)
    expect(state.player.isDashing).toBe(true)
    // Advance frames until dash completes
    for (let i = 0; i < 20; i++) {
      state = tick(state, { moveX: 0, moveY: 0, dashDirection: null })
    }
    expect(state.scars.length).toBe(1)
  })
})
