import { describe, it, expect } from 'vitest'
import { spawnEnemy, updateEnemies } from '@/engine/enemy'
import { CANVAS_WIDTH, CANVAS_HEIGHT, ENEMY_RADIUS, ENEMY_SPEED } from '@/engine/constants'

describe('enemy', () => {
  it('spawnEnemy creates enemy on canvas edge', () => {
    const enemy = spawnEnemy(0, ENEMY_SPEED)
    expect(enemy.active).toBe(true)
    expect(enemy.id).toBe(0)
    // Should be outside or on the canvas edge
    const onEdge =
      enemy.position.x <= 0 || enemy.position.x >= CANVAS_WIDTH ||
      enemy.position.y <= 0 || enemy.position.y >= CANVAS_HEIGHT
    expect(onEdge).toBe(true)
  })

  it('updateEnemies moves enemies toward player', () => {
    const playerPos = { x: 350, y: 350 }
    const enemy = {
      id: 0,
      position: { x: 450, y: 350 },
      radius: ENEMY_RADIUS,
      speed: ENEMY_SPEED,
      active: true,
    }
    const updated = updateEnemies([enemy], playerPos)
    expect(updated[0].position.x).toBeLessThan(enemy.position.x)
  })

  it('updateEnemies skips inactive enemies', () => {
    const enemy = {
      id: 0,
      position: { x: 500, y: 350 },
      radius: ENEMY_RADIUS,
      speed: ENEMY_SPEED,
      active: false,
    }
    const updated = updateEnemies([enemy], { x: 350, y: 350 })
    expect(updated[0].position).toEqual(enemy.position)
  })
})
