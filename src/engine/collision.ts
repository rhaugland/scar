import type { Vec2, Scar, Enemy, Goal } from './types'
import { distance, pointToSegmentDistance } from './vec2'
import { CANVAS_WIDTH, CANVAS_HEIGHT } from './constants'

export function checkScarCollision(playerPos: Vec2, playerRadius: number, scars: Scar[]): boolean {
  for (const scar of scars) {
    const dist = pointToSegmentDistance(playerPos, scar.start, scar.end)
    if (dist < scar.width / 2 + playerRadius) {
      return true
    }
  }
  return false
}

export function checkEnemyCollision(playerPos: Vec2, playerRadius: number, enemies: Enemy[]): number {
  for (let i = 0; i < enemies.length; i++) {
    const enemy = enemies[i]
    if (!enemy.active) continue
    const dist = distance(playerPos, enemy.position)
    if (dist < playerRadius + enemy.radius) {
      return i
    }
  }
  return -1
}

export function checkDashKills(dashStart: Vec2, dashEnd: Vec2, killRadius: number, enemies: Enemy[]): number[] {
  const killed: number[] = []
  for (let i = 0; i < enemies.length; i++) {
    const enemy = enemies[i]
    if (!enemy.active) continue
    const dist = pointToSegmentDistance(enemy.position, dashStart, dashEnd)
    if (dist < killRadius) {
      killed.push(i)
    }
  }
  return killed
}

export function checkGoalReached(playerPos: Vec2, playerRadius: number, goal: Goal): boolean {
  const dist = distance(playerPos, goal.position)
  return dist < playerRadius + goal.radius
}

export function clampToBoundary(position: Vec2, playerRadius: number): Vec2 {
  return {
    x: Math.max(playerRadius, Math.min(CANVAS_WIDTH - playerRadius, position.x)),
    y: Math.max(playerRadius, Math.min(CANVAS_HEIGHT - playerRadius, position.y)),
  }
}
