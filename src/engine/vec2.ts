import type { Vec2 } from './types'

export function add(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y }
}

export function sub(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, y: a.y - b.y }
}

export function scale(v: Vec2, s: number): Vec2 {
  return { x: v.x * s, y: v.y * s }
}

export function length(v: Vec2): number {
  return Math.sqrt(v.x * v.x + v.y * v.y)
}

export function normalize(v: Vec2): Vec2 {
  const len = length(v)
  if (len === 0) return { x: 0, y: 0 }
  return { x: v.x / len, y: v.y / len }
}

export function distance(a: Vec2, b: Vec2): number {
  return length(sub(a, b))
}

export function dot(a: Vec2, b: Vec2): number {
  return a.x * b.x + a.y * b.y
}

export function pointToSegmentDistance(point: Vec2, segStart: Vec2, segEnd: Vec2): number {
  const seg = sub(segEnd, segStart)
  const segLenSq = dot(seg, seg)
  if (segLenSq === 0) return distance(point, segStart)

  let t = dot(sub(point, segStart), seg) / segLenSq
  t = Math.max(0, Math.min(1, t))

  const projection = add(segStart, scale(seg, t))
  return distance(point, projection)
}
