# SCAR Phase 2 Sub-Project 1: Monster Generation & Collection

## Overview

When a player dies in SCAR, their scar trail lines become a "constellation monster." The monster's visual identity comes directly from the player's movement patterns during the run. Players build a collection of up to 50 monsters and can release unwanted ones.

This is the first of several sub-projects for Phase 2. Future sub-projects (not in scope here): Team Building (pick 5 fighters), Battle System (async PvP), Sharing.

## Monster Data Shape

```typescript
type Monster = {
  id: string              // crypto.randomUUID()
  name: string            // procedurally generated (prefix + suffix)
  scars: Scar[]           // raw scar trail data from the run
  stats: {
    hp: number            // levelsReached * 20
    attack: number        // kills * 5 + levelsReached * 3
  }
  level: number           // level reached when player died
  kills: number           // enemies killed during run
  lineColors: string[]    // unique line colors used during run
  createdAt: number       // Date.now() at time of death
}
```

## Monster Generation

### Trigger

Game status transitions to `'dead'` (lives reach 0). Instead of immediately showing the existing DeathScreen, the game transitions to a HatchingScreen.

### Visual Rendering (Constellation Style)

The monster renderer takes the scar array from the completed run and draws:

1. **Constellation lines** — The scar lines drawn with enhanced `shadowBlur` glow, using the per-scar colors from the run.
2. **Star nodes** — Bright dots placed at scar endpoints, line intersections, and sharp direction changes (angle > 45 degrees between consecutive segments).
3. **Eyes** — Two slightly larger, brighter dots placed near the center of mass of all scar points. Positioned symmetrically around the centroid with slight vertical offset.
4. **Particle aura** — Subtle pulsing glow particles around the bounding box of the scar data, color-matched to the dominant line color.

All rendering is client-side canvas. No AI image generation.

### Name Generation

Procedural name from two word lists:

- **Prefixes:** Void, Neon, Crimson, Shadow, Crystal, Ember, Frost, Lunar, Solar, Iron, Phantom, Storm, Ash, Drift, Pulse (15 words)
- **Suffixes:** Crawler, Shard, Fang, Wisp, Thorn, Wraith, Spark, Coil, Drifter, Bloom, Striker, Shade, Flare, Claw, Weaver (15 words)

Selection is deterministic based on monster id hash so the same monster always gets the same name. This gives 225 unique combinations.

### Stat Derivation

- **HP** = `levelsReached * 20`
- **Attack** = `kills * 5 + levelsReached * 3`

Stats are simple and fixed at creation. No randomness — your gameplay determines your monster's power.

## Hatching Screen

### Flow

`death` → HatchingScreen → Monster Reveal → Action Buttons

### Animation Sequence

1. Arena dims (existing death behavior).
2. Transition to black screen. Text fades in: "A shard is forming..."
3. Scar lines animate in, drawing themselves line-by-line in the order they were created (replay at ~8x speed).
4. Lines shift slightly toward the center of mass (subtle convergence, not dramatic reshape).
5. Star nodes flash in at key points. Eyes appear last with a brief pulse.
6. Glow intensifies across the whole figure — "hatching complete."
7. Monster name fades in above the figure. Stats (HP, Attack, Level, Kills) fade in below.
8. Action buttons appear: "Add to Collection" and "Play Again."

### Collection Full Handling

If the collection has 50 monsters, "Add to Collection" shows a mini overlay listing all monsters sorted by weakest (lowest HP + Attack). Player taps one to replace, or cancels. If they cancel, the new monster is lost.

## Collection System

### Storage

- **Key:** `scar-monsters` in localStorage
- **Schema:**
  ```typescript
  type MonsterCollection = {
    monsters: Monster[]
    version: 1
  }
  ```
- **Module:** `src/lib/monsterStorage.ts` — CRUD wrapper similar to existing `src/lib/storage.ts`
- **Cap:** 50 monsters max

### Collection Page

- **Route:** `/collection` — separate Next.js page
- **Layout:** Dark background matching game aesthetic
- **Grid:** 3 columns on mobile, responsive wider. Each card shows:
  - Small canvas rendering of the monster
  - Monster name
  - HP / Attack stats
  - Level badge
- **Detail view:** Tap a card to see larger monster render with pulsing animation, full stats, and "Release" button
- **Sorting:** Newest (default), HP, Attack, Level
- **Back:** Button returns to start screen (/)

### Start Screen Integration

- Add "Collection (N)" button on StartScreen below the play prompt
- Links to `/collection`
- N = current monster count

## New Game Status

Add `'hatching'` to the GameStatus union type:

```typescript
type GameStatus = 'idle' | 'playing' | 'paused' | 'dead' | 'hatching' | 'level-complete'
```

When lives reach 0, status goes to `'hatching'` instead of `'dead'`. The HatchingScreen component handles the animation and monster creation. After the player adds/skips the monster, status can transition to `'idle'` for restart.

## File Plan

### New Files
- `src/engine/monster.ts` — Monster type, generateMonster(), generateName(), calculateStats()
- `src/engine/monsterRenderer.ts` — Canvas rendering for constellation monsters (stars, eyes, aura)
- `src/lib/monsterStorage.ts` — localStorage CRUD for monster collection
- `src/components/HatchingScreen.tsx` — Hatching animation + reveal + action buttons
- `src/components/CollectionGrid.tsx` — Monster grid for collection page
- `src/components/MonsterCard.tsx` — Individual monster card with mini canvas
- `src/components/MonsterDetail.tsx` — Full detail view for a single monster
- `src/app/collection/page.tsx` — Collection route page
- `tests/engine/monster.test.ts` — Monster generation tests
- `tests/lib/monsterStorage.test.ts` — Storage CRUD tests

### Modified Files
- `src/engine/types.ts` — Add Monster type, add 'hatching' to GameStatus
- `src/engine/game.ts` — Transition to 'hatching' instead of 'dead' when lives = 0
- `src/components/StartScreen.tsx` — Add Collection button
- `src/components/GameCanvas.tsx` — Handle 'hatching' status, show HatchingScreen
- `src/app/page.tsx` — Wire up hatching flow

## Out of Scope

- Team building (picking 5 active fighters)
- Battle system (async PvP)
- Sharing/exporting monsters
- Backend/auth/sync
- Sound effects or music
- Monster abilities or elemental types
