export interface Vec2 {
  x: number
  y: number
}

export interface Scar {
  start: Vec2
  end: Vec2
  createdAt: number
  width: number
  color: string
}

export interface Enemy {
  id: number
  position: Vec2
  radius: number
  speed: number
  active: boolean
}

export interface Player {
  position: Vec2
  radius: number
  rotation: number
  isDashing: boolean
  dashStart: Vec2 | null
  dashEnd: Vec2 | null
  dashProgress: number
}

export interface Goal {
  position: Vec2
  radius: number
  moving: boolean
  speed: number
  angle: number  // for circular floating motion
}

export type GameStatus = 'idle' | 'playing' | 'paused' | 'dead' | 'hatching' | 'level-complete'

export interface GameState {
  status: GameStatus
  player: Player
  scars: Scar[]
  enemies: Enemy[]
  goal: Goal
  level: number
  elapsed: number
  score: number
  kills: number
  lives: number
  highScore: number
  startTime: number
  lastTrailPos: Vec2 | null
  invulnFrames: number
  lineColor: string
}

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

export interface InputState {
  moveX: number
  moveY: number
  dashDirection: Vec2 | null
}
