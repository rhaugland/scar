# Monster Generation & Collection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When players die in SCAR, their scar trails become constellation monsters that get added to a persistent collection of up to 50 creatures.

**Architecture:** Pure functional engine code handles monster data generation (types, stats, names). A localStorage CRUD module persists the collection. The monster renderer draws constellation visuals on canvas. React components handle the hatching animation flow, collection grid, and detail views. The existing game loop transitions to 'hatching' status instead of 'dead'.

**Tech Stack:** Next.js 16 (App Router), TypeScript, HTML5 Canvas 2D, Vitest (jsdom), Tailwind CSS v4

---

## File Structure

### New Files
| File | Responsibility |
|------|---------------|
| `src/engine/monster.ts` | Monster type, generateMonster(), generateName(), calculateStats() |
| `src/engine/monsterRenderer.ts` | Canvas rendering: constellation lines, star nodes, eyes, particle aura |
| `src/lib/monsterStorage.ts` | localStorage CRUD for MonsterCollection |
| `src/components/HatchingScreen.tsx` | Hatching animation + monster reveal + action buttons |
| `src/components/CollectionGrid.tsx` | Sortable grid of monster cards |
| `src/components/MonsterCard.tsx` | Individual card with mini canvas render |
| `src/components/MonsterDetail.tsx` | Full-screen detail view with release button |
| `src/app/collection/page.tsx` | /collection route |
| `tests/engine/monster.test.ts` | Monster generation unit tests |
| `tests/lib/monsterStorage.test.ts` | Storage CRUD unit tests |

### Modified Files
| File | Change |
|------|--------|
| `src/engine/types.ts` | Add Monster, MonsterCollection interfaces; add 'hatching' to GameStatus |
| `src/engine/constants.ts` | Add MONSTER_CAP, NAME_PREFIXES, NAME_SUFFIXES |
| `src/engine/game.ts` | Change `status: 'dead'` to `status: 'hatching'` when lives reach 0 |
| `src/components/GameCanvas.tsx` | Handle 'hatching' status, stop RAF, call onHatching callback |
| `src/components/StartScreen.tsx` | Add "Collection (N)" link |
| `src/app/page.tsx` | Add 'hatching' screen state, wire HatchingScreen, pass monster count |

---

### Task 1: Types & Constants

**Files:**
- Modify: `src/engine/types.ts`
- Modify: `src/engine/constants.ts`

- [ ] **Step 1: Add Monster and MonsterCollection types to types.ts**

Add after the existing `GameState` interface in `src/engine/types.ts`:

```typescript
export interface Monster {
  id: string
  name: string
  scars: Scar[]
  stats: {
    hp: number
    attack: number
  }
  level: number
  kills: number
  lineColors: string[]
  createdAt: number
}

export interface MonsterCollection {
  monsters: Monster[]
  version: 1
}
```

- [ ] **Step 2: Add 'hatching' to GameStatus**

Change line 40 of `src/engine/types.ts` from:

```typescript
export type GameStatus = 'idle' | 'playing' | 'paused' | 'dead' | 'level-complete'
```

to:

```typescript
export type GameStatus = 'idle' | 'playing' | 'paused' | 'dead' | 'hatching' | 'level-complete'
```

- [ ] **Step 3: Add monster constants to constants.ts**

Add at the end of `src/engine/constants.ts`:

```typescript
export const MONSTER_CAP = 50

export const NAME_PREFIXES = [
  'Void', 'Neon', 'Crimson', 'Shadow', 'Crystal',
  'Ember', 'Frost', 'Lunar', 'Solar', 'Iron',
  'Phantom', 'Storm', 'Ash', 'Drift', 'Pulse',
] as const

export const NAME_SUFFIXES = [
  'Crawler', 'Shard', 'Fang', 'Wisp', 'Thorn',
  'Wraith', 'Spark', 'Coil', 'Drifter', 'Bloom',
  'Striker', 'Shade', 'Flare', 'Claw', 'Weaver',
] as const
```

- [ ] **Step 4: Update GameCanvas gameStatus useState to include 'hatching'**

In `src/components/GameCanvas.tsx` line 22, change:

```typescript
const [gameStatus, setGameStatus] = useState<'idle' | 'playing' | 'paused' | 'dead' | 'level-complete'>('idle')
```

to:

```typescript
const [gameStatus, setGameStatus] = useState<GameStatus>('idle')
```

(GameStatus is already importable from `@/engine/types` — add it to the existing import on line 4.)

- [ ] **Step 5: Run existing tests to ensure nothing breaks**

Run: `cd /Users/ryanhaugland/scar && npx vitest run`
Expected: All existing tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/engine/types.ts src/engine/constants.ts src/components/GameCanvas.tsx
git commit -m "feat: add Monster types, hatching status, and name constants"
```

---

### Task 2: Monster Generation (Pure Functions)

**Files:**
- Create: `src/engine/monster.ts`
- Create: `tests/engine/monster.test.ts`

- [ ] **Step 1: Write failing tests for monster generation**

Create `tests/engine/monster.test.ts`:

```typescript
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
      expect(stats.attack).toBe(26) // 4*5 + 2*3
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
      expect(monster.stats.attack).toBe(34) // 5*5 + 3*3
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/ryanhaugland/scar && npx vitest run tests/engine/monster.test.ts`
Expected: FAIL — module `@/engine/monster` not found.

- [ ] **Step 3: Implement monster generation**

Create `src/engine/monster.ts`:

```typescript
import type { Scar, Monster } from './types'
import { NAME_PREFIXES, NAME_SUFFIXES } from './constants'

function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /Users/ryanhaugland/scar && npx vitest run tests/engine/monster.test.ts`
Expected: All 8 tests PASS.

- [ ] **Step 5: Run all tests**

Run: `cd /Users/ryanhaugland/scar && npx vitest run`
Expected: All tests pass (existing + new).

- [ ] **Step 6: Commit**

```bash
git add src/engine/monster.ts tests/engine/monster.test.ts
git commit -m "feat: add monster generation with name, stats, and scar data"
```

---

### Task 3: Monster Storage (localStorage CRUD)

**Files:**
- Create: `src/lib/monsterStorage.ts`
- Create: `tests/lib/monsterStorage.test.ts`

- [ ] **Step 1: Write failing tests for monster storage**

Create `tests/lib/monsterStorage.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/ryanhaugland/scar && npx vitest run tests/lib/monsterStorage.test.ts`
Expected: FAIL — module `@/lib/monsterStorage` not found.

- [ ] **Step 3: Implement monster storage**

Create `src/lib/monsterStorage.ts`:

```typescript
import type { Monster, MonsterCollection } from '@/engine/types'
import { MONSTER_CAP } from '@/engine/constants'

const STORAGE_KEY = 'scar-monsters'

function loadCollection(): MonsterCollection {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { monsters: [], version: 1 }
    return JSON.parse(raw) as MonsterCollection
  } catch {
    return { monsters: [], version: 1 }
  }
}

function saveCollection(collection: MonsterCollection): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(collection))
  } catch {}
}

export function getMonsters(): Monster[] {
  return loadCollection().monsters
}

export function getMonsterCount(): number {
  return loadCollection().monsters.length
}

export function addMonster(monster: Monster): boolean {
  const collection = loadCollection()
  if (collection.monsters.length >= MONSTER_CAP) return false
  collection.monsters.push(monster)
  saveCollection(collection)
  return true
}

export function removeMonster(id: string): void {
  const collection = loadCollection()
  collection.monsters = collection.monsters.filter(m => m.id !== id)
  saveCollection(collection)
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /Users/ryanhaugland/scar && npx vitest run tests/lib/monsterStorage.test.ts`
Expected: All 7 tests PASS.

- [ ] **Step 5: Run all tests**

Run: `cd /Users/ryanhaugland/scar && npx vitest run`
Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/lib/monsterStorage.ts tests/lib/monsterStorage.test.ts
git commit -m "feat: add monster collection localStorage CRUD with 50 cap"
```

---

### Task 4: Game State Transition to 'hatching'

**Files:**
- Modify: `src/engine/game.ts:204,219`
- Modify: `tests/engine/game.test.ts`

- [ ] **Step 1: Update existing game test for hatching status**

In `tests/engine/game.test.ts`, the existing test `'scar hit removes a life'` (lines 58-73) tests that status stays `'playing'` when a life is lost but doesn't test death. Add a new test after it:

Add to end of the describe block in `tests/engine/game.test.ts` (before the closing `})`):

```typescript
  it('transitions to hatching when lives reach 0', () => {
    let state = startGame(createGameState(0))
    state = { ...state, lives: 1, invulnFrames: 0, lastTrailPos: { ...state.player.position } }
    const dangerScar = createScar({ x: 60, y: 350 }, { x: 80, y: 350 })
    const dummyScars = [
      createScar({ x: 0, y: 0 }, { x: 1, y: 0 }),
      createScar({ x: 0, y: 0 }, { x: 1, y: 0 }),
      createScar({ x: 0, y: 0 }, { x: 1, y: 0 }),
    ]
    state = { ...state, scars: [dangerScar, ...dummyScars] }
    for (let i = 0; i < 10; i++) {
      state = tick(state, { moveX: 1, moveY: 0, dashDirection: null })
      if (state.status !== 'playing') break
    }
    expect(state.status).toBe('hatching')
  })
```

- [ ] **Step 2: Run the new test to verify it fails**

Run: `cd /Users/ryanhaugland/scar && npx vitest run tests/engine/game.test.ts`
Expected: FAIL — the new test expects `'hatching'` but gets `'dead'`.

- [ ] **Step 3: Change game.ts to transition to 'hatching'**

In `src/engine/game.ts`, change the two places where `status: 'dead'` is set:

Line 205 — change:
```typescript
        return { ...newState, status: 'dead' }
```
to:
```typescript
        return { ...newState, status: 'hatching' }
```

Line 220 — change:
```typescript
        return { ...newState, status: 'dead' }
```
to:
```typescript
        return { ...newState, status: 'hatching' }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /Users/ryanhaugland/scar && npx vitest run tests/engine/game.test.ts`
Expected: All tests PASS.

- [ ] **Step 5: Run all tests**

Run: `cd /Users/ryanhaugland/scar && npx vitest run`
Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/engine/game.ts tests/engine/game.test.ts
git commit -m "feat: transition to hatching status instead of dead when lives reach 0"
```

---

### Task 5: Monster Constellation Renderer

**Files:**
- Create: `src/engine/monsterRenderer.ts`

This is a canvas rendering module — no unit tests (visual output). It will be tested via the hatching screen integration.

- [ ] **Step 1: Implement the monster constellation renderer**

Create `src/engine/monsterRenderer.ts`:

```typescript
import type { Scar, Vec2 } from './types'

function getCentroid(scars: Scar[]): Vec2 {
  if (scars.length === 0) return { x: 0, y: 0 }
  let sumX = 0, sumY = 0, count = 0
  for (const scar of scars) {
    sumX += scar.start.x + scar.end.x
    sumY += scar.start.y + scar.end.y
    count += 2
  }
  return { x: sumX / count, y: sumY / count }
}

function getBounds(scars: Scar[]): { minX: number; minY: number; maxX: number; maxY: number } {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const scar of scars) {
    minX = Math.min(minX, scar.start.x, scar.end.x)
    minY = Math.min(minY, scar.start.y, scar.end.y)
    maxX = Math.max(maxX, scar.start.x, scar.end.x)
    maxY = Math.max(maxY, scar.start.y, scar.end.y)
  }
  return { minX, minY, maxX, maxY }
}

function getStarNodes(scars: Scar[]): Vec2[] {
  const nodes: Vec2[] = []
  for (let i = 0; i < scars.length; i++) {
    const scar = scars[i]
    // Add endpoints
    if (i === 0) nodes.push(scar.start)
    nodes.push(scar.end)

    // Check for sharp direction changes
    if (i > 0) {
      const prev = scars[i - 1]
      const dx1 = prev.end.x - prev.start.x
      const dy1 = prev.end.y - prev.start.y
      const dx2 = scar.end.x - scar.start.x
      const dy2 = scar.end.y - scar.start.y
      const dot = dx1 * dx2 + dy1 * dy2
      const mag1 = Math.sqrt(dx1 * dx1 + dy1 * dy1)
      const mag2 = Math.sqrt(dx2 * dx2 + dy2 * dy2)
      if (mag1 > 0 && mag2 > 0) {
        const cosAngle = dot / (mag1 * mag2)
        // cos(45°) ≈ 0.707 — sharp turn if cosAngle < 0.707
        if (cosAngle < 0.707) {
          nodes.push(scar.start)
        }
      }
    }
  }
  return nodes
}

function getDominantColor(scars: Scar[]): string {
  if (scars.length === 0) return '#ec4899'
  const counts = new Map<string, number>()
  for (const scar of scars) {
    counts.set(scar.color, (counts.get(scar.color) ?? 0) + 1)
  }
  let maxColor = scars[0].color
  let maxCount = 0
  for (const [color, count] of counts) {
    if (count > maxCount) {
      maxCount = count
      maxColor = color
    }
  }
  return maxColor
}

export interface RenderMonsterOptions {
  scars: Scar[]
  offsetX: number
  offsetY: number
  scale: number
  animate?: boolean
  animationProgress?: number // 0-1, controls how many scars are drawn
  showEyes?: boolean
  showStars?: boolean
  showAura?: boolean
  time?: number // for pulsing effects
}

export function renderMonster(ctx: CanvasRenderingContext2D, options: RenderMonsterOptions): void {
  const {
    scars,
    offsetX,
    offsetY,
    scale,
    animate = false,
    animationProgress = 1,
    showEyes = true,
    showStars = true,
    showAura = true,
    time = Date.now(),
  } = options

  if (scars.length === 0) return

  const bounds = getBounds(scars)
  const centroid = getCentroid(scars)

  // Center the monster in the render area
  const monsterW = bounds.maxX - bounds.minX
  const monsterH = bounds.maxY - bounds.minY
  const centerX = bounds.minX + monsterW / 2
  const centerY = bounds.minY + monsterH / 2

  ctx.save()
  ctx.translate(offsetX, offsetY)
  ctx.scale(scale, scale)
  ctx.translate(-centerX, -centerY)

  // Determine how many scars to draw based on animation progress
  const scarCount = animate ? Math.floor(scars.length * animationProgress) : scars.length

  // Particle aura
  if (showAura && !animate) {
    const dominantColor = getDominantColor(scars)
    const pulse = 0.3 + Math.sin(time / 500) * 0.15
    const auraRadius = Math.max(monsterW, monsterH) * 0.6
    const gradient = ctx.createRadialGradient(centroid.x, centroid.y, 0, centroid.x, centroid.y, auraRadius)
    gradient.addColorStop(0, dominantColor + '40')
    gradient.addColorStop(1, dominantColor + '00')
    ctx.globalAlpha = pulse
    ctx.fillStyle = gradient
    ctx.fillRect(bounds.minX - 30, bounds.minY - 30, monsterW + 60, monsterH + 60)
    ctx.globalAlpha = 1
  }

  // Constellation lines
  for (let i = 0; i < scarCount; i++) {
    const scar = scars[i]

    // Glow layer
    ctx.shadowColor = scar.color
    ctx.shadowBlur = 12
    ctx.strokeStyle = scar.color
    ctx.globalAlpha = 0.6
    ctx.lineWidth = scar.width * 0.8
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(scar.start.x, scar.start.y)
    ctx.lineTo(scar.end.x, scar.end.y)
    ctx.stroke()

    // Core white line
    ctx.shadowBlur = 0
    ctx.strokeStyle = '#ffffff'
    ctx.globalAlpha = 0.9
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(scar.start.x, scar.start.y)
    ctx.lineTo(scar.end.x, scar.end.y)
    ctx.stroke()

    ctx.globalAlpha = 1
  }
  ctx.shadowBlur = 0

  // Star nodes
  if (showStars && scarCount > 0) {
    const visibleScars = scars.slice(0, scarCount)
    const stars = getStarNodes(visibleScars)
    const starPulse = 0.7 + Math.sin(time / 300) * 0.3

    for (const star of stars) {
      ctx.fillStyle = '#ffffff'
      ctx.globalAlpha = starPulse
      ctx.shadowColor = '#ffffff'
      ctx.shadowBlur = 8
      ctx.beginPath()
      ctx.arc(star.x, star.y, 3, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.shadowBlur = 0
    ctx.globalAlpha = 1
  }

  // Eyes
  if (showEyes && scarCount === scars.length) {
    const eyeSpacing = 8
    const eyeY = centroid.y - 5
    const eyePulse = 0.8 + Math.sin(time / 400) * 0.2
    const dominantColor = getDominantColor(scars)

    ctx.globalAlpha = eyePulse
    ctx.shadowColor = dominantColor
    ctx.shadowBlur = 10

    // Left eye
    ctx.fillStyle = dominantColor
    ctx.beginPath()
    ctx.arc(centroid.x - eyeSpacing, eyeY, 4, 0, Math.PI * 2)
    ctx.fill()

    // Right eye
    ctx.beginPath()
    ctx.arc(centroid.x + eyeSpacing, eyeY, 4, 0, Math.PI * 2)
    ctx.fill()

    // Eye cores (white)
    ctx.fillStyle = '#ffffff'
    ctx.shadowBlur = 0
    ctx.beginPath()
    ctx.arc(centroid.x - eyeSpacing, eyeY, 1.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(centroid.x + eyeSpacing, eyeY, 1.5, 0, Math.PI * 2)
    ctx.fill()

    ctx.globalAlpha = 1
    ctx.shadowBlur = 0
  }

  ctx.restore()
}
```

- [ ] **Step 2: Run all tests to ensure nothing breaks**

Run: `cd /Users/ryanhaugland/scar && npx vitest run`
Expected: All tests pass (renderer has no tests of its own).

- [ ] **Step 3: Commit**

```bash
git add src/engine/monsterRenderer.ts
git commit -m "feat: add constellation monster canvas renderer"
```

---

### Task 6: Hatching Screen Component

**Files:**
- Create: `src/components/HatchingScreen.tsx`

- [ ] **Step 1: Implement the hatching screen**

Create `src/components/HatchingScreen.tsx`:

```tsx
'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import type { Monster, Scar } from '@/engine/types'
import { generateMonster } from '@/engine/monster'
import { renderMonster } from '@/engine/monsterRenderer'
import { getMonsterCount } from '@/lib/monsterStorage'
import { MONSTER_CAP, CANVAS_WIDTH, CANVAS_HEIGHT } from '@/engine/constants'

interface HatchingScreenProps {
  scars: Scar[]
  level: number
  kills: number
  lineColor: string
  onAddMonster: (monster: Monster) => void
  onSkip: () => void
}

type Phase = 'forming' | 'drawing' | 'reveal'

export function HatchingScreen({ scars, level, kills, lineColor, onAddMonster, onSkip }: HatchingScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [phase, setPhase] = useState<Phase>('forming')
  const [monster, setMonster] = useState<Monster | null>(null)
  const [drawProgress, setDrawProgress] = useState(0)
  const rafRef = useRef<number>(0)
  const collectionCount = getMonsterCount()
  const isFull = collectionCount >= MONSTER_CAP

  // Generate monster on mount
  useEffect(() => {
    const m = generateMonster(scars, level, kills, lineColor)
    setMonster(m)

    // Phase 1: "forming" text for 1.5 seconds
    const formingTimer = setTimeout(() => {
      setPhase('drawing')
    }, 1500)

    return () => clearTimeout(formingTimer)
  }, [scars, level, kills, lineColor])

  // Phase 2: Animate scar drawing
  useEffect(() => {
    if (phase !== 'drawing' || !monster) return

    const duration = Math.max(1000, Math.min(3000, scars.length * 30)) // 30ms per scar, clamped
    const startTime = Date.now()

    function animate() {
      const elapsed = Date.now() - startTime
      const progress = Math.min(1, elapsed / duration)
      setDrawProgress(progress)

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate)
      } else {
        // Small delay before reveal
        setTimeout(() => setPhase('reveal'), 500)
      }
    }

    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current)
  }, [phase, monster, scars.length])

  // Canvas rendering
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !monster) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animFrame = 0

    function draw() {
      ctx!.fillStyle = '#000000'
      ctx!.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

      if (phase === 'drawing' || phase === 'reveal') {
        renderMonster(ctx!, {
          scars: monster!.scars,
          offsetX: CANVAS_WIDTH / 2,
          offsetY: CANVAS_HEIGHT / 2,
          scale: 0.8,
          animate: phase === 'drawing',
          animationProgress: drawProgress,
          showEyes: phase === 'reveal',
          showStars: true,
          showAura: phase === 'reveal',
          time: Date.now(),
        })
      }

      animFrame = requestAnimationFrame(draw)
    }

    animFrame = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(animFrame)
  }, [phase, monster, drawProgress])

  const handleAdd = useCallback(() => {
    if (monster) onAddMonster(monster)
  }, [monster, onAddMonster])

  if (!monster) return null

  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black">
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="w-full h-full max-w-[700px] max-h-[700px] aspect-square"
      />

      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        {phase === 'forming' && (
          <p className="text-white/60 font-mono text-lg animate-pulse">
            A shard is forming...
          </p>
        )}

        {phase === 'reveal' && (
          <div className="pointer-events-auto flex flex-col items-center gap-3 mt-auto mb-16">
            <p className="text-white font-mono text-2xl font-bold tracking-wider">
              {monster.name}
            </p>
            <div className="flex gap-6 text-white/60 font-mono text-sm">
              <span>HP {monster.stats.hp}</span>
              <span>ATK {monster.stats.attack}</span>
            </div>
            <p className="text-white/40 font-mono text-xs">
              Level {monster.level} | {monster.kills} kills
            </p>
            <div className="flex gap-4 mt-4">
              <button
                onClick={handleAdd}
                disabled={isFull}
                className="border border-pink-500/50 text-pink-400 font-mono text-sm px-6 py-2 hover:bg-pink-500/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {isFull ? `COLLECTION FULL (${MONSTER_CAP})` : `ADD TO COLLECTION (${collectionCount}/${MONSTER_CAP})`}
              </button>
              <button
                onClick={onSkip}
                className="border border-white/30 text-white/50 font-mono text-sm px-6 py-2 hover:bg-white/10 transition-colors"
              >
                PLAY AGAIN
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Run all tests to ensure nothing breaks**

Run: `cd /Users/ryanhaugland/scar && npx vitest run`
Expected: All tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/components/HatchingScreen.tsx
git commit -m "feat: add hatching screen with animated monster reveal"
```

---

### Task 7: Wire Hatching into GameCanvas and Page

**Files:**
- Modify: `src/components/GameCanvas.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Update GameCanvas to handle hatching status**

In `src/components/GameCanvas.tsx`:

1. Add `onHatching` to the props interface (line 13):

```typescript
interface GameCanvasProps {
  onDeath: (state: GameState) => void
  onHatching: (state: GameState) => void
  onStart: () => void
}
```

2. Update the component function signature (line 17):

```typescript
export function GameCanvas({ onDeath, onHatching, onStart }: GameCanvasProps) {
```

3. In the game loop (around line 47), change the `newState.status === 'dead'` block to handle `'hatching'`:

Replace lines 47-56:
```typescript
      if (newState.status === 'dead') {
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

With:
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

4. In the status-check block (around line 69), change `'dead'` to `'hatching'`:

Replace:
```typescript
    } else if (state.status === 'dead') {
      renderDeathScreen(ctx, state)
      return
```

With:
```typescript
    } else if (state.status === 'dead' || state.status === 'hatching') {
      renderDeathScreen(ctx, state)
      return
```

5. In handleCanvasClick (around line 159), change `'dead'` to `'hatching'`:

Replace:
```typescript
    } else if (gameStatus === 'dead') {
```

With:
```typescript
    } else if (gameStatus === 'dead' || gameStatus === 'hatching') {
```

- [ ] **Step 2: Update page.tsx to wire hatching flow**

Replace the entire content of `src/app/page.tsx`:

```tsx
'use client'

import { useState, useCallback, useEffect } from 'react'
import { GameCanvas } from '@/components/GameCanvas'
import { StartScreen } from '@/components/StartScreen'
import { DeathScreen } from '@/components/DeathScreen'
import { HatchingScreen } from '@/components/HatchingScreen'
import { shareArenaPainting } from '@/lib/share'
import { getHighScore } from '@/lib/storage'
import { addMonster, getMonsterCount } from '@/lib/monsterStorage'
import type { GameState, Monster } from '@/engine/types'

export default function Home() {
  const [screen, setScreen] = useState<'start' | 'playing' | 'hatching' | 'dead'>('start')
  const [deathState, setDeathState] = useState<GameState | null>(null)
  const [highScore, setHighScore] = useState(0)
  const [monsterCount, setMonsterCount] = useState(0)
  useEffect(() => {
    setHighScore(getHighScore())
    setMonsterCount(getMonsterCount())
  }, [])

  const handleStart = useCallback(() => {
    setScreen('playing')
  }, [])

  const handleHatching = useCallback((state: GameState) => {
    setDeathState(state)
    setHighScore(state.highScore)
    setScreen('hatching')
  }, [])

  const handleDeath = useCallback((state: GameState) => {
    setDeathState(state)
    setHighScore(state.highScore)
    setScreen('dead')
  }, [])

  const handleAddMonster = useCallback((monster: Monster) => {
    addMonster(monster)
    setMonsterCount(getMonsterCount())
    setScreen('dead')
  }, [])

  const handleSkipMonster = useCallback(() => {
    setScreen('dead')
  }, [])

  const handleRestart = useCallback(() => {
    setScreen('playing')
    const canvas = document.querySelector('canvas')
    canvas?.click()
  }, [])

  const handleShare = useCallback(() => {
    const canvas = document.querySelector('canvas')
    if (canvas && deathState) {
      shareArenaPainting(canvas, deathState.score, deathState.kills)
    }
  }, [deathState])

  return (
    <div className="w-screen h-screen flex items-center justify-center bg-black relative">
      <GameCanvas onDeath={handleDeath} onHatching={handleHatching} onStart={handleStart} />

      {screen === 'start' && (
        <StartScreen highScore={highScore} onStart={handleStart} monsterCount={monsterCount} />
      )}

      {screen === 'hatching' && deathState && (
        <HatchingScreen
          scars={deathState.scars}
          level={deathState.level}
          kills={deathState.kills}
          lineColor={deathState.lineColor}
          onAddMonster={handleAddMonster}
          onSkip={handleSkipMonster}
        />
      )}

      {screen === 'dead' && deathState && (
        <DeathScreen
          score={deathState.score}
          kills={deathState.kills}
          level={deathState.level}
          highScore={deathState.highScore}
          isNewHighScore={deathState.score >= deathState.highScore}
          onRestart={handleRestart}
          onShare={handleShare}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 3: Run all tests**

Run: `cd /Users/ryanhaugland/scar && npx vitest run`
Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/components/GameCanvas.tsx src/app/page.tsx
git commit -m "feat: wire hatching screen into game flow after death"
```

---

### Task 8: Start Screen Collection Link

**Files:**
- Modify: `src/components/StartScreen.tsx`

- [ ] **Step 1: Add monsterCount prop and collection link**

Replace the entire content of `src/components/StartScreen.tsx`:

```tsx
'use client'

import Link from 'next/link'

interface StartScreenProps {
  highScore: number
  onStart: () => void
  monsterCount: number
}

export function StartScreen({ highScore, onStart, monsterCount }: StartScreenProps) {
  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none"
    >
      <h1 className="text-white font-mono text-6xl font-bold tracking-widest mb-4">
        SCAR
      </h1>
      <p className="text-pink-400/60 font-mono text-sm mb-8">
        YOUR POWER DESTROYS YOU
      </p>
      <p className="text-white/80 font-mono text-lg animate-pulse">
        TAP TO PLAY
      </p>
      {highScore > 0 && (
        <p className="text-white/40 font-mono text-xs mt-6">
          BEST: {highScore.toFixed(1)}s
        </p>
      )}
      {monsterCount > 0 && (
        <Link
          href="/collection"
          className="pointer-events-auto text-pink-400/60 font-mono text-xs mt-4 border border-pink-500/30 px-4 py-1.5 hover:bg-pink-500/10 transition-colors"
        >
          COLLECTION ({monsterCount})
        </Link>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Run all tests**

Run: `cd /Users/ryanhaugland/scar && npx vitest run`
Expected: All tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/components/StartScreen.tsx
git commit -m "feat: add collection link to start screen"
```

---

### Task 9: Monster Card Component

**Files:**
- Create: `src/components/MonsterCard.tsx`

- [ ] **Step 1: Implement MonsterCard**

Create `src/components/MonsterCard.tsx`:

```tsx
'use client'

import { useRef, useEffect } from 'react'
import type { Monster } from '@/engine/types'
import { renderMonster } from '@/engine/monsterRenderer'

interface MonsterCardProps {
  monster: Monster
  onClick: () => void
}

const CARD_SIZE = 200

export function MonsterCard({ monster, onClick }: MonsterCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animFrame = 0

    function draw() {
      ctx!.fillStyle = '#000000'
      ctx!.fillRect(0, 0, CARD_SIZE, CARD_SIZE)

      renderMonster(ctx!, {
        scars: monster.scars,
        offsetX: CARD_SIZE / 2,
        offsetY: CARD_SIZE / 2,
        scale: 0.25,
        showEyes: true,
        showStars: true,
        showAura: false,
        time: Date.now(),
      })

      animFrame = requestAnimationFrame(draw)
    }

    animFrame = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(animFrame)
  }, [monster])

  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-2 p-2 border border-white/10 hover:border-pink-500/40 transition-colors bg-black"
    >
      <canvas
        ref={canvasRef}
        width={CARD_SIZE}
        height={CARD_SIZE}
        className="w-full aspect-square"
      />
      <p className="text-white font-mono text-xs font-bold truncate w-full text-center">
        {monster.name}
      </p>
      <div className="flex gap-3 text-white/50 font-mono text-[10px]">
        <span>HP {monster.stats.hp}</span>
        <span>ATK {monster.stats.attack}</span>
      </div>
      <span className="text-pink-400/40 font-mono text-[10px]">
        LVL {monster.level}
      </span>
    </button>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/MonsterCard.tsx
git commit -m "feat: add monster card component with mini canvas render"
```

---

### Task 10: Monster Detail Component

**Files:**
- Create: `src/components/MonsterDetail.tsx`

- [ ] **Step 1: Implement MonsterDetail**

Create `src/components/MonsterDetail.tsx`:

```tsx
'use client'

import { useRef, useEffect } from 'react'
import type { Monster } from '@/engine/types'
import { renderMonster } from '@/engine/monsterRenderer'
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '@/engine/constants'

interface MonsterDetailProps {
  monster: Monster
  onRelease: () => void
  onBack: () => void
}

export function MonsterDetail({ monster, onRelease, onBack }: MonsterDetailProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animFrame = 0

    function draw() {
      ctx!.fillStyle = '#000000'
      ctx!.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

      renderMonster(ctx!, {
        scars: monster.scars,
        offsetX: CANVAS_WIDTH / 2,
        offsetY: CANVAS_HEIGHT / 2 - 40,
        scale: 0.7,
        showEyes: true,
        showStars: true,
        showAura: true,
        time: Date.now(),
      })

      animFrame = requestAnimationFrame(draw)
    }

    animFrame = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(animFrame)
  }, [monster])

  return (
    <div className="fixed inset-0 z-30 bg-black flex flex-col items-center">
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="w-full max-w-[700px] aspect-square"
      />

      <div className="flex flex-col items-center gap-3 mt-4">
        <p className="text-white font-mono text-2xl font-bold tracking-wider">
          {monster.name}
        </p>
        <div className="flex gap-6 text-white/60 font-mono text-sm">
          <span>HP {monster.stats.hp}</span>
          <span>ATK {monster.stats.attack}</span>
        </div>
        <p className="text-white/40 font-mono text-xs">
          Level {monster.level} | {monster.kills} kills
        </p>
        <p className="text-white/30 font-mono text-[10px]">
          {new Date(monster.createdAt).toLocaleDateString()}
        </p>

        <div className="flex gap-4 mt-4">
          <button
            onClick={onBack}
            className="border border-white/30 text-white/60 font-mono text-sm px-6 py-2 hover:bg-white/10 transition-colors"
          >
            BACK
          </button>
          <button
            onClick={onRelease}
            className="border border-red-500/40 text-red-400/60 font-mono text-sm px-6 py-2 hover:bg-red-500/10 transition-colors"
          >
            RELEASE
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/MonsterDetail.tsx
git commit -m "feat: add monster detail component with full canvas render"
```

---

### Task 11: Collection Grid Component

**Files:**
- Create: `src/components/CollectionGrid.tsx`

- [ ] **Step 1: Implement CollectionGrid**

Create `src/components/CollectionGrid.tsx`:

```tsx
'use client'

import { useState } from 'react'
import type { Monster } from '@/engine/types'
import { MonsterCard } from './MonsterCard'

type SortKey = 'newest' | 'hp' | 'attack' | 'level'

interface CollectionGridProps {
  monsters: Monster[]
  onSelect: (monster: Monster) => void
}

function sortMonsters(monsters: Monster[], key: SortKey): Monster[] {
  const sorted = [...monsters]
  switch (key) {
    case 'newest':
      return sorted.sort((a, b) => b.createdAt - a.createdAt)
    case 'hp':
      return sorted.sort((a, b) => b.stats.hp - a.stats.hp)
    case 'attack':
      return sorted.sort((a, b) => b.stats.attack - a.stats.attack)
    case 'level':
      return sorted.sort((a, b) => b.level - a.level)
  }
}

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'newest', label: 'NEWEST' },
  { key: 'hp', label: 'HP' },
  { key: 'attack', label: 'ATK' },
  { key: 'level', label: 'LVL' },
]

export function CollectionGrid({ monsters, onSelect }: CollectionGridProps) {
  const [sortKey, setSortKey] = useState<SortKey>('newest')
  const sorted = sortMonsters(monsters, sortKey)

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
          No monsters yet. Play SCAR to create your first!
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {sorted.map(monster => (
            <MonsterCard
              key={monster.id}
              monster={monster}
              onClick={() => onSelect(monster)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/CollectionGrid.tsx
git commit -m "feat: add sortable collection grid component"
```

---

### Task 12: Collection Page Route

**Files:**
- Create: `src/app/collection/page.tsx`

**Important:** This is Next.js 16. Before writing this file, check `node_modules/next/dist/docs/` for any App Router changes per the AGENTS.md instruction.

- [ ] **Step 1: Check Next.js 16 docs for route conventions**

Run: `ls /Users/ryanhaugland/scar/node_modules/next/dist/docs/ 2>/dev/null || echo "No docs dir"`

Use whatever route conventions the docs specify. If no docs exist, use standard App Router patterns.

- [ ] **Step 2: Implement the collection page**

Create `src/app/collection/page.tsx`:

```tsx
'use client'

import { useState, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { CollectionGrid } from '@/components/CollectionGrid'
import { MonsterDetail } from '@/components/MonsterDetail'
import { getMonsters, removeMonster } from '@/lib/monsterStorage'
import type { Monster } from '@/engine/types'

export default function CollectionPage() {
  const [monsters, setMonsters] = useState<Monster[]>([])
  const [selected, setSelected] = useState<Monster | null>(null)

  useEffect(() => {
    setMonsters(getMonsters())
  }, [])

  const handleSelect = useCallback((monster: Monster) => {
    setSelected(monster)
  }, [])

  const handleBack = useCallback(() => {
    setSelected(null)
  }, [])

  const handleRelease = useCallback(() => {
    if (!selected) return
    removeMonster(selected.id)
    setMonsters(getMonsters())
    setSelected(null)
  }, [selected])

  return (
    <div className="min-h-screen bg-black flex flex-col items-center py-8">
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/"
          className="text-white/40 font-mono text-sm hover:text-white/60 transition-colors"
        >
          &larr; BACK
        </Link>
        <h1 className="text-white font-mono text-2xl font-bold tracking-widest">
          COLLECTION
        </h1>
        <span className="text-white/30 font-mono text-sm">
          {monsters.length}/50
        </span>
      </div>

      <CollectionGrid monsters={monsters} onSelect={handleSelect} />

      {selected && (
        <MonsterDetail
          monster={selected}
          onRelease={handleRelease}
          onBack={handleBack}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 3: Run all tests**

Run: `cd /Users/ryanhaugland/scar && npx vitest run`
Expected: All tests pass.

- [ ] **Step 4: Build check**

Run: `cd /Users/ryanhaugland/scar && npx next build`
Expected: Build succeeds with no type errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/collection/page.tsx
git commit -m "feat: add /collection route with grid and detail views"
```

---

### Task 13: End-to-End Smoke Test

**Files:** None created — manual verification

- [ ] **Step 1: Run all tests**

Run: `cd /Users/ryanhaugland/scar && npx vitest run`
Expected: All tests pass (existing + new monster + storage tests).

- [ ] **Step 2: Run build**

Run: `cd /Users/ryanhaugland/scar && npx next build`
Expected: Build succeeds.

- [ ] **Step 3: Manual smoke test**

Run: `cd /Users/ryanhaugland/scar && npx next dev`

Test the following flow:
1. Start screen loads — no Collection link (empty collection)
2. Tap to play → move around → die (let enemies/scars deplete lives)
3. Hatching screen appears: "A shard is forming..." text
4. Scar lines draw in animated sequence
5. Monster revealed with name, HP, ATK stats
6. Click "Add to Collection" → transitions to death screen
7. Click "Again" → play again → die → see new monster
8. After restarting, start screen now shows "COLLECTION (1)" link
9. Click collection link → see grid with monster card
10. Tap a card → detail view with larger monster + Release button
11. Click Back → returns to grid
12. Click ← BACK → returns to start screen

- [ ] **Step 4: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: smoke test fixes for monster generation flow"
```

(Only if fixes were needed. Skip if everything works.)
