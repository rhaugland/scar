import { describe, it, expect } from 'vitest'
import { createGameState, tick, startGame } from '@/engine/game'
import { createScar } from '@/engine/scar'
import { ARENA_CENTER, TIMER_START, PLAYER_MAX_LIVES } from '@/engine/constants'

describe('game', () => {
  it('createGameState returns idle state', () => {
    const state = createGameState(0)
    expect(state.status).toBe('idle')
    expect(state.timer).toBe(TIMER_START)
    expect(state.scars).toEqual([])
    expect(state.enemies).toEqual([])
    expect(state.kills).toBe(0)
    expect(state.lives).toBe(PLAYER_MAX_LIVES)
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
    for (let i = 0; i < 20; i++) {
      state = tick(state, { moveX: 0, moveY: 0, dashDirection: null })
    }
    expect(state.scars.length).toBe(1)
  })

  it('movement leaves trail scars', () => {
    let state = startGame(createGameState(0))
    // Move right for enough frames to create trail segments
    for (let i = 0; i < 30; i++) {
      state = tick(state, { moveX: 1, moveY: 0, dashDirection: null })
    }
    expect(state.scars.length).toBeGreaterThan(0)
  })

  it('scar hit removes a life instead of instant death', () => {
    let state = startGame(createGameState(0))
    // Place enough scars so they pass the TRAIL_SAFE_SEGMENTS check
    // Put a dangerous scar ahead of the player
    const dangerScar = createScar({ x: 360, y: 350 }, { x: 380, y: 350 })
    const dummyScars = [
      createScar({ x: 0, y: 0 }, { x: 1, y: 0 }),
      createScar({ x: 0, y: 0 }, { x: 1, y: 0 }),
      createScar({ x: 0, y: 0 }, { x: 1, y: 0 }),
    ]
    state = { ...state, scars: [dangerScar, ...dummyScars], invulnFrames: 0, lastTrailPos: { ...state.player.position } }
    // Move into the scar
    for (let i = 0; i < 10; i++) {
      state = tick(state, { moveX: 1, moveY: 0, dashDirection: null })
      if (state.lives < PLAYER_MAX_LIVES) break
    }
    expect(state.lives).toBe(PLAYER_MAX_LIVES - 1)
    expect(state.status).toBe('playing') // not dead yet
  })
})
