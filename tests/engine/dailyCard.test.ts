import { describe, it, expect } from 'vitest'
import { generateDailyCard, getTierForLevel, adjustStats, getNextTierInfo } from '@/engine/dailyCard'

describe('dailyCard', () => {
  describe('generateDailyCard', () => {
    it('returns a card with all required fields', () => {
      const card = generateDailyCard('2026-05-06')
      expect(card.date).toBe('2026-05-06')
      expect(card.seed).toBeTypeOf('number')
      expect(card.seed).toBeGreaterThan(0)
      expect(card.name).toMatch(/^\w+ \w+$/)
      expect(['biped', 'quadruped', 'serpent', 'winged', 'spider', 'jellyfish']).toContain(card.form)
      expect(card.primaryColor).toMatch(/^#[0-9a-f]{6}$/)
      expect(card.secondaryColor).toMatch(/^#[0-9a-f]{6}$/)
      expect(card.baseStats.hp).toBeGreaterThanOrEqual(50)
      expect(card.baseStats.hp).toBeLessThanOrEqual(99)
      expect(card.baseStats.attack).toBeGreaterThanOrEqual(10)
      expect(card.baseStats.attack).toBeLessThanOrEqual(29)
    })

    it('is deterministic — same date always returns same card', () => {
      const card1 = generateDailyCard('2026-05-06')
      const card2 = generateDailyCard('2026-05-06')
      expect(card1).toEqual(card2)
    })

    it('produces different cards for different dates', () => {
      const card1 = generateDailyCard('2026-05-06')
      const card2 = generateDailyCard('2026-05-07')
      expect(card1.seed).not.toBe(card2.seed)
    })

    it('primary and secondary colors are different', () => {
      let foundDifferent = false
      for (let i = 1; i <= 30; i++) {
        const card = generateDailyCard(`2026-01-${String(i).padStart(2, '0')}`)
        if (card.primaryColor !== card.secondaryColor) {
          foundDifferent = true
          break
        }
      }
      expect(foundDifferent).toBe(true)
    })
  })

  describe('getTierForLevel', () => {
    it('returns null for level below 3', () => {
      expect(getTierForLevel(1)).toBeNull()
      expect(getTierForLevel(2)).toBeNull()
    })

    it('returns bronze for level 3-4', () => {
      expect(getTierForLevel(3)).toBe('bronze')
      expect(getTierForLevel(4)).toBe('bronze')
    })

    it('returns silver for level 5-7', () => {
      expect(getTierForLevel(5)).toBe('silver')
      expect(getTierForLevel(7)).toBe('silver')
    })

    it('returns gold for level 8+', () => {
      expect(getTierForLevel(8)).toBe('gold')
      expect(getTierForLevel(15)).toBe('gold')
    })
  })

  describe('adjustStats', () => {
    const base = { hp: 80, attack: 20 }

    it('returns 1x for bronze', () => {
      expect(adjustStats(base, 'bronze')).toEqual({ hp: 80, attack: 20 })
    })

    it('returns 1.5x rounded for silver', () => {
      expect(adjustStats(base, 'silver')).toEqual({ hp: 120, attack: 30 })
    })

    it('returns 2x for gold', () => {
      expect(adjustStats(base, 'gold')).toEqual({ hp: 160, attack: 40 })
    })
  })

  describe('getNextTierInfo', () => {
    it('returns bronze info when no tier earned', () => {
      expect(getNextTierInfo(null)).toEqual({ tier: 'bronze', level: 3 })
    })

    it('returns silver info when bronze earned', () => {
      expect(getNextTierInfo('bronze')).toEqual({ tier: 'silver', level: 5 })
    })

    it('returns gold info when silver earned', () => {
      expect(getNextTierInfo('silver')).toEqual({ tier: 'gold', level: 8 })
    })

    it('returns null when gold earned', () => {
      expect(getNextTierInfo('gold')).toBeNull()
    })
  })
})
