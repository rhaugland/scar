# CONSTELLATIONAL — Card of the Day System

## Sub-project 1: Rebrand + Card of the Day Core

**Goal:** Transform SCAR into CONSTELLATIONAL — a daily collectible card game where every run is an attempt to unlock today's globally-shared creature card at the highest tier possible.

**Scope:** Client-side only. No backend, no AI generation (those are sub-projects 2 and 3). This sub-project delivers the rebrand, daily card mechanics, tiered unlocks, card reveal animation, and updated collection system.

---

## 1. Rebrand: SCAR → CONSTELLATIONAL

All user-facing text changes from "SCAR" to "CONSTELLATIONAL":

- **StartScreen** title: "CONSTELLATIONAL"
- **Tagline**: "COLLECT THE COSMOS"
- **Download card watermark**: "CONSTELLATIONAL"
- **Share text** in `src/lib/share.ts`: title becomes "CONSTELLATIONAL"
- **HTML page title** in `src/app/layout.tsx`: update `<title>` and meta tags
- **package.json** `name` field: `"constellational"`

**What does NOT change:**
- Internal variable names, localStorage keys, file names — no refactoring of internals
- Gameplay mechanics (enemies, scars, dashing, levels, line colors)
- Visual style (black background, neon glow, constellation rendering)

---

## 2. Daily Card Generation

### Seed & Determinism

Every day has one global card. The seed is a hash of today's date string in `"YYYY-MM-DD"` format (e.g., `"2026-05-06"`). The same date always produces the same card, on every device, for every player.

### Generated Traits (computed, never stored)

From the daily seed, deterministically generate:

| Trait | Source |
|-------|--------|
| **Creature form** | `seed % 6` → biped / quadruped / serpent / winged / spider / jellyfish |
| **Name** | `NAME_PREFIXES[seed % 15]` + `NAME_SUFFIXES[(seed >> 8) % 15]` |
| **Primary color** | `LINE_COLORS[seed % 8]` |
| **Secondary color** | `LINE_COLORS[(seed >> 4) % 8]`, re-roll if same as primary |
| **Base HP** | `50 + (seed % 50)` → range 50-99 |
| **Base ATK** | `10 + (seed % 20)` → range 10-29 |

### DailyCard Interface

```typescript
interface DailyCard {
  date: string            // "2026-05-06"
  seed: number            // hash of date string
  name: string            // deterministic from seed
  form: CreatureForm      // biped/quadruped/serpent/winged/spider/jellyfish
  primaryColor: string    // from LINE_COLORS
  secondaryColor: string  // from LINE_COLORS
  baseStats: { hp: number; attack: number }
}
```

### Function

```typescript
function generateDailyCard(dateString: string): DailyCard
```

This is a pure function. Call it with today's date to get today's card. No storage, no side effects.

---

## 3. Tier System

Three tiers based on the highest level reached in a single run that day:

| Tier | Level Required | Border Style | Stats Multiplier |
|------|---------------|-------------|-----------------|
| Bronze | Level 3 | White, dim glow | 1× base stats |
| Silver | Level 5 | Blue glow (#3b82f6) | 1.5× base stats (rounded) |
| Gold | Level 8 | Gold glow (#f59e0b) | 2× base stats |

### Tier Comparison

When a run ends, compare the player's level against their current best tier for today:
- If no tier yet and level >= 3 → unlock Bronze
- If current is Bronze and level >= 5 → upgrade to Silver
- If current is Silver and level >= 8 → upgrade to Gold
- If already Gold → no change (show "already at max tier")
- If level < 3 → no unlock

Only the **best tier** is saved. Tiers never downgrade.

---

## 4. Game Loop Changes

### Current Flow
```
Start → Play → Die → Hatching Animation → Add Monster / Skip → Death Screen → Play Again
```

### New Flow
```
Pre-Game Screen (today's card preview) → Play → Die →
  IF new/upgraded tier: Card Reveal Animation → Play Again / View Collection
  IF no tier reached: Quick Death Screen ("Need level X") → Try Again / View Collection
```

### Pre-Game Screen (replaces StartScreen)

Shows before each run:

- Title: "CONSTELLATIONAL"
- Today's card in silhouette (dim constellation outline rendered at low opacity, no aura, no eyes)
- Card name: "TODAY'S CARD: {NAME}"
- Tier requirements: "BRONZE: LVL 3 | SILVER: LVL 5 | GOLD: LVL 8"
- Current best for today: "YOUR BEST: BRONZE" or "NOT YET UNLOCKED"
- "TAP TO PLAY" prompt
- High score displayed

### On Death — Tier Earned

Card reveal sequence plays (see Section 5). After reveal:
- "PLAY AGAIN" button (chase higher tier)
- "VIEW COLLECTION" button (switches to collection tab)

### On Death — No Tier Earned

Skip reveal. Show:
- Score and kills from that run
- "REACHED LEVEL {X}"
- "NEED LEVEL {next_threshold} FOR {next_tier_name}"
- "TRY AGAIN" button
- "VIEW COLLECTION" button

---

## 5. Card Reveal Animation

Replaces the current HatchingScreen. Plays when the player unlocks a new tier or upgrades an existing one.

### Phases

1. **Flash** (0.3s)
   - Screen flashes white
   - Text appears: "CARD UNLOCKED" (new) or "TIER UPGRADED" (upgrade)

2. **Constellation Draw** (2-3s)
   - Black background
   - Edges animate in from nothing (progress 0→1)
   - Star nodes appear at 30% progress
   - Aura builds from 50% progress
   - Uses existing `renderMonster()` with `animate: true` and `animationProgress`
   - Creature rendered using today's card traits (form, colors) instead of player's scars

3. **Tier Badge** (0.5s)
   - Bronze/Silver/Gold badge pulses onto the card
   - Border color matches tier
   - Scale-in animation with slight overshoot

4. **Stats & Name** (fade in, 0.5s)
   - Card name
   - HP and ATK (tier-adjusted)
   - Tier label
   - Today's date

5. **Actions** (appear after animation completes)
   - "PLAY AGAIN" — returns to pre-game screen
   - "VIEW COLLECTION" — switches to collection tab

### Key Rendering Difference

Current system: monster rendered from player's actual `scars[]` array.
New system: creature rendered from the daily card's deterministic seed. The `renderMonster` function needs to accept a `DailyCard` seed to generate a skeleton directly, rather than hashing scar data. This means adding a code path in `monsterRenderer.ts` that builds a skeleton from a seed number + form + colors, bypassing scar data entirely.

---

## 6. Collection System

### Changes from Current System

| Current | New |
|---------|-----|
| Monster created every death | One card per day, earned through play |
| 50-monster cap | Uncapped — grows like a Pokedex |
| "Release" mechanic | No release — cards are permanent trophies |
| Sort: newest/HP/ATK/level | Sort: newest/tier/name |
| MonsterCard shows scar-based creature | Card shows daily-seed creature + tier badge |

### CollectedCard Interface

```typescript
interface CollectedCard {
  date: string              // "2026-05-06" — which day's card
  name: string              // card name (redundant but useful offline)
  tier: 'bronze' | 'silver' | 'gold'
  stats: { hp: number; attack: number }  // tier-adjusted final stats
  form: CreatureForm
  primaryColor: string
  secondaryColor: string
  bestLevel: number         // highest level reached that day
  bestKills: number         // kills from the best run
  unlockedAt: number        // timestamp of unlock/latest upgrade
}
```

### CardCollection Interface

```typescript
interface CardCollection {
  cards: CollectedCard[]
  version: 2
  todayBest: {
    date: string
    tier: 'bronze' | 'silver' | 'gold' | null
    bestLevel: number
    bestKills: number
  }
}
```

### Storage

- **Key:** `scar-monsters` (unchanged for backwards compatibility)
- **Version bump:** 1 → 2
- **Migration:** On load, if version is 1, convert existing `Monster[]` to `CollectedCard[]`:
  - `date` = ISO date string from `monster.createdAt`
  - `tier` = derived from `monster.level` (lvl 8+ → gold, lvl 5+ → silver, else bronze)
  - `stats` = keep existing stats
  - `form` = regenerate from `hashScars(monster.scars)`
  - `primaryColor` / `secondaryColor` = from `monster.lineColors`
  - `bestLevel` = `monster.level`
  - `bestKills` = `monster.kills`
  - `unlockedAt` = `monster.createdAt`

### Collection Grid Updates

- Remove sort-by-HP and sort-by-ATK options
- Add sort-by-tier (Gold first, then Silver, then Bronze)
- Keep sort-by-newest (default)
- Add sort-by-name (alphabetical)
- Each card in the grid shows a tier badge (colored border)
- Remove "release" button from detail view

### Collection Detail View

- Constellation creature rendered with full animation (eyes, aura, idle float)
- Tier badge prominently displayed
- Stats, name, date earned, best level, kills
- "DOWNLOAD" button stays (renders card image with tier border)
- No "RELEASE" button

---

## 7. Rendering Changes

### monsterRenderer.ts Updates

Add a new entry point for seed-based rendering:

```typescript
function generateSkeletonFromSeed(
  seed: number,
  form: CreatureForm,
  level: number
): CreatureSkeleton
```

This generates a skeleton deterministically from a seed number, bypassing the scar-hashing path. The existing `hashScars()` → skeleton pipeline stays for legacy/migration purposes but new cards use the seed path.

The `renderMonster` options interface adds:

```typescript
interface RenderMonsterOptions {
  scars?: Scar[]              // Now optional — used for legacy/migration only
  seed?: number               // New: deterministic seed for daily cards
  form?: CreatureForm         // New: explicit form selection
  primaryColor?: string       // New: override color
  secondaryColor?: string     // New: override color
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
// Either scars OR seed must be provided. seed takes precedence.
```

When `seed` is provided, it takes precedence over `scars` for skeleton generation and color selection.

### Card Border Rendering

Add tier-aware border rendering for both MonsterCard (grid) and MonsterDetail:

- **Bronze:** 1px white border, 30% opacity
- **Silver:** 1px blue (#3b82f6) border, 50% opacity, subtle shadowBlur 4
- **Gold:** 2px gold (#f59e0b) border, 80% opacity, shadowBlur 8, pulsing glow

---

## 8. Component Changes Summary

| Component | Change |
|-----------|--------|
| `StartScreen.tsx` | Becomes **PreGameScreen** — shows today's card silhouette, tier requirements, current best |
| `HatchingScreen.tsx` | Becomes **CardRevealScreen** — new flash/draw/badge/stats phases |
| `DeathScreen.tsx` | Updated for "no tier" case — shows level reached + next threshold |
| `MonsterCard.tsx` | Becomes **CardTile.tsx** — renders from seed instead of scars, shows tier badge |
| `MonsterDetail.tsx` | Updated — no release button, shows tier, renders from seed |
| `CollectionGrid.tsx` | Updated sort options (newest/tier/name), uses CardTile |
| `CollectionTab.tsx` | Remove release handler, update props for new data model |
| `GameCanvas.tsx` | Update death handler — pass level for tier evaluation |
| `page.tsx` | New flow: pre-game → play → reveal or death → loop |
| `TabBar.tsx` | No changes needed |
| `BattleTab.tsx` | No changes needed |

---

## 9. New Files

| File | Purpose |
|------|---------|
| `src/engine/dailyCard.ts` | `generateDailyCard(date)`, `getTierForLevel(level)`, `adjustStats(baseStats, tier)` |
| `src/lib/cardStorage.ts` | New storage layer for `CardCollection` v2, migration from v1, today's progress tracking |
| `src/components/PreGameScreen.tsx` | Today's card preview + tap to play |
| `src/components/CardRevealScreen.tsx` | Animated unlock/upgrade sequence |
| `src/components/CardTile.tsx` | Grid card (replaces MonsterCard) |

---

## 10. Files to Delete (after migration)

| File | Reason |
|------|--------|
| `src/engine/monster.ts` | Replaced by `dailyCard.ts` |
| `src/lib/monsterStorage.ts` | Replaced by `cardStorage.ts` |
| `src/components/MonsterCard.tsx` | Replaced by `CardTile.tsx` |
| `src/components/HatchingScreen.tsx` | Replaced by `CardRevealScreen.tsx` |

These are deleted only after the new components are working and migration is verified.

---

## 11. What Stays Unchanged

- `src/engine/game.ts` — core game loop, enemy spawning, collision, scoring
- `src/engine/constants.ts` — level configs, colors, canvas size (add tier thresholds)
- `src/engine/types.ts` — add new interfaces, keep existing game types
- `src/engine/monsterRenderer.ts` — extended, not replaced
- `src/components/GameCanvas.tsx` — minor prop changes only
- `src/components/TabBar.tsx` — no changes
- `src/components/BattleTab.tsx` — no changes
- All gameplay mechanics (movement, dashing, enemies, scars, levels)
