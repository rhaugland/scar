export const CANVAS_WIDTH = 700
export const CANVAS_HEIGHT = 700

export const PLAYER_RADIUS = 10
export const PLAYER_SPEED = 3.5
export const DASH_DISTANCE = 150
export const DASH_DURATION = 8
export const DASH_COOLDOWN = 10

export const SCAR_WIDTH = 6
export const SCAR_DIM_TIME = 5000
export const SCAR_MIN_OPACITY = 0.6

export const ENEMY_RADIUS = 10
export const ENEMY_SPEED = 1.5
export const ENEMY_KILL_RADIUS = 15

export const TIMER_PER_KILL = 2.0

export const GRACE_PERIOD = 1.5

export const PLAYER_MAX_LIVES = 5

export const TRAIL_MIN_DISTANCE = 15
export const INVULN_FRAMES = 60
export const TRAIL_SAFE_SEGMENTS = 3

export const SCREEN_SHAKE_DURATION = 100
export const SCREEN_SHAKE_INTENSITY = 2

export const LINE_COLORS = [
  '#ec4899', // pink
  '#3b82f6', // blue
  '#22c55e', // green
  '#f59e0b', // amber
  '#8b5cf6', // purple
  '#ef4444', // red
  '#06b6d4', // cyan
  '#f97316', // orange
] as const

export const COLORS = {
  background: '#000000',
  scarCore: '#ffffff',
  scarGlow: '#ec4899',
  player: '#ffffff',
  playerGlow: '#ec4899',
  enemy: '#f97316',
  border: '#ec4899',
  goal: '#22c55e',
  goalGlow: '#4ade80',
  timerSafe: '#ffffff',
  timerWarning: '#fbbf24',
  timerCritical: '#ef4444',
} as const

// Level configuration generator
export interface LevelConfig {
  level: number
  goalRadius: number
  goalMoving: boolean
  goalSpeed: number
  enemySpawnInterval: number
  enemySpeed: number
  enemyCount: number  // max enemies at once
}

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

export function getLevelConfig(level: number): LevelConfig {
  return {
    level,
    goalRadius: Math.max(8, 30 - level * 3),       // shrinks: 30, 27, 24, 21, 18, 15, 12, 9, 8...
    goalMoving: level >= 3,                           // starts floating at level 3
    goalSpeed: level >= 3 ? 0.5 + (level - 3) * 0.3 : 0, // gets faster
    enemySpawnInterval: Math.max(0.4, 2.0 - level * 0.2), // faster spawns
    enemySpeed: 1.5 + level * 0.2,                   // faster enemies
    enemyCount: 3 + level * 2,                        // more enemies
  }
}
