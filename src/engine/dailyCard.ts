import type { DailyCard, Tier, CreatureForm } from './types'
import { NAME_PREFIXES, NAME_SUFFIXES, LINE_COLORS, TIER_THRESHOLDS } from './constants'

function hashDateString(dateStr: string): number {
  let hash = 5381
  for (let i = 0; i < dateStr.length; i++) {
    hash = ((hash << 5) + hash + dateStr.charCodeAt(i)) & 0xffffffff
  }
  return Math.abs(hash) || 1
}

export function generateDailyCard(dateString: string): DailyCard {
  const seed = hashDateString(dateString)

  const form: CreatureForm = (['biped', 'quadruped', 'serpent', 'winged', 'spider', 'jellyfish'] as const)[seed % 6]

  const prefixIndex = seed % NAME_PREFIXES.length
  const suffixIndex = (seed >>> 8) % NAME_SUFFIXES.length
  const name = `${NAME_PREFIXES[prefixIndex]} ${NAME_SUFFIXES[suffixIndex]}`

  const primaryColor = LINE_COLORS[seed % LINE_COLORS.length]
  let secondaryIndex = (seed >>> 4) % LINE_COLORS.length
  if (LINE_COLORS[secondaryIndex] === primaryColor) {
    secondaryIndex = (secondaryIndex + 1) % LINE_COLORS.length
  }
  const secondaryColor = LINE_COLORS[secondaryIndex]

  const hp = 50 + (seed % 50)
  const attack = 10 + ((seed >>> 12) % 20)

  return {
    date: dateString,
    seed,
    name,
    form,
    primaryColor,
    secondaryColor,
    baseStats: { hp, attack },
  }
}

export function getTierForLevel(level: number): Tier | null {
  if (level >= TIER_THRESHOLDS.gold) return 'gold'
  if (level >= TIER_THRESHOLDS.silver) return 'silver'
  if (level >= TIER_THRESHOLDS.bronze) return 'bronze'
  return null
}

const TIER_MULTIPLIERS: Record<Tier, number> = {
  bronze: 1,
  silver: 1.5,
  gold: 2,
}

export function adjustStats(
  baseStats: { hp: number; attack: number },
  tier: Tier,
): { hp: number; attack: number } {
  const mult = TIER_MULTIPLIERS[tier]
  return {
    hp: Math.round(baseStats.hp * mult),
    attack: Math.round(baseStats.attack * mult),
  }
}

export function getNextTierInfo(currentTier: Tier | null): { tier: Tier; level: number } | null {
  if (currentTier === null) return { tier: 'bronze', level: TIER_THRESHOLDS.bronze }
  if (currentTier === 'bronze') return { tier: 'silver', level: TIER_THRESHOLDS.silver }
  if (currentTier === 'silver') return { tier: 'gold', level: TIER_THRESHOLDS.gold }
  return null
}

export function getTodayDateString(): string {
  return new Date().toISOString().slice(0, 10)
}
