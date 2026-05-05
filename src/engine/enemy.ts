import type { Enemy, Vec2 } from './types'
import { sub, normalize, add, scale } from './vec2'
import { ARENA_CENTER, ARENA_RADIUS, ENEMY_RADIUS, ENEMY_SPEED, SPAWN_RATES } from './constants'

export function spawnEnemy(id: number): Enemy {
  const angle = Math.random() * Math.PI * 2
  const position: Vec2 = {
    x: ARENA_CENTER.x + Math.cos(angle) * ARENA_RADIUS,
    y: ARENA_CENTER.y + Math.sin(angle) * ARENA_RADIUS,
  }
  return {
    id,
    position,
    radius: ENEMY_RADIUS,
    speed: ENEMY_SPEED,
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

export function getSpawnInterval(elapsedSeconds: number): number {
  for (const rate of SPAWN_RATES) {
    if (elapsedSeconds < rate.until) return rate.interval
  }
  return SPAWN_RATES[SPAWN_RATES.length - 1].interval
}
