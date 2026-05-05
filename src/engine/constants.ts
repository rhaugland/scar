export const ARENA_RADIUS = 300
export const ARENA_CENTER = { x: 350, y: 350 }
export const CANVAS_SIZE = 700

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

export const TIMER_START = 10.0
export const TIMER_PER_KILL = 2.0

export const SPAWN_RATES = [
  { until: 15, interval: 2.0 },
  { until: 30, interval: 1.5 },
  { until: 60, interval: 1.0 },
  { until: Infinity, interval: 0.7 },
] as const

export const GRACE_PERIOD = 1.5

export const SCREEN_SHAKE_DURATION = 100
export const SCREEN_SHAKE_INTENSITY = 2

export const COLORS = {
  background: '#000000',
  scarCore: '#ffffff',
  scarGlow: '#ec4899',
  player: '#ffffff',
  playerGlow: '#ec4899',
  enemy: '#f97316',
  arenaRim: '#ec4899',
  timerSafe: '#ffffff',
  timerWarning: '#fbbf24',
  timerCritical: '#ef4444',
} as const
