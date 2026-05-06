export interface Vec2 {
  x: number
  y: number
}

export interface Scar {
  start: Vec2
  end: Vec2
  createdAt: number
  width: number
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

export type GameStatus = 'idle' | 'playing' | 'dead'

export interface GameState {
  status: GameStatus
  player: Player
  scars: Scar[]
  enemies: Enemy[]
  timer: number
  score: number
  kills: number
  lives: number
  highScore: number
  startTime: number
  lastTrailPos: Vec2 | null
  invulnFrames: number
}

export interface InputState {
  moveX: number
  moveY: number
  dashDirection: Vec2 | null
}
