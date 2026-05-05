import { describe, it, expect, beforeEach, vi } from 'vitest'

describe('storage', () => {
  const store: Record<string, string> = {}

  beforeEach(() => {
    for (const key of Object.keys(store)) delete store[key]
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, val: string) => { store[key] = val },
      removeItem: (key: string) => { delete store[key] },
      clear: () => { for (const key of Object.keys(store)) delete store[key] },
    })
  })

  it('getHighScore returns 0 when no score saved', async () => {
    const { getHighScore } = await import('@/lib/storage')
    expect(getHighScore()).toBe(0)
  })

  it('setHighScore and getHighScore round-trip', async () => {
    const { getHighScore, setHighScore } = await import('@/lib/storage')
    setHighScore(42.7)
    expect(getHighScore()).toBe(42.7)
  })
})
