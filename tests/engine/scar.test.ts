import { describe, it, expect } from 'vitest'
import { createScar, getScarOpacity } from '@/engine/scar'
import { SCAR_WIDTH, SCAR_DIM_TIME, SCAR_MIN_OPACITY } from '@/engine/constants'

describe('scar', () => {
  it('createScar creates a scar with correct properties', () => {
    const scar = createScar({ x: 100, y: 100 }, { x: 200, y: 200 })
    expect(scar.start).toEqual({ x: 100, y: 100 })
    expect(scar.end).toEqual({ x: 200, y: 200 })
    expect(scar.width).toBe(SCAR_WIDTH)
    expect(scar.createdAt).toBeGreaterThan(0)
    expect(scar.color).toBe('#ec4899')
  })

  it('getScarOpacity returns 1 for fresh scars', () => {
    const now = Date.now()
    expect(getScarOpacity(now, now)).toBe(1)
  })

  it('getScarOpacity returns min opacity for old scars', () => {
    const now = Date.now()
    const old = now - SCAR_DIM_TIME * 2
    expect(getScarOpacity(old, now)).toBe(SCAR_MIN_OPACITY)
  })

  it('getScarOpacity interpolates for mid-age scars', () => {
    const now = Date.now()
    const mid = now - SCAR_DIM_TIME / 2
    const opacity = getScarOpacity(mid, now)
    expect(opacity).toBeGreaterThan(SCAR_MIN_OPACITY)
    expect(opacity).toBeLessThan(1)
  })
})
