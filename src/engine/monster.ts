import type { Scar, Monster } from './types'
import { NAME_PREFIXES, NAME_SUFFIXES } from './constants'

function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash)
}

export function generateName(id: string): string {
  const hash = hashString(id)
  const prefix = NAME_PREFIXES[hash % NAME_PREFIXES.length]
  const suffix = NAME_SUFFIXES[Math.floor(hash / NAME_PREFIXES.length) % NAME_SUFFIXES.length]
  return `${prefix} ${suffix}`
}

export function calculateStats(level: number, kills: number): { hp: number; attack: number } {
  return {
    hp: level * 20,
    attack: kills * 5 + level * 3,
  }
}

export function generateMonster(scars: Scar[], level: number, kills: number, lineColor: string): Monster {
  const id = crypto.randomUUID()
  const scarColors = [...new Set(scars.map(s => s.color))]
  if (!scarColors.includes(lineColor)) {
    scarColors.push(lineColor)
  }

  return {
    id,
    name: generateName(id),
    scars,
    stats: calculateStats(level, kills),
    level,
    kills,
    lineColors: scarColors,
    createdAt: Date.now(),
  }
}
