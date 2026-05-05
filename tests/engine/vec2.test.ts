import { describe, it, expect } from 'vitest'
import { add, sub, scale, normalize, length, distance, dot, pointToSegmentDistance } from '@/engine/vec2'

describe('vec2', () => {
  it('add adds two vectors', () => {
    expect(add({ x: 1, y: 2 }, { x: 3, y: 4 })).toEqual({ x: 4, y: 6 })
  })

  it('sub subtracts two vectors', () => {
    expect(sub({ x: 5, y: 7 }, { x: 2, y: 3 })).toEqual({ x: 3, y: 4 })
  })

  it('scale multiplies vector by scalar', () => {
    expect(scale({ x: 2, y: 3 }, 4)).toEqual({ x: 8, y: 12 })
  })

  it('length computes magnitude', () => {
    expect(length({ x: 3, y: 4 })).toBe(5)
  })

  it('normalize returns unit vector', () => {
    const n = normalize({ x: 3, y: 4 })
    expect(n.x).toBeCloseTo(0.6)
    expect(n.y).toBeCloseTo(0.8)
  })

  it('normalize of zero vector returns zero', () => {
    expect(normalize({ x: 0, y: 0 })).toEqual({ x: 0, y: 0 })
  })

  it('distance computes euclidean distance', () => {
    expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5)
  })

  it('dot computes dot product', () => {
    expect(dot({ x: 1, y: 0 }, { x: 0, y: 1 })).toBe(0)
    expect(dot({ x: 2, y: 3 }, { x: 4, y: 5 })).toBe(23)
  })

  it('pointToSegmentDistance returns 0 when point is on segment', () => {
    const d = pointToSegmentDistance({ x: 5, y: 0 }, { x: 0, y: 0 }, { x: 10, y: 0 })
    expect(d).toBeCloseTo(0)
  })

  it('pointToSegmentDistance returns perpendicular distance', () => {
    const d = pointToSegmentDistance({ x: 5, y: 3 }, { x: 0, y: 0 }, { x: 10, y: 0 })
    expect(d).toBeCloseTo(3)
  })

  it('pointToSegmentDistance returns distance to nearest endpoint', () => {
    const d = pointToSegmentDistance({ x: -3, y: 0 }, { x: 0, y: 0 }, { x: 10, y: 0 })
    expect(d).toBeCloseTo(3)
  })
})
