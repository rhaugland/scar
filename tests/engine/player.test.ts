import { describe, it, expect } from 'vitest'
import { createPlayer, movePlayer, startDash, updateDash } from '@/engine/player'
import { ARENA_CENTER, PLAYER_SPEED, DASH_DISTANCE, DASH_DURATION } from '@/engine/constants'

describe('player', () => {
  it('createPlayer places player at arena center', () => {
    const player = createPlayer()
    expect(player.position).toEqual(ARENA_CENTER)
    expect(player.isDashing).toBe(false)
    expect(player.rotation).toBe(0)
  })

  it('movePlayer moves by input * speed', () => {
    const player = createPlayer()
    const moved = movePlayer(player, { moveX: 1, moveY: 0, dashDirection: null })
    expect(moved.position.x).toBeCloseTo(ARENA_CENTER.x + PLAYER_SPEED)
    expect(moved.position.y).toBeCloseTo(ARENA_CENTER.y)
  })

  it('movePlayer does not move during dash', () => {
    const player = { ...createPlayer(), isDashing: true }
    const moved = movePlayer(player, { moveX: 1, moveY: 0, dashDirection: null })
    expect(moved.position).toEqual(player.position)
  })

  it('movePlayer updates rotation when moving', () => {
    const player = createPlayer()
    const moved = movePlayer(player, { moveX: 0, moveY: -1, dashDirection: null })
    expect(moved.rotation).toBeCloseTo(-Math.PI / 2)
  })

  it('startDash sets dash state correctly', () => {
    const player = createPlayer()
    const dashing = startDash(player, { x: 1, y: 0 })
    expect(dashing.isDashing).toBe(true)
    expect(dashing.dashStart).toEqual(ARENA_CENTER)
    expect(dashing.dashEnd!.x).toBeCloseTo(ARENA_CENTER.x + DASH_DISTANCE)
    expect(dashing.dashEnd!.y).toBeCloseTo(ARENA_CENTER.y)
    expect(dashing.dashProgress).toBe(0)
  })

  it('updateDash advances progress', () => {
    const player = startDash(createPlayer(), { x: 1, y: 0 })
    const updated = updateDash(player)
    expect(updated.dashProgress).toBeCloseTo(1 / DASH_DURATION)
  })

  it('updateDash completes dash at progress 1', () => {
    let player = startDash(createPlayer(), { x: 1, y: 0 })
    for (let i = 0; i < DASH_DURATION; i++) {
      player = updateDash(player)
    }
    expect(player.isDashing).toBe(false)
    expect(player.position).toEqual(player.dashEnd)
  })
})
