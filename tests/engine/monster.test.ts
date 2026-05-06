import { describe, it, expect } from 'vitest'
import { generateName, calculateStats, generateMonster } from '@/engine/monster'
import { NAME_PREFIXES, NAME_SUFFIXES } from '@/engine/constants'
import type { Scar } from '@/engine/types'

describe('monster', () => {
  describe('generateName', () => {
    it('returns a name from the prefix and suffix lists', () => {
      const name = generateName('test-id-123')
      const [prefix, suffix] = name.split(' ')
      expect(NAME_PREFIXES).toContain(prefix)
      expect(NAME_SUFFIXES).toContain(suffix)
    })

    it('returns the same name for the same id', () => {
      const name1 = generateName('same-id')
      const name2 = generateName('same-id')
      expect(name1).toBe(name2)
    })

    it('returns different names for different ids', () => {
      const name1 = generateName('id-aaa')
      const name2 = generateName('id-zzz')
      expect(name1).not.toBe(name2)
    })
  })

  describe('calculateStats', () => {
    it('calculates HP as level * 20', () => {
      const stats = calculateStats(3, 0)
      expect(stats.hp).toBe(60)
    })

    it('calculates attack as kills * 5 + level * 3', () => {
      const stats = calculateStats(2, 4)
      expect(stats.attack).toBe(26)
    })

    it('returns minimum stats for level 1 no kills', () => {
      const stats = calculateStats(1, 0)
      expect(stats.hp).toBe(20)
      expect(stats.attack).toBe(3)
    })
  })

  describe('generateMonster', () => {
    const mockScars: Scar[] = [
      { start: { x: 50, y: 350 }, end: { x: 100, y: 350 }, createdAt: 1000, width: 6, color: '#ec4899' },
      { start: { x: 100, y: 350 }, end: { x: 150, y: 300 }, createdAt: 1100, width: 6, color: '#3b82f6' },
    ]

    it('creates a monster with correct stats from game data', () => {
      const monster = generateMonster(mockScars, 3, 5, '#ec4899')
      expect(monster.id).toBeTruthy()
      expect(monster.name).toBeTruthy()
      expect(monster.scars).toEqual(mockScars)
      expect(monster.stats.hp).toBe(60)
      expect(monster.stats.attack).toBe(34)
      expect(monster.level).toBe(3)
      expect(monster.kills).toBe(5)
      expect(monster.createdAt).toBeGreaterThan(0)
    })

    it('extracts unique line colors from scars', () => {
      const monster = generateMonster(mockScars, 1, 0, '#ec4899')
      expect(monster.lineColors).toEqual(['#ec4899', '#3b82f6'])
    })

    it('includes current lineColor in lineColors even if not in scars', () => {
      const scars: Scar[] = [
        { start: { x: 0, y: 0 }, end: { x: 1, y: 0 }, createdAt: 0, width: 6, color: '#ec4899' },
      ]
      const monster = generateMonster(scars, 1, 0, '#22c55e')
      expect(monster.lineColors).toContain('#22c55e')
    })
  })
})
