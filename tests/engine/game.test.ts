import { describe, it, expect } from 'vitest'
import { createGameState, tick, startGame, togglePause, changeLineColor } from '@/engine/game'
import { createScar } from '@/engine/scar'
import { ARENA_CENTER, PLAYER_MAX_LIVES, LINE_COLORS } from '@/engine/constants'

describe('game', () => {
  it('createGameState returns idle state with 5 lives', () => {
    const state = createGameState(0)
    expect(state.status).toBe('idle')
    expect(state.elapsed).toBe(0)
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

  it('tick increases elapsed time when playing', () => {
    const state = startGame(createGameState(0))
    const input = { moveX: 0, moveY: 0, dashDirection: null }
    const next = tick(state, input)
    expect(next.elapsed).toBeGreaterThan(0)
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
    for (let i = 0; i < 30; i++) {
      state = tick(state, { moveX: 1, moveY: 0, dashDirection: null })
    }
    expect(state.scars.length).toBeGreaterThan(0)
  })

  it('scar hit removes a life instead of instant death', () => {
    let state = startGame(createGameState(0))
    const dangerScar = createScar({ x: 360, y: 350 }, { x: 380, y: 350 })
    const dummyScars = [
      createScar({ x: 0, y: 0 }, { x: 1, y: 0 }),
      createScar({ x: 0, y: 0 }, { x: 1, y: 0 }),
      createScar({ x: 0, y: 0 }, { x: 1, y: 0 }),
    ]
    state = { ...state, scars: [dangerScar, ...dummyScars], invulnFrames: 0, lastTrailPos: { ...state.player.position } }
    for (let i = 0; i < 10; i++) {
      state = tick(state, { moveX: 1, moveY: 0, dashDirection: null })
      if (state.lives < PLAYER_MAX_LIVES) break
    }
    expect(state.lives).toBe(PLAYER_MAX_LIVES - 1)
    expect(state.status).toBe('playing')
  })

  it('togglePause switches between playing and paused', () => {
    const state = startGame(createGameState(0))
    const paused = togglePause(state)
    expect(paused.status).toBe('paused')
    const resumed = togglePause(paused)
    expect(resumed.status).toBe('playing')
  })

  it('changeLineColor cycles through colors', () => {
    let state = startGame(createGameState(0))
    expect(state.lineColor).toBe(LINE_COLORS[0])
    state = changeLineColor(state)
    expect(state.lineColor).toBe(LINE_COLORS[1])
  })
})
