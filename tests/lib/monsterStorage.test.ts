import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getMonsters, addMonster, removeMonster, getMonsterCount } from '@/lib/monsterStorage'
import type { Monster } from '@/engine/types'

function makeMockMonster(overrides: Partial<Monster> = {}): Monster {
  return {
    id: crypto.randomUUID(),
    name: 'Void Shard',
    scars: [],
    stats: { hp: 20, attack: 3 },
    level: 1,
    kills: 0,
    lineColors: ['#ec4899'],
    createdAt: Date.now(),
    ...overrides,
  }
}

describe('monsterStorage', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', {
      store: {} as Record<string, string>,
      getItem(key: string) { return this.store[key] ?? null },
      setItem(key: string, val: string) { this.store[key] = val },
      removeItem(key: string) { delete this.store[key] },
      clear() { this.store = {} },
    })
  })

  it('getMonsters returns empty array when no data', () => {
    expect(getMonsters()).toEqual([])
  })

  it('addMonster adds a monster and getMonsters retrieves it', () => {
    const monster = makeMockMonster()
    addMonster(monster)
    const monsters = getMonsters()
    expect(monsters).toHaveLength(1)
    expect(monsters[0].id).toBe(monster.id)
  })

  it('addMonster adds multiple monsters', () => {
    addMonster(makeMockMonster())
    addMonster(makeMockMonster())
    expect(getMonsters()).toHaveLength(2)
  })

  it('removeMonster removes by id', () => {
    const m1 = makeMockMonster()
    const m2 = makeMockMonster()
    addMonster(m1)
    addMonster(m2)
    removeMonster(m1.id)
    const remaining = getMonsters()
    expect(remaining).toHaveLength(1)
    expect(remaining[0].id).toBe(m2.id)
  })

  it('removeMonster does nothing if id not found', () => {
    addMonster(makeMockMonster())
    removeMonster('nonexistent-id')
    expect(getMonsters()).toHaveLength(1)
  })

  it('getMonsterCount returns count', () => {
    expect(getMonsterCount()).toBe(0)
    addMonster(makeMockMonster())
    addMonster(makeMockMonster())
    expect(getMonsterCount()).toBe(2)
  })

  it('addMonster respects cap of 50', () => {
    for (let i = 0; i < 50; i++) {
      addMonster(makeMockMonster())
    }
    expect(getMonsterCount()).toBe(50)
    const result = addMonster(makeMockMonster())
    expect(result).toBe(false)
    expect(getMonsterCount()).toBe(50)
  })
})
