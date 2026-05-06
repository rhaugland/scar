import type { GameState, InputState } from './types'
import { createPlayer, movePlayer, startDash, updateDash } from './player'
import { createScar } from './scar'
import { updateEnemies, spawnEnemy, getSpawnInterval } from './enemy'
import { checkScarCollision, checkEnemyCollision, checkDashKills } from './collision'
import { distance } from './vec2'
import {
  PLAYER_RADIUS, ENEMY_KILL_RADIUS, GRACE_PERIOD,
  DASH_COOLDOWN, TIMER_PER_KILL, PLAYER_MAX_LIVES,
  TRAIL_MIN_DISTANCE, INVULN_FRAMES, TRAIL_SAFE_SEGMENTS,
  LINE_COLORS,
} from './constants'

let nextEnemyId = 0
let spawnAccumulator = 0
let dashCooldown = 0

export function createGameState(highScore: number): GameState {
  return {
    status: 'idle',
    player: createPlayer(),
    scars: [],
    enemies: [],
    elapsed: 0,
    score: 0,
    kills: 0,
    lives: PLAYER_MAX_LIVES,
    highScore,
    startTime: 0,
    lastTrailPos: null,
    invulnFrames: 0,
    lineColor: LINE_COLORS[0],
  }
}

export function startGame(state: GameState): GameState {
  nextEnemyId = 0
  spawnAccumulator = 0
  dashCooldown = 0
  return {
    ...state,
    status: 'playing',
    player: createPlayer(),
    scars: [],
    enemies: [],
    elapsed: 0,
    score: 0,
    kills: 0,
    lives: PLAYER_MAX_LIVES,
    startTime: Date.now(),
    lastTrailPos: null,
    invulnFrames: 0,
    lineColor: LINE_COLORS[0],
  }
}

export function togglePause(state: GameState): GameState {
  if (state.status === 'playing') return { ...state, status: 'paused' }
  if (state.status === 'paused') return { ...state, status: 'playing' }
  return state
}

export function changeLineColor(state: GameState): GameState {
  const currentIdx = LINE_COLORS.indexOf(state.lineColor as typeof LINE_COLORS[number])
  const nextIdx = (currentIdx + 1) % LINE_COLORS.length
  return { ...state, lineColor: LINE_COLORS[nextIdx] }
}

export function tick(state: GameState, input: InputState): GameState {
  if (state.status !== 'playing') return state

  const dt = 1 / 60
  let newState = { ...state }

  // Track time survived (no countdown — just counting up)
  newState.elapsed = newState.elapsed + dt
  newState.score = newState.elapsed

  // Invulnerability countdown
  if (newState.invulnFrames > 0) {
    newState.invulnFrames = newState.invulnFrames - 1
  }

  // Dash cooldown
  if (dashCooldown > 0) dashCooldown--

  // Handle dash input
  if (input.dashDirection && !newState.player.isDashing && dashCooldown <= 0) {
    newState.player = startDash(newState.player, input.dashDirection)
    dashCooldown = DASH_COOLDOWN
  }

  // Update dash
  if (newState.player.isDashing) {
    const wasDashing = newState.player.isDashing
    newState.player = updateDash(newState.player)

    // Dash just completed — create scar and check kills
    if (wasDashing && !newState.player.isDashing && newState.player.dashStart && newState.player.dashEnd) {
      newState.scars = [...newState.scars, createScar(newState.player.dashStart, newState.player.dashEnd, newState.lineColor)]
      newState.lastTrailPos = { ...newState.player.position }

      const killed = checkDashKills(
        newState.player.dashStart,
        newState.player.dashEnd,
        ENEMY_KILL_RADIUS,
        newState.enemies
      )
      if (killed.length > 0) {
        newState.enemies = newState.enemies.map((e, i) =>
          killed.includes(i) ? { ...e, active: false } : e
        )
        newState.kills += killed.length
      }
    }
  } else {
    // Move player
    const prevPos = { ...newState.player.position }
    newState.player = movePlayer(newState.player, input)

    // Leave trail scar when player moves far enough
    const moved = input.moveX !== 0 || input.moveY !== 0
    if (moved) {
      if (!newState.lastTrailPos) {
        newState.lastTrailPos = prevPos
      } else {
        const dist = distance(newState.player.position, newState.lastTrailPos)
        if (dist >= TRAIL_MIN_DISTANCE) {
          newState.scars = [...newState.scars, createScar(newState.lastTrailPos, { ...newState.player.position }, newState.lineColor)]
          newState.lastTrailPos = { ...newState.player.position }
        }
      }
    }
  }

  // Check scar collision (skip during dash and invulnerability)
  if (!newState.player.isDashing && newState.invulnFrames <= 0 && newState.scars.length > TRAIL_SAFE_SEGMENTS) {
    const checkableScars = newState.scars.slice(0, newState.scars.length - TRAIL_SAFE_SEGMENTS)
    if (checkScarCollision(newState.player.position, PLAYER_RADIUS, checkableScars)) {
      newState.lives = newState.lives - 1
      newState.invulnFrames = INVULN_FRAMES
      if (newState.lives <= 0) {
        return { ...newState, status: 'dead' }
      }
    }
  }

  // Check enemy collision (skip during dash) — costs 1 life
  if (!newState.player.isDashing && newState.invulnFrames <= 0) {
    const enemyHit = checkEnemyCollision(newState.player.position, PLAYER_RADIUS, newState.enemies)
    if (enemyHit >= 0) {
      newState.enemies = newState.enemies.map((e, i) =>
        i === enemyHit ? { ...e, active: false } : e
      )
      newState.lives = newState.lives - 1
      newState.invulnFrames = INVULN_FRAMES
      if (newState.lives <= 0) {
        return { ...newState, status: 'dead' }
      }
    }
  }

  // Update enemies
  newState.enemies = updateEnemies(newState.enemies, newState.player.position)

  // Spawn enemies
  const elapsed = (Date.now() - newState.startTime) / 1000
  if (elapsed > GRACE_PERIOD) {
    const interval = getSpawnInterval(elapsed)
    spawnAccumulator += dt
    if (spawnAccumulator >= interval) {
      spawnAccumulator -= interval
      newState.enemies = [...newState.enemies, spawnEnemy(nextEnemyId++)]
    }
  }

  // Clean up inactive enemies
  newState.enemies = newState.enemies.filter(e => e.active)

  return newState
}
