# CONSTELLATIONAL Card of the Day — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform SCAR into CONSTELLATIONAL — a daily collectible card game where every run is an attempt to unlock today's globally-shared creature card at the highest tier (bronze/silver/gold).

**Architecture:** Replace per-death monster generation with a deterministic daily card system seeded by the current date. Extend the constellation renderer to accept a seed number directly (bypassing scar data). Rework the game flow from "die → hatch monster" to "die → evaluate tier → reveal or retry". Storage migrates from v1 MonsterCollection to v2 CardCollection.

**Tech Stack:** Next.js 16, TypeScript, HTML5 Canvas 2D, Vitest (jsdom), Tailwind CSS v4, localStorage

---

## File Structure

### New Files
| File | Responsibility |
|------|---------------|
| `src/engine/dailyCard.ts` | Pure functions: `hashDateString()`, `generateDailyCard()`, `getTierForLevel()`, `adjustStats()`, `getNextTierInfo()` |
| `src/lib/cardStorage.ts` | localStorage CRUD for `CardCollection` v2, migration from v1, today's progress tracking |
| `src/components/PreGameScreen.tsx` | Today's card silhouette preview, tier requirements, tap to play |
| `src/components/CardRevealScreen.tsx` | Animated unlock/upgrade sequence (flash → draw → badge → stats) |
| `src/components/CardTile.tsx` | Grid card tile (replaces MonsterCard), renders from seed + tier badge |
| `tests/engine/dailyCard.test.ts` | Tests for daily card generation, tier logic, stat adjustment |
| `tests/lib/cardStorage.test.ts` | Tests for card storage CRUD, v1→v2 migration, today tracking |

### Modified Files
| File | Changes |
|------|---------|
| `src/engine/types.ts` | Add `CreatureForm`, `Tier`, `DailyCard`, `CollectedCard`, `CardCollection` types |
| `src/engine/constants.ts` | Add `TIER_THRESHOLDS` constant |
| `src/engine/monsterRenderer.ts` | Export `CreatureForm`, add `seed`/`form`/`primaryColor`/`secondaryColor` to options, add `generateSkeletonFromSeed()` |
| `src/app/layout.tsx` | Update title and meta to "CONSTELLATIONAL" |
| `src/app/page.tsx` | New game flow: pre-game → play → reveal or death, card-based state management |
| `src/components/GameCanvas.tsx` | Change death transition from 'hatching' to 'dead', simplify callbacks |
| `src/components/DeathScreen.tsx` | Show "need level X for tier Y" messaging |
| `src/components/CollectionTab.tsx` | Use CardTile, remove release handler, work with CollectedCard[] |
| `src/components/CollectionGrid.tsx` | New sort options (newest/tier/name), use CardTile |
| `src/components/MonsterDetail.tsx` | Render from seed, show tier badge, remove release button, update download |
| `src/lib/share.ts` | Update branding to "CONSTELLATIONAL", add tier to download card |
| `package.json` | Change name to "constellational" |

### Files Deleted (after new code is working)
| File | Replaced by |
|------|------------|
| `src/engine/monster.ts` | `src/engine/dailyCard.ts` |
| `src/lib/monsterStorage.ts` | `src/lib/cardStorage.ts` |
| `src/components/MonsterCard.tsx` | `src/components/CardTile.tsx` |
| `src/components/HatchingScreen.tsx` | `src/components/CardRevealScreen.tsx` |
| `src/components/StartScreen.tsx` | `src/components/PreGameScreen.tsx` |

---

### Task 1: Add New Types

**Files:**
- Modify: `src/engine/types.ts`
- Modify: `src/engine/constants.ts`

- [ ] **Step 1: Add new types to types.ts**

Add the following after the existing `MonsterCollection` interface (line 77):

```typescript
export type CreatureForm = 'biped' | 'quadruped' | 'serpent' | 'winged' | 'spider' | 'jellyfish'

export type Tier = 'bronze' | 'silver' | 'gold'

export interface DailyCard {
  date: string
  seed: number
  name: string
  form: CreatureForm
  primaryColor: string
  secondaryColor: string
  baseStats: { hp: number; attack: number }
}

export interface CollectedCard {
  date: string
  name: string
  tier: Tier
  stats: { hp: number; attack: number }
  form: CreatureForm
  primaryColor: string
  secondaryColor: string
  bestLevel: number
  bestKills: number
  unlockedAt: number
}

export interface CardCollection {
  cards: CollectedCard[]
  version: 2
  todayBest: {
    date: string
    tier: Tier | null
    bestLevel: number
    bestKills: number
  }
}
```

- [ ] **Step 2: Add tier thresholds to constants.ts**

Add after line 68 (`export const MONSTER_CAP = 50`):

```typescript
export const TIER_THRESHOLDS = {
  bronze: 3,
  silver: 5,
  gold: 8,
} as const
```

- [ ] **Step 3: Verify build**

Run: `npx next build 2>&1 | tail -5`
Expected: Build succeeds (new types are unused but valid)

- [ ] **Step 4: Commit**

```bash
git add src/engine/types.ts src/engine/constants.ts
git commit -m "feat: add CardCollection types and tier thresholds"
```

---

### Task 2: Daily Card Generation Engine

**Files:**
- Create: `src/engine/dailyCard.ts`
- Test: `tests/engine/dailyCard.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/engine/dailyCard.test.ts`:

```typescript
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
      // Test several dates to find one where they differ
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
      const info = getNextTierInfo(null)
      expect(info).toEqual({ tier: 'bronze', level: 3 })
    })

    it('returns silver info when bronze earned', () => {
      const info = getNextTierInfo('bronze')
      expect(info).toEqual({ tier: 'silver', level: 5 })
    })

    it('returns gold info when silver earned', () => {
      const info = getNextTierInfo('silver')
      expect(info).toEqual({ tier: 'gold', level: 8 })
    })

    it('returns null when gold earned (max tier)', () => {
      expect(getNextTierInfo('gold')).toBeNull()
    })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/engine/dailyCard.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement dailyCard.ts**

Create `src/engine/dailyCard.ts`:

```typescript
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/engine/dailyCard.test.ts`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/engine/dailyCard.ts tests/engine/dailyCard.test.ts
git commit -m "feat: add daily card generation engine with tier system"
```

---

### Task 3: Card Storage with V1 Migration

**Files:**
- Create: `src/lib/cardStorage.ts`
- Test: `tests/lib/cardStorage.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/lib/cardStorage.test.ts`:

```typescript
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
    // Simulate v1 data in localStorage
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/lib/cardStorage.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement cardStorage.ts**

Create `src/lib/cardStorage.ts`:

```typescript
import type { CollectedCard, CardCollection, Tier, Monster, MonsterCollection } from '@/engine/types'

const STORAGE_KEY = 'scar-monsters'

const TIER_RANK: Record<Tier, number> = { bronze: 1, silver: 2, gold: 3 }

function migrateV1(v1: MonsterCollection): CardCollection {
  const cards: CollectedCard[] = v1.monsters.map((m: Monster) => {
    let tier: Tier = 'bronze'
    if (m.level >= 8) tier = 'gold'
    else if (m.level >= 5) tier = 'silver'

    return {
      date: new Date(m.createdAt).toISOString().slice(0, 10),
      name: m.name,
      tier,
      stats: m.stats,
      form: 'biped' as const, // legacy monsters default to biped
      primaryColor: m.lineColors[0] || '#ec4899',
      secondaryColor: m.lineColors[1] || '#ffffff',
      bestLevel: m.level,
      bestKills: m.kills,
      unlockedAt: m.createdAt,
    }
  })

  return { cards, version: 2, todayBest: { date: '', tier: null, bestLevel: 0, bestKills: 0 } }
}

function loadCollection(): CardCollection {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { cards: [], version: 2, todayBest: { date: '', tier: null, bestLevel: 0, bestKills: 0 } }
    const parsed = JSON.parse(raw)
    if (parsed.version === 1) {
      const migrated = migrateV1(parsed as MonsterCollection)
      saveCollection(migrated)
      return migrated
    }
    return parsed as CardCollection
  } catch {
    return { cards: [], version: 2, todayBest: { date: '', tier: null, bestLevel: 0, bestKills: 0 } }
  }
}

function saveCollection(collection: CardCollection): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(collection))
  } catch {}
}

export function getCards(): CollectedCard[] {
  return loadCollection().cards
}

export function getCardCount(): number {
  return loadCollection().cards.length
}

export function getCardForDate(date: string): CollectedCard | null {
  const cards = loadCollection().cards
  return cards.find(c => c.date === date) ?? null
}

export function saveCardResult(card: CollectedCard): void {
  const collection = loadCollection()
  const existingIndex = collection.cards.findIndex(c => c.date === card.date)

  if (existingIndex >= 0) {
    const existing = collection.cards[existingIndex]
    // Only upgrade, never downgrade
    if (TIER_RANK[card.tier] > TIER_RANK[existing.tier]) {
      collection.cards[existingIndex] = card
    }
  } else {
    collection.cards.push(card)
  }

  // Update today's best
  collection.todayBest = {
    date: card.date,
    tier: collection.cards.find(c => c.date === card.date)!.tier,
    bestLevel: Math.max(collection.todayBest.date === card.date ? collection.todayBest.bestLevel : 0, card.bestLevel),
    bestKills: Math.max(collection.todayBest.date === card.date ? collection.todayBest.bestKills : 0, card.bestKills),
  }

  saveCollection(collection)
}

export function getTodayProgress(date: string): CardCollection['todayBest'] {
  const collection = loadCollection()
  if (collection.todayBest.date === date) return collection.todayBest
  // Check if we have a saved card for this date
  const card = collection.cards.find(c => c.date === date)
  if (card) {
    return { date, tier: card.tier, bestLevel: card.bestLevel, bestKills: card.bestKills }
  }
  return { date, tier: null, bestLevel: 0, bestKills: 0 }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/lib/cardStorage.test.ts`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/cardStorage.ts tests/lib/cardStorage.test.ts
git commit -m "feat: add card storage with v1 migration support"
```

---

### Task 4: Extend Monster Renderer for Seed-Based Rendering

**Files:**
- Modify: `src/engine/monsterRenderer.ts`

- [ ] **Step 1: Export CreatureForm type and update the module**

In `src/engine/monsterRenderer.ts`, the local `CreatureForm` type (line 73) should be removed since it's now in `types.ts`. Update the import at line 1:

Replace:
```typescript
import type { Scar, Vec2 } from './types'
```

With:
```typescript
import type { Scar, Vec2, CreatureForm } from './types'
```

Remove line 73:
```typescript
type CreatureForm = 'biped' | 'quadruped' | 'serpent' | 'winged' | 'spider' | 'jellyfish'
```

- [ ] **Step 2: Add generateSkeletonFromSeed export**

Add a new exported function after the `generateSkeleton` function (after line 365):

```typescript
export function generateSkeletonFromSeed(
  seed: number,
  form: CreatureForm,
  level: number,
): CreatureSkeleton {
  const rng = seededRandom(seed + 2)
  return generateSkeleton(form, level, rng)
}
```

- [ ] **Step 3: Update RenderMonsterOptions interface**

Replace the existing `RenderMonsterOptions` interface (lines 369-381):

```typescript
export interface RenderMonsterOptions {
  scars?: Scar[]
  seed?: number
  form?: CreatureForm
  primaryColor?: string
  secondaryColor?: string
  offsetX: number
  offsetY: number
  scale: number
  level?: number
  animate?: boolean
  animationProgress?: number
  showEyes?: boolean
  showStars?: boolean
  showAura?: boolean
  time?: number
}
```

- [ ] **Step 4: Update renderMonster function to support seed path**

Replace the beginning of the `renderMonster` function (lines 383-406) with:

```typescript
export function renderMonster(ctx: CanvasRenderingContext2D, options: RenderMonsterOptions): void {
  const {
    scars,
    seed: seedOpt,
    form: formOpt,
    primaryColor: primaryOpt,
    secondaryColor: secondaryOpt,
    offsetX,
    offsetY,
    scale,
    level = 1,
    animate = false,
    animationProgress = 1,
    showEyes = true,
    showAura = true,
    time = Date.now(),
  } = options

  // Determine seed, form, and colors from either seed or scars
  let seed: number
  let primaryColor: string
  let secondaryColor: string
  let form: CreatureForm
  let skeleton: CreatureSkeleton

  if (seedOpt != null) {
    // Seed-based path (daily cards)
    seed = seedOpt
    primaryColor = primaryOpt || '#ec4899'
    secondaryColor = secondaryOpt || '#ffffff'
    form = formOpt || pickForm(seededRandom(seed + 1))
    skeleton = generateSkeleton(form, level, seededRandom(seed + 2))
  } else if (scars && scars.length > 0) {
    // Legacy scar-based path
    seed = hashScars(scars)
    primaryColor = getDominantColor(scars)
    secondaryColor = getSecondaryColor(scars, primaryColor)
    form = pickForm(seededRandom(seed + 1))
    skeleton = generateSkeleton(form, level, seededRandom(seed + 2))
  } else {
    return // Nothing to render
  }

  const rng = seededRandom(seed)
  const { nodes, edges } = skeleton
```

Remove the old lines that computed seed/colors/form/skeleton (the block that was at lines 397-407) since they're now handled above. The rest of the function (from the `animatedNodes` line onward at ~line 410) stays unchanged.

- [ ] **Step 5: Verify build and existing tests still pass**

Run: `npx vitest run && npx next build 2>&1 | tail -5`
Expected: All existing tests pass, build succeeds

- [ ] **Step 6: Commit**

```bash
git add src/engine/monsterRenderer.ts
git commit -m "feat: extend renderer to support seed-based rendering"
```

---

### Task 5: Rebrand to CONSTELLATIONAL

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/lib/share.ts`
- Modify: `package.json`

- [ ] **Step 1: Update layout.tsx**

Replace the metadata in `src/app/layout.tsx` (lines 4-12):

```typescript
export const metadata: Metadata = {
  title: 'CONSTELLATIONAL',
  description: 'Collect the cosmos.',
  openGraph: {
    title: 'CONSTELLATIONAL',
    description: 'Collect the cosmos.',
    type: 'website',
  },
}
```

- [ ] **Step 2: Update share.ts branding**

In `src/lib/share.ts`, update the download watermark (line 49):

Replace:
```typescript
  ctx.fillText('SCAR', w / 2, h - 20)
```

With:
```typescript
  ctx.fillText('CONSTELLATIONAL', w / 2, h - 20)
```

Update download filename (line 55):

Replace:
```typescript
  a.download = `scar-${name.toLowerCase().replace(/\s+/g, '-')}.jpg`
```

With:
```typescript
  a.download = `constellational-${name.toLowerCase().replace(/\s+/g, '-')}.jpg`
```

Update share function title (line 68):

Replace:
```typescript
        title: 'SCAR',
```

With:
```typescript
        title: 'CONSTELLATIONAL',
```

Update share filename (line 64):

Replace:
```typescript
    const file = new File([blob], `scar-${score.toFixed(1)}s.png`, { type: 'image/png' })
```

With:
```typescript
    const file = new File([blob], `constellational-${score.toFixed(1)}s.png`, { type: 'image/png' })
```

- [ ] **Step 3: Update package.json name**

In `package.json`, change line 2:

Replace:
```json
  "name": "scar",
```

With:
```json
  "name": "constellational",
```

- [ ] **Step 4: Verify build**

Run: `npx next build 2>&1 | tail -5`
Expected: Build succeeds

- [ ] **Step 5: Commit**

```bash
git add src/app/layout.tsx src/lib/share.ts package.json
git commit -m "feat: rebrand SCAR to CONSTELLATIONAL"
```

---

### Task 6: PreGameScreen Component

**Files:**
- Create: `src/components/PreGameScreen.tsx`

- [ ] **Step 1: Create PreGameScreen**

Create `src/components/PreGameScreen.tsx`:

```typescript
'use client'

import { useRef, useEffect } from 'react'
import type { DailyCard, Tier } from '@/engine/types'
import { renderMonster } from '@/engine/monsterRenderer'

interface PreGameScreenProps {
  dailyCard: DailyCard
  currentTier: Tier | null
  highScore: number
  onStart: () => void
}

const PREVIEW_SIZE = 300

export function PreGameScreen({ dailyCard, currentTier, highScore, onStart }: PreGameScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animFrame = 0

    function draw() {
      ctx!.fillStyle = '#000000'
      ctx!.fillRect(0, 0, PREVIEW_SIZE, PREVIEW_SIZE)

      // Render silhouette — low opacity, no aura, no eyes
      ctx!.globalAlpha = 0.25
      renderMonster(ctx!, {
        seed: dailyCard.seed,
        form: dailyCard.form,
        primaryColor: dailyCard.primaryColor,
        secondaryColor: dailyCard.secondaryColor,
        offsetX: PREVIEW_SIZE / 2,
        offsetY: PREVIEW_SIZE / 2,
        scale: 0.35,
        level: 5,
        showEyes: false,
        showAura: false,
        time: Date.now(),
      })
      ctx!.globalAlpha = 1

      animFrame = requestAnimationFrame(draw)
    }

    animFrame = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(animFrame)
  }, [dailyCard])

  const tierLabel = currentTier
    ? `YOUR BEST: ${currentTier.toUpperCase()}`
    : 'NOT YET UNLOCKED'

  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none"
    >
      <h1 className="text-white font-mono text-3xl sm:text-5xl font-bold tracking-widest mb-2">
        CONSTELLATIONAL
      </h1>
      <p className="text-pink-400/60 font-mono text-xs sm:text-sm mb-6">
        COLLECT THE COSMOS
      </p>

      <canvas
        ref={canvasRef}
        width={PREVIEW_SIZE}
        height={PREVIEW_SIZE}
        className="w-[200px] h-[200px] sm:w-[260px] sm:h-[260px] mb-4"
      />

      <p className="text-white/70 font-mono text-sm mb-1">
        TODAY&apos;S CARD: <span className="text-white font-bold">{dailyCard.name}</span>
      </p>
      <p className="text-white/40 font-mono text-[10px] mb-1">
        BRONZE: LVL 3 | SILVER: LVL 5 | GOLD: LVL 8
      </p>
      <p className={`font-mono text-xs mb-6 ${currentTier ? 'text-pink-400/80' : 'text-white/30'}`}>
        {tierLabel}
      </p>

      <p className="text-white/80 font-mono text-lg animate-pulse">
        TAP TO PLAY
      </p>

      {highScore > 0 && (
        <p className="text-white/40 font-mono text-xs mt-4">
          BEST: {highScore.toFixed(1)}s
        </p>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

Run: `npx next build 2>&1 | tail -5`
Expected: Build succeeds (component created but not yet wired up)

- [ ] **Step 3: Commit**

```bash
git add src/components/PreGameScreen.tsx
git commit -m "feat: add PreGameScreen with daily card silhouette preview"
```

---

### Task 7: CardRevealScreen Component

**Files:**
- Create: `src/components/CardRevealScreen.tsx`

- [ ] **Step 1: Create CardRevealScreen**

Create `src/components/CardRevealScreen.tsx`:

```typescript
'use client'

import { useRef, useEffect, useState } from 'react'
import type { DailyCard, Tier, CollectedCard } from '@/engine/types'
import { renderMonster } from '@/engine/monsterRenderer'
import { adjustStats } from '@/engine/dailyCard'

interface CardRevealScreenProps {
  dailyCard: DailyCard
  tier: Tier
  level: number
  kills: number
  isUpgrade: boolean
  onPlayAgain: () => void
  onViewCollection: () => void
}

type Phase = 'flash' | 'drawing' | 'badge' | 'stats'

const CANVAS_SIZE = 400

const TIER_COLORS: Record<Tier, string> = {
  bronze: '#d4d4d4',
  silver: '#3b82f6',
  gold: '#f59e0b',
}

const TIER_LABELS: Record<Tier, string> = {
  bronze: 'BRONZE',
  silver: 'SILVER',
  gold: 'GOLD',
}

export function CardRevealScreen({
  dailyCard,
  tier,
  level,
  kills,
  isUpgrade,
  onPlayAgain,
  onViewCollection,
}: CardRevealScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [phase, setPhase] = useState<Phase>('flash')
  const [drawProgress, setDrawProgress] = useState(0)
  const [badgeScale, setBadgeScale] = useState(0)
  const [statsOpacity, setStatsOpacity] = useState(0)
  const rafRef = useRef<number>(0)

  const stats = adjustStats(dailyCard.baseStats, tier)

  // Phase transitions
  useEffect(() => {
    // Flash for 0.3s → drawing
    const t1 = setTimeout(() => setPhase('drawing'), 300)
    return () => clearTimeout(t1)
  }, [])

  // Drawing animation (2.5s)
  useEffect(() => {
    if (phase !== 'drawing') return
    const startTime = Date.now()
    const duration = 2500

    function animate() {
      const elapsed = Date.now() - startTime
      const progress = Math.min(1, elapsed / duration)
      setDrawProgress(progress)

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate)
      } else {
        setPhase('badge')
      }
    }

    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current)
  }, [phase])

  // Badge animation (0.5s with overshoot)
  useEffect(() => {
    if (phase !== 'badge') return
    const startTime = Date.now()
    const duration = 500

    function animate() {
      const elapsed = Date.now() - startTime
      const t = Math.min(1, elapsed / duration)
      // Overshoot ease: goes to 1.15 then settles to 1
      const overshoot = t < 0.7
        ? (t / 0.7) * 1.15
        : 1.15 - (0.15 * ((t - 0.7) / 0.3))
      setBadgeScale(overshoot)

      if (t < 1) {
        rafRef.current = requestAnimationFrame(animate)
      } else {
        setBadgeScale(1)
        setPhase('stats')
      }
    }

    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current)
  }, [phase])

  // Stats fade in (0.5s)
  useEffect(() => {
    if (phase !== 'stats') return
    const startTime = Date.now()
    const duration = 500

    function animate() {
      const elapsed = Date.now() - startTime
      setStatsOpacity(Math.min(1, elapsed / duration))
      if (elapsed < duration) {
        rafRef.current = requestAnimationFrame(animate)
      }
    }

    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current)
  }, [phase])

  // Canvas rendering
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    if (phase === 'flash') return

    let animFrame = 0

    function draw() {
      ctx!.fillStyle = '#000000'
      ctx!.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)

      renderMonster(ctx!, {
        seed: dailyCard.seed,
        form: dailyCard.form,
        primaryColor: dailyCard.primaryColor,
        secondaryColor: dailyCard.secondaryColor,
        offsetX: CANVAS_SIZE / 2,
        offsetY: CANVAS_SIZE / 2 - 20,
        scale: 0.5,
        level,
        animate: phase === 'drawing',
        animationProgress: drawProgress,
        showEyes: phase !== 'drawing',
        showAura: phase !== 'drawing',
        time: Date.now(),
      })

      animFrame = requestAnimationFrame(draw)
    }

    animFrame = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(animFrame)
  }, [phase, drawProgress, dailyCard, level])

  const tierColor = TIER_COLORS[tier]

  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black">
      {/* Flash overlay */}
      {phase === 'flash' && (
        <div className="absolute inset-0 bg-white/90 flex items-center justify-center z-30 animate-pulse">
          <p className="text-black font-mono text-2xl font-bold tracking-widest">
            {isUpgrade ? 'TIER UPGRADED' : 'CARD UNLOCKED'}
          </p>
        </div>
      )}

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={CANVAS_SIZE}
        height={CANVAS_SIZE}
        className="w-[280px] h-[280px] sm:w-[360px] sm:h-[360px]"
      />

      {/* Tier badge */}
      {(phase === 'badge' || phase === 'stats') && (
        <div
          className="flex items-center gap-2 mt-2"
          style={{ transform: `scale(${badgeScale})` }}
        >
          <span
            className="font-mono text-lg font-bold tracking-widest px-4 py-1 border-2 rounded"
            style={{
              color: tierColor,
              borderColor: tierColor,
              boxShadow: tier === 'gold' ? `0 0 12px ${tierColor}40` : undefined,
            }}
          >
            {TIER_LABELS[tier]}
          </span>
        </div>
      )}

      {/* Stats & actions */}
      {phase === 'stats' && (
        <div
          className="flex flex-col items-center gap-2 mt-4"
          style={{ opacity: statsOpacity }}
        >
          <p className="text-white font-mono text-2xl font-bold tracking-wider">
            {dailyCard.name}
          </p>
          <div className="flex gap-6 text-white/60 font-mono text-sm">
            <span>HP {stats.hp}</span>
            <span>ATK {stats.attack}</span>
          </div>
          <p className="text-white/30 font-mono text-[10px]">
            {dailyCard.date}
          </p>

          <div className="flex gap-3 mt-4">
            <button
              onClick={onPlayAgain}
              className="border border-white/30 text-white/60 font-mono text-sm px-6 py-2 hover:bg-white/10 transition-colors"
            >
              PLAY AGAIN
            </button>
            <button
              onClick={onViewCollection}
              className="border border-pink-500/50 text-pink-400 font-mono text-sm px-6 py-2 hover:bg-pink-500/10 transition-colors"
            >
              VIEW COLLECTION
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

Run: `npx next build 2>&1 | tail -5`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/components/CardRevealScreen.tsx
git commit -m "feat: add CardRevealScreen with flash/draw/badge/stats animation"
```

---

### Task 8: CardTile Component (replaces MonsterCard)

**Files:**
- Create: `src/components/CardTile.tsx`

- [ ] **Step 1: Create CardTile**

Create `src/components/CardTile.tsx`:

```typescript
'use client'

import { useRef, useEffect } from 'react'
import type { CollectedCard, Tier } from '@/engine/types'
import { renderMonster } from '@/engine/monsterRenderer'
import { generateDailyCard } from '@/engine/dailyCard'

interface CardTileProps {
  card: CollectedCard
  onClick: () => void
}

const CARD_SIZE = 200

const TIER_BORDER: Record<Tier, string> = {
  bronze: 'border-white/30',
  silver: 'border-blue-500/50 shadow-[0_0_4px_rgba(59,130,246,0.3)]',
  gold: 'border-yellow-500/80 shadow-[0_0_8px_rgba(245,158,11,0.4)]',
}

export function CardTile({ card, onClick }: CardTileProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dailyCard = generateDailyCard(card.date)
    let animFrame = 0

    function draw() {
      ctx!.fillStyle = '#000000'
      ctx!.fillRect(0, 0, CARD_SIZE, CARD_SIZE)

      renderMonster(ctx!, {
        seed: dailyCard.seed,
        form: card.form,
        primaryColor: card.primaryColor,
        secondaryColor: card.secondaryColor,
        offsetX: CARD_SIZE / 2,
        offsetY: CARD_SIZE / 2,
        scale: 0.25,
        level: card.bestLevel,
        showEyes: true,
        showAura: false,
        time: Date.now(),
      })

      animFrame = requestAnimationFrame(draw)
    }

    animFrame = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(animFrame)
  }, [card])

  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-2 p-2 border transition-colors bg-black ${TIER_BORDER[card.tier]}`}
    >
      <canvas
        ref={canvasRef}
        width={CARD_SIZE}
        height={CARD_SIZE}
        className="w-full aspect-square"
      />
      <p className="text-white font-mono text-xs font-bold truncate w-full text-center">
        {card.name}
      </p>
      <div className="flex gap-3 text-white/50 font-mono text-[10px]">
        <span>HP {card.stats.hp}</span>
        <span>ATK {card.stats.attack}</span>
      </div>
      <span
        className="font-mono text-[10px] uppercase"
        style={{ color: card.tier === 'gold' ? '#f59e0b' : card.tier === 'silver' ? '#3b82f6' : '#9ca3af' }}
      >
        {card.tier}
      </span>
    </button>
  )
}
```

- [ ] **Step 2: Verify build**

Run: `npx next build 2>&1 | tail -5`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/components/CardTile.tsx
git commit -m "feat: add CardTile component with tier-colored borders"
```

---

### Task 9: Update CollectionGrid for Cards

**Files:**
- Modify: `src/components/CollectionGrid.tsx`

- [ ] **Step 1: Rewrite CollectionGrid for CollectedCard**

Replace the entire contents of `src/components/CollectionGrid.tsx`:

```typescript
'use client'

import { useState } from 'react'
import type { CollectedCard, Tier } from '@/engine/types'
import { CardTile } from './CardTile'

type SortKey = 'newest' | 'tier' | 'name'

interface CollectionGridProps {
  cards: CollectedCard[]
  onSelect: (card: CollectedCard) => void
}

const TIER_RANK: Record<Tier, number> = { bronze: 1, silver: 2, gold: 3 }

function sortCards(cards: CollectedCard[], key: SortKey): CollectedCard[] {
  const sorted = [...cards]
  switch (key) {
    case 'newest':
      return sorted.sort((a, b) => b.unlockedAt - a.unlockedAt)
    case 'tier':
      return sorted.sort((a, b) => TIER_RANK[b.tier] - TIER_RANK[a.tier])
    case 'name':
      return sorted.sort((a, b) => a.name.localeCompare(b.name))
  }
}

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'newest', label: 'NEWEST' },
  { key: 'tier', label: 'TIER' },
  { key: 'name', label: 'NAME' },
]

export function CollectionGrid({ cards, onSelect }: CollectionGridProps) {
  const [sortKey, setSortKey] = useState<SortKey>('newest')
  const sorted = sortCards(cards, sortKey)

  return (
    <div className="flex flex-col gap-4 w-full max-w-[700px] mx-auto px-4">
      {/* Sort bar */}
      <div className="flex gap-2 justify-center">
        {SORT_OPTIONS.map(opt => (
          <button
            key={opt.key}
            onClick={() => setSortKey(opt.key)}
            className={`font-mono text-xs px-3 py-1 border transition-colors ${
              sortKey === opt.key
                ? 'border-pink-500/60 text-pink-400'
                : 'border-white/10 text-white/30 hover:border-white/30'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      {sorted.length === 0 ? (
        <p className="text-white/30 font-mono text-sm text-center mt-12">
          No cards yet. Play to unlock today&apos;s card!
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {sorted.map(card => (
            <CardTile
              key={card.date}
              card={card}
              onClick={() => onSelect(card)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

Run: `npx next build 2>&1 | tail -5`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/components/CollectionGrid.tsx
git commit -m "feat: update CollectionGrid for cards with tier/name sorting"
```

---

### Task 10: Update CollectionTab and MonsterDetail for Cards

**Files:**
- Modify: `src/components/CollectionTab.tsx`
- Modify: `src/components/MonsterDetail.tsx`

- [ ] **Step 1: Rewrite CollectionTab**

Replace the entire contents of `src/components/CollectionTab.tsx`:

```typescript
'use client'

import { useState, useCallback } from 'react'
import { CollectionGrid } from './CollectionGrid'
import { MonsterDetail } from './MonsterDetail'
import type { CollectedCard } from '@/engine/types'

interface CollectionTabProps {
  cards: CollectedCard[]
  onCardsChange: () => void
}

export function CollectionTab({ cards, onCardsChange }: CollectionTabProps) {
  const [selected, setSelected] = useState<CollectedCard | null>(null)

  const handleSelect = useCallback((card: CollectedCard) => {
    setSelected(card)
  }, [])

  const handleBack = useCallback(() => {
    setSelected(null)
  }, [])

  return (
    <div className="flex flex-col items-center h-full pt-6 pb-20 overflow-y-auto">
      <div className="flex items-center gap-3 mb-6">
        <h2 className="text-white font-mono text-2xl font-bold tracking-widest">
          COLLECTION
        </h2>
        <span className="text-white/30 font-mono text-sm">
          {cards.length}
        </span>
      </div>

      <CollectionGrid cards={cards} onSelect={handleSelect} />

      {selected && (
        <MonsterDetail
          card={selected}
          onBack={handleBack}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Rewrite MonsterDetail for CollectedCard**

Replace the entire contents of `src/components/MonsterDetail.tsx`:

```typescript
'use client'

import { useRef, useEffect } from 'react'
import type { CollectedCard, Tier } from '@/engine/types'
import { renderMonster } from '@/engine/monsterRenderer'
import { generateDailyCard } from '@/engine/dailyCard'
import { downloadMonsterCard } from '@/lib/share'

interface MonsterDetailProps {
  card: CollectedCard
  onBack: () => void
}

const DETAIL_SIZE = 400

const TIER_COLORS: Record<Tier, string> = {
  bronze: '#d4d4d4',
  silver: '#3b82f6',
  gold: '#f59e0b',
}

export function MonsterDetail({ card, onBack }: MonsterDetailProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dailyCard = generateDailyCard(card.date)
    let animFrame = 0

    function draw() {
      ctx!.fillStyle = '#000000'
      ctx!.fillRect(0, 0, DETAIL_SIZE, DETAIL_SIZE)

      renderMonster(ctx!, {
        seed: dailyCard.seed,
        form: card.form,
        primaryColor: card.primaryColor,
        secondaryColor: card.secondaryColor,
        offsetX: DETAIL_SIZE / 2,
        offsetY: DETAIL_SIZE / 2 - 20,
        scale: 0.5,
        level: card.bestLevel,
        showEyes: true,
        showAura: true,
        time: Date.now(),
      })

      animFrame = requestAnimationFrame(draw)
    }

    animFrame = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(animFrame)
  }, [card])

  const tierColor = TIER_COLORS[card.tier]

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center">
      {/* Back button */}
      <div className="absolute top-0 left-0 p-4">
        <button
          onClick={onBack}
          className="text-white/50 font-mono text-sm hover:text-white/80 transition-colors"
        >
          &larr; BACK
        </button>
      </div>

      {/* Monster canvas */}
      <canvas
        ref={canvasRef}
        width={DETAIL_SIZE}
        height={DETAIL_SIZE}
        className="w-[280px] h-[280px] sm:w-[360px] sm:h-[360px]"
      />

      {/* Tier badge */}
      <span
        className="font-mono text-sm font-bold tracking-widest px-4 py-1 border-2 rounded mt-2"
        style={{
          color: tierColor,
          borderColor: tierColor,
          boxShadow: card.tier === 'gold' ? `0 0 12px ${tierColor}40` : undefined,
        }}
      >
        {card.tier.toUpperCase()}
      </span>

      {/* Stats */}
      <div className="flex flex-col items-center gap-2 mt-4">
        <p className="text-white font-mono text-2xl font-bold tracking-wider">
          {card.name}
        </p>
        <div className="flex gap-6 text-white/60 font-mono text-sm">
          <span>HP {card.stats.hp}</span>
          <span>ATK {card.stats.attack}</span>
        </div>
        <p className="text-white/40 font-mono text-xs">
          Level {card.bestLevel} | {card.bestKills} kills
        </p>
        <p className="text-white/30 font-mono text-[10px]">
          {card.date}
        </p>

        <button
          onClick={() => {
            const canvas = canvasRef.current
            if (canvas) {
              downloadMonsterCard(canvas, card.name, card.stats, card.bestLevel, card.bestKills)
            }
          }}
          className="border border-white/20 text-white/60 font-mono text-sm px-6 py-2 mt-3 hover:bg-white/10 transition-colors"
        >
          DOWNLOAD
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Verify build**

Run: `npx next build 2>&1 | tail -5`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add src/components/CollectionTab.tsx src/components/MonsterDetail.tsx
git commit -m "feat: update CollectionTab and MonsterDetail for card system"
```

---

### Task 11: Update DeathScreen for Tier Messaging

**Files:**
- Modify: `src/components/DeathScreen.tsx`

- [ ] **Step 1: Rewrite DeathScreen**

Replace the entire contents of `src/components/DeathScreen.tsx`:

```typescript
'use client'

import type { Tier } from '@/engine/types'

interface DeathScreenProps {
  score: number
  kills: number
  level: number
  highScore: number
  isNewHighScore: boolean
  currentTier: Tier | null
  nextTierName: string | null
  nextTierLevel: number | null
  onRestart: () => void
  onViewCollection: () => void
}

export function DeathScreen({
  score,
  kills,
  level,
  highScore,
  isNewHighScore,
  currentTier,
  nextTierName,
  nextTierLevel,
  onRestart,
  onViewCollection,
}: DeathScreenProps) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none">
      <div className="pointer-events-auto flex flex-col items-center gap-4">
        {isNewHighScore && (
          <p className="text-pink-400 font-mono text-xs tracking-widest animate-pulse">
            NEW BEST
          </p>
        )}
        <p className="text-white font-mono text-4xl font-bold">
          Level {level}
        </p>
        <p className="text-white/50 font-mono text-sm">
          {score.toFixed(1)}s | {kills} kills
        </p>

        {/* Tier progress messaging */}
        {nextTierName && nextTierLevel && (
          <p className="text-white/40 font-mono text-xs mt-2">
            NEED LEVEL {nextTierLevel} FOR {nextTierName.toUpperCase()}
          </p>
        )}
        {currentTier && !nextTierName && (
          <p className="text-yellow-400/60 font-mono text-xs mt-2">
            MAX TIER REACHED
          </p>
        )}

        <div className="flex gap-4 mt-6">
          <button
            onClick={(e) => { e.stopPropagation(); onRestart(); }}
            className="border border-white/50 text-white font-mono text-sm px-6 py-2 hover:bg-white/10 transition-colors"
          >
            TRY AGAIN
          </button>
          <button
            onClick={onViewCollection}
            className="border border-pink-500/50 text-pink-400 font-mono text-sm px-6 py-2 hover:bg-pink-500/10 transition-colors"
          >
            COLLECTION
          </button>
        </div>
        {!isNewHighScore && (
          <p className="text-white/30 font-mono text-xs mt-4">
            BEST: {highScore.toFixed(1)}s
          </p>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

Run: `npx next build 2>&1 | tail -5`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/components/DeathScreen.tsx
git commit -m "feat: update DeathScreen with tier progress messaging"
```

---

### Task 12: Update GameCanvas Death Transition

**Files:**
- Modify: `src/components/GameCanvas.tsx`

- [ ] **Step 1: Simplify GameCanvas death handling**

In `src/components/GameCanvas.tsx`, the game currently transitions to `'hatching'` status on death. We need to change it back to `'dead'` since the card reveal logic will be handled in `page.tsx`.

Update the `GameCanvasProps` interface (lines 12-16). Remove `onHatching`:

```typescript
interface GameCanvasProps {
  onDeath: (state: GameState) => void
  onStart: () => void
}
```

Update the function signature (line 18):

```typescript
export function GameCanvas({ onDeath, onStart }: GameCanvasProps) {
```

Update the death handling block in `gameLoop` (lines 48-57). Replace:

```typescript
      if (newState.status === 'hatching') {
        if (newState.score > newState.highScore) {
          setHighScore(newState.score)
          stateRef.current = { ...newState, highScore: newState.score }
        }
        setGameStatus('hatching')
        inputRef.current?.disable()
        renderDeathScreen(ctx, stateRef.current)
        onHatching(stateRef.current)
        return
      }
```

With:

```typescript
      if (newState.status === 'hatching' || newState.status === 'dead') {
        if (newState.score > newState.highScore) {
          setHighScore(newState.score)
          stateRef.current = { ...newState, highScore: newState.score }
        }
        setGameStatus('dead')
        inputRef.current?.disable()
        renderDeathScreen(ctx, stateRef.current)
        onDeath(stateRef.current)
        return
      }
```

Update the `useCallback` dependency array for `gameLoop` (line 79). Remove `onHatching`:

```typescript
  }, [onDeath])
```

- [ ] **Step 2: Verify build**

Run: `npx next build 2>&1 | tail -5`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/components/GameCanvas.tsx
git commit -m "feat: simplify GameCanvas death handling for card system"
```

---

### Task 13: Wire Up New Game Flow in page.tsx

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Rewrite page.tsx with card-based game flow**

Replace the entire contents of `src/app/page.tsx`:

```typescript
'use client'

import { useState, useCallback, useEffect } from 'react'
import { GameCanvas } from '@/components/GameCanvas'
import { PreGameScreen } from '@/components/PreGameScreen'
import { CardRevealScreen } from '@/components/CardRevealScreen'
import { DeathScreen } from '@/components/DeathScreen'
import { TabBar } from '@/components/TabBar'
import { CollectionTab } from '@/components/CollectionTab'
import { BattleTab } from '@/components/BattleTab'
import { generateDailyCard, getTierForLevel, adjustStats, getNextTierInfo, getTodayDateString } from '@/engine/dailyCard'
import { getHighScore } from '@/lib/storage'
import { getCards, getCardCount, saveCardResult, getTodayProgress } from '@/lib/cardStorage'
import type { GameState, Tier, CollectedCard, DailyCard } from '@/engine/types'

type Tab = 'play' | 'collection' | 'battle'
type Screen = 'pre-game' | 'playing' | 'reveal' | 'dead'

export default function Home() {
  const [tab, setTab] = useState<Tab>('play')
  const [screen, setScreen] = useState<Screen>('pre-game')
  const [highScore, setHighScore] = useState(0)
  const [cards, setCards] = useState<CollectedCard[]>([])
  const [cardCount, setCardCount] = useState(0)

  // Daily card state
  const [todayDate] = useState(() => getTodayDateString())
  const [dailyCard] = useState<DailyCard>(() => generateDailyCard(getTodayDateString()))
  const [currentTier, setCurrentTier] = useState<Tier | null>(null)

  // Reveal state
  const [revealTier, setRevealTier] = useState<Tier>('bronze')
  const [revealLevel, setRevealLevel] = useState(0)
  const [revealKills, setRevealKills] = useState(0)
  const [revealIsUpgrade, setRevealIsUpgrade] = useState(false)

  // Death state (no tier earned)
  const [deathState, setDeathState] = useState<GameState | null>(null)

  const refreshCards = useCallback(() => {
    setCards(getCards())
    setCardCount(getCardCount())
  }, [])

  const refreshTodayProgress = useCallback(() => {
    const progress = getTodayProgress(todayDate)
    setCurrentTier(progress.tier)
  }, [todayDate])

  useEffect(() => {
    setHighScore(getHighScore())
    refreshCards()
    refreshTodayProgress()
  }, [refreshCards, refreshTodayProgress])

  const handleStart = useCallback(() => {
    setScreen('playing')
  }, [])

  const handleDeath = useCallback((state: GameState) => {
    setHighScore(state.highScore)

    const earnedTier = getTierForLevel(state.level)
    const nextInfo = getNextTierInfo(currentTier)

    // Check if this unlocks or upgrades a tier
    if (earnedTier && (!currentTier || tierRank(earnedTier) > tierRank(currentTier))) {
      // Save the card
      const stats = adjustStats(dailyCard.baseStats, earnedTier)
      const card: CollectedCard = {
        date: todayDate,
        name: dailyCard.name,
        tier: earnedTier,
        stats,
        form: dailyCard.form,
        primaryColor: dailyCard.primaryColor,
        secondaryColor: dailyCard.secondaryColor,
        bestLevel: state.level,
        bestKills: state.kills,
        unlockedAt: Date.now(),
      }
      saveCardResult(card)
      refreshCards()

      const isUpgrade = currentTier !== null
      setCurrentTier(earnedTier)

      // Show reveal
      setRevealTier(earnedTier)
      setRevealLevel(state.level)
      setRevealKills(state.kills)
      setRevealIsUpgrade(isUpgrade)
      setScreen('reveal')
    } else {
      // No new tier — show death screen
      setDeathState(state)
      setScreen('dead')
    }
  }, [currentTier, dailyCard, todayDate, refreshCards])

  const handlePlayAgain = useCallback(() => {
    setScreen('pre-game')
  }, [])

  const handleViewCollection = useCallback(() => {
    setScreen('pre-game')
    setTab('collection')
    refreshCards()
  }, [refreshCards])

  const handleRestart = useCallback(() => {
    setScreen('playing')
    const canvas = document.querySelector('canvas')
    canvas?.click()
  }, [])

  const handleTabChange = useCallback((newTab: Tab) => {
    setTab(newTab)
    if (newTab === 'collection') refreshCards()
    if (newTab === 'play') refreshTodayProgress()
  }, [refreshCards, refreshTodayProgress])

  const nextInfo = getNextTierInfo(currentTier)

  return (
    <div className="w-screen h-screen bg-black relative overflow-hidden">
      {/* Play tab */}
      <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-200 ${tab === 'play' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
        <GameCanvas onDeath={handleDeath} onStart={handleStart} />

        {screen === 'pre-game' && (
          <PreGameScreen
            dailyCard={dailyCard}
            currentTier={currentTier}
            highScore={highScore}
            onStart={handleStart}
          />
        )}

        {screen === 'reveal' && (
          <CardRevealScreen
            dailyCard={dailyCard}
            tier={revealTier}
            level={revealLevel}
            kills={revealKills}
            isUpgrade={revealIsUpgrade}
            onPlayAgain={handlePlayAgain}
            onViewCollection={handleViewCollection}
          />
        )}

        {screen === 'dead' && deathState && (
          <DeathScreen
            score={deathState.score}
            kills={deathState.kills}
            level={deathState.level}
            highScore={deathState.highScore}
            isNewHighScore={deathState.score >= deathState.highScore}
            currentTier={currentTier}
            nextTierName={nextInfo?.tier ?? null}
            nextTierLevel={nextInfo?.level ?? null}
            onRestart={handleRestart}
            onViewCollection={handleViewCollection}
          />
        )}
      </div>

      {/* Collection tab */}
      <div className={`absolute inset-0 transition-opacity duration-200 ${tab === 'collection' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
        <CollectionTab cards={cards} onCardsChange={refreshCards} />
      </div>

      {/* Battle tab */}
      <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-200 ${tab === 'battle' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
        <BattleTab />
      </div>

      {/* Tab bar */}
      <TabBar active={tab} onChange={handleTabChange} monsterCount={cardCount} />
    </div>
  )
}

function tierRank(tier: Tier): number {
  return { bronze: 1, silver: 2, gold: 3 }[tier]
}
```

- [ ] **Step 2: Verify build**

Run: `npx next build 2>&1 | tail -5`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: wire up card-of-the-day game flow in page.tsx"
```

---

### Task 14: Delete Old Files and Clean Up

**Files:**
- Delete: `src/engine/monster.ts`
- Delete: `src/lib/monsterStorage.ts`
- Delete: `src/components/MonsterCard.tsx`
- Delete: `src/components/HatchingScreen.tsx`
- Delete: `src/components/StartScreen.tsx`
- Delete: `tests/engine/monster.test.ts`
- Delete: `tests/lib/monsterStorage.test.ts`
- Modify: `src/app/page.tsx` (remove unused import if any)

- [ ] **Step 1: Delete replaced files**

```bash
rm src/engine/monster.ts
rm src/lib/monsterStorage.ts
rm src/components/MonsterCard.tsx
rm src/components/HatchingScreen.tsx
rm src/components/StartScreen.tsx
rm tests/engine/monster.test.ts
rm tests/lib/monsterStorage.test.ts
```

- [ ] **Step 2: Remove /collection route if it exists**

```bash
rm -f src/app/collection/page.tsx
```

- [ ] **Step 3: Verify all tests pass**

Run: `npx vitest run`
Expected: All tests PASS (new dailyCard and cardStorage tests, plus existing engine tests)

- [ ] **Step 4: Verify build**

Run: `npx next build 2>&1 | tail -5`
Expected: Build succeeds with no errors

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: remove old monster system files, replaced by card system"
```

---

### Task 15: Run Full Test Suite and Final Verification

**Files:** None (verification only)

- [ ] **Step 1: Run all tests**

Run: `npx vitest run`
Expected: All tests PASS

- [ ] **Step 2: Run build**

Run: `npx next build 2>&1 | tail -10`
Expected: Clean build, no errors or warnings

- [ ] **Step 3: Manual smoke test checklist**

Run `npx next dev` and verify:
1. Title shows "CONSTELLATIONAL"
2. Pre-game screen shows today's card silhouette + name + tier requirements
3. Play a game, die before level 3 → death screen shows "NEED LEVEL 3 FOR BRONZE"
4. Play a game, reach level 3+ → card reveal animation plays (flash → draw → badge → stats)
5. Card appears in Collection tab with tier badge
6. Card detail view shows creature, stats, tier, download button
7. Download button exports JPEG with "CONSTELLATIONAL" watermark
8. Next run shows "YOUR BEST: BRONZE" on pre-game screen
9. Reaching level 5+ upgrades to Silver with "TIER UPGRADED" flash
