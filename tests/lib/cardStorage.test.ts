import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getCards, getCardForDate, saveCardResult, getTodayProgress, getCardCount } from '@/lib/cardStorage'
import type { CollectedCard, Tier } from '@/engine/types'

function makeMockCard(overrides: Partial<CollectedCard> = {}): CollectedCard {
  return {
    date: '2026-05-06',
    name: 'Void Shard',
    tier: 'bronze' as Tier,
    stats: { hp: 80, attack: 20 },
    form: 'biped',
    primaryColor: '#ec4899',
    secondaryColor: '#3b82f6',
    bestLevel: 3,
    bestKills: 2,
    unlockedAt: Date.now(),
    ...overrides,
  }
}

describe('cardStorage', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', {
      store: {} as Record<string, string>,
      getItem(key: string) { return this.store[key] ?? null },
      setItem(key: string, val: string) { this.store[key] = val },
      removeItem(key: string) { delete this.store[key] },
      clear() { this.store = {} },
    })
  })

  it('getCards returns empty array when no data', () => {
    expect(getCards()).toEqual([])
  })

  it('saveCardResult stores a new card', () => {
    const card = makeMockCard()
    saveCardResult(card)
    const cards = getCards()
    expect(cards).toHaveLength(1)
    expect(cards[0].date).toBe('2026-05-06')
  })

  it('saveCardResult upgrades existing card for same date', () => {
    saveCardResult(makeMockCard({ tier: 'bronze', bestLevel: 3 }))
    saveCardResult(makeMockCard({ tier: 'silver', bestLevel: 5 }))
    const cards = getCards()
    expect(cards).toHaveLength(1)
    expect(cards[0].tier).toBe('silver')
    expect(cards[0].bestLevel).toBe(5)
  })

  it('saveCardResult does not downgrade tier', () => {
    saveCardResult(makeMockCard({ tier: 'silver', bestLevel: 5 }))
    saveCardResult(makeMockCard({ tier: 'bronze', bestLevel: 3 }))
    const cards = getCards()
    expect(cards[0].tier).toBe('silver')
  })

  it('getCardForDate returns card or null', () => {
    expect(getCardForDate('2026-05-06')).toBeNull()
    saveCardResult(makeMockCard())
    expect(getCardForDate('2026-05-06')).not.toBeNull()
    expect(getCardForDate('2026-05-07')).toBeNull()
  })

  it('getTodayProgress returns today best data', () => {
    const progress = getTodayProgress('2026-05-06')
    expect(progress).toEqual({ date: '2026-05-06', tier: null, bestLevel: 0, bestKills: 0 })
  })

  it('getTodayProgress returns saved progress for today', () => {
    saveCardResult(makeMockCard({ date: '2026-05-06', tier: 'bronze', bestLevel: 3, bestKills: 2 }))
    const progress = getTodayProgress('2026-05-06')
    expect(progress.tier).toBe('bronze')
    expect(progress.bestLevel).toBe(3)
  })

  it('getCardCount returns count', () => {
    expect(getCardCount()).toBe(0)
    saveCardResult(makeMockCard({ date: '2026-05-06' }))
    saveCardResult(makeMockCard({ date: '2026-05-07' }))
    expect(getCardCount()).toBe(2)
  })

  it('migrates v1 monster data to v2 cards', () => {
    const v1Data = {
      monsters: [{
        id: 'abc-123',
        name: 'Void Shard',
        scars: [
          { start: { x: 50, y: 350 }, end: { x: 100, y: 350 }, createdAt: 1000, width: 6, color: '#ec4899' },
        ],
        stats: { hp: 60, attack: 34 },
        level: 3,
        kills: 5,
        lineColors: ['#ec4899', '#3b82f6'],
        createdAt: 1714953600000,
      }],
      version: 1,
    }
    localStorage.setItem('scar-monsters', JSON.stringify(v1Data))

    const cards = getCards()
    expect(cards).toHaveLength(1)
    expect(cards[0].tier).toBe('bronze')
    expect(cards[0].stats).toEqual({ hp: 60, attack: 34 })
    expect(cards[0].primaryColor).toBe('#ec4899')
    expect(cards[0].secondaryColor).toBe('#3b82f6')
    expect(cards[0].bestLevel).toBe(3)
    expect(cards[0].bestKills).toBe(5)
  })
})
