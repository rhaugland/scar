import { describe, it, expect } from 'vitest'
import { spawnEnemy, updateEnemies, getSpawnInterval } from '@/engine/enemy'
import { ARENA_CENTER, ARENA_RADIUS, ENEMY_SPEED } from '@/engine/constants'

describe('enemy', () => {
  it('spawnEnemy creates enemy on arena rim', () => {
    const enemy = spawnEnemy(0)
    const dist = Math.sqrt(
      (enemy.position.x - ARENA_CENTER.x) ** 2 +
      (enemy.position.y - ARENA_CENTER.y) ** 2
    )
    expect(dist).toBeCloseTo(ARENA_RADIUS, 0)
    expect(enemy.active).toBe(true)
    expect(enemy.id).toBe(0)
  })

  it('updateEnemies moves enemies toward player', () => {
    const enemy = {
      id: 0,
      position: { x: ARENA_CENTER.x + 100, y: ARENA_CENTER.y },
      radius: 10,
      speed: ENEMY_SPEED,
      active: true,
    }
    const updated = updateEnemies([enemy], ARENA_CENTER)
    expect(updated[0].position.x).toBeLessThan(enemy.position.x)
  })

  it('updateEnemies skips inactive enemies', () => {
    const enemy = {
      id: 0,
      position: { x: 500, y: 350 },
      radius: 10,
      speed: ENEMY_SPEED,
      active: false,
    }
    const updated = updateEnemies([enemy], ARENA_CENTER)
    expect(updated[0].position).toEqual(enemy.position)
  })

  it('getSpawnInterval returns correct rate for elapsed time', () => {
    expect(getSpawnInterval(5)).toBe(2.0)
    expect(getSpawnInterval(20)).toBe(1.5)
    expect(getSpawnInterval(40)).toBe(1.0)
    expect(getSpawnInterval(90)).toBe(0.7)
  })
})
