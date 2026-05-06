import type { Enemy, Vec2 } from './types'
import { sub, normalize, add, scale } from './vec2'
import { CANVAS_WIDTH, CANVAS_HEIGHT, ENEMY_RADIUS } from './constants'

export function spawnEnemy(id: number, speed: number): Enemy {
  // Spawn from a random edge of the rectangle
  const edge = Math.floor(Math.random() * 4)
  let position: Vec2
  switch (edge) {
    case 0: // top
      position = { x: Math.random() * CANVAS_WIDTH, y: -ENEMY_RADIUS }
      break
    case 1: // right
      position = { x: CANVAS_WIDTH + ENEMY_RADIUS, y: Math.random() * CANVAS_HEIGHT }
      break
    case 2: // bottom
      position = { x: Math.random() * CANVAS_WIDTH, y: CANVAS_HEIGHT + ENEMY_RADIUS }
      break
    default: // left
      position = { x: -ENEMY_RADIUS, y: Math.random() * CANVAS_HEIGHT }
      break
  }
  return {
    id,
    position,
    radius: ENEMY_RADIUS,
    speed,
    active: true,
  }
}

export function updateEnemies(enemies: Enemy[], playerPos: Vec2): Enemy[] {
  return enemies.map(enemy => {
    if (!enemy.active) return enemy
    const direction = normalize(sub(playerPos, enemy.position))
    const newPos = add(enemy.position, scale(direction, enemy.speed))
    return { ...enemy, position: newPos }
  })
}
