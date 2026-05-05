import { describe, it, expect } from 'vitest'
import { checkScarCollision, checkEnemyCollision, clampToBoundary } from '@/engine/collision'
import { ARENA_CENTER, ARENA_RADIUS, PLAYER_RADIUS, SCAR_WIDTH, ENEMY_RADIUS } from '@/engine/constants'

describe('collision', () => {
  describe('checkScarCollision', () => {
    it('returns true when player overlaps a scar', () => {
      const playerPos = { x: 350, y: 353 }
      const scars = [{ start: { x: 300, y: 350 }, end: { x: 400, y: 350 }, createdAt: 0, width: SCAR_WIDTH }]
      expect(checkScarCollision(playerPos, PLAYER_RADIUS, scars)).toBe(true)
    })

    it('returns false when player is far from scars', () => {
      const playerPos = { x: 350, y: 380 }
      const scars = [{ start: { x: 300, y: 350 }, end: { x: 400, y: 350 }, createdAt: 0, width: SCAR_WIDTH }]
      expect(checkScarCollision(playerPos, PLAYER_RADIUS, scars)).toBe(false)
    })

    it('returns false when scars array is empty', () => {
      expect(checkScarCollision({ x: 350, y: 350 }, PLAYER_RADIUS, [])).toBe(false)
    })
  })

  describe('checkEnemyCollision', () => {
    it('returns index of colliding enemy', () => {
      const playerPos = { x: 350, y: 350 }
      const enemies = [
        { id: 0, position: { x: 355, y: 350 }, radius: ENEMY_RADIUS, speed: 1.5, active: true },
      ]
      expect(checkEnemyCollision(playerPos, PLAYER_RADIUS, enemies)).toBe(0)
    })

    it('returns -1 when no collision', () => {
      const playerPos = { x: 350, y: 350 }
      const enemies = [
        { id: 0, position: { x: 400, y: 400 }, radius: ENEMY_RADIUS, speed: 1.5, active: true },
      ]
      expect(checkEnemyCollision(playerPos, PLAYER_RADIUS, enemies)).toBe(-1)
    })

    it('ignores inactive enemies', () => {
      const playerPos = { x: 350, y: 350 }
      const enemies = [
        { id: 0, position: { x: 355, y: 350 }, radius: ENEMY_RADIUS, speed: 1.5, active: false },
      ]
      expect(checkEnemyCollision(playerPos, PLAYER_RADIUS, enemies)).toBe(-1)
    })
  })

  describe('clampToBoundary', () => {
    it('returns same position when inside arena', () => {
      const pos = { x: 350, y: 350 }
      expect(clampToBoundary(pos, PLAYER_RADIUS)).toEqual(pos)
    })

    it('clamps position to arena edge when outside', () => {
      const pos = { x: 350, y: 700 }
      const clamped = clampToBoundary(pos, PLAYER_RADIUS)
      const dist = Math.sqrt((clamped.x - ARENA_CENTER.x) ** 2 + (clamped.y - ARENA_CENTER.y) ** 2)
      expect(dist).toBeCloseTo(ARENA_RADIUS - PLAYER_RADIUS)
    })
  })
})
