import type { Vec2, Scar } from './types'
import { SCAR_WIDTH, SCAR_DIM_TIME, SCAR_MIN_OPACITY } from './constants'

export function createScar(start: Vec2, end: Vec2, color = '#ec4899'): Scar {
  return {
    start,
    end,
    createdAt: Date.now(),
    width: SCAR_WIDTH,
    color,
  }
}

export function getScarOpacity(createdAt: number, now: number): number {
  const age = now - createdAt
  if (age >= SCAR_DIM_TIME) return SCAR_MIN_OPACITY
  const t = age / SCAR_DIM_TIME
  return 1 - t * (1 - SCAR_MIN_OPACITY)
}
