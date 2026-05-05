import type { GameState, InputState } from './types'
import { createPlayer, movePlayer, startDash, updateDash } from './player'
import { createScar } from './scar'
import { updateEnemies, spawnEnemy, getSpawnInterval } from './enemy'
import { tickTimer } from './timer'
import { checkScarCollision, checkEnemyCollision, checkDashKills } from './collision'
import { TIMER_START, PLAYER_RADIUS, ENEMY_KILL_RADIUS, GRACE_PERIOD, DASH_COOLDOWN, TIMER_PER_KILL } from './constants'

let nextEnemyId = 0
let spawnAccumulator = 0
let dashCooldown = 0

export function createGameState(highScore: number): GameState {
  return {
    status: 'idle',
    player: createPlayer(),
    scars: [],
    enemies: [],
    timer: TIMER_START,
    score: 0,
    kills: 0,
    highScore,
    startTime: 0,
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
    timer: TIMER_START,
    score: 0,
    kills: 0,
    startTime: Date.now(),
  }
}

export function tick(state: GameState, input: InputState): GameState {
  if (state.status !== 'playing') return state

  const dt = 1 / 60
  let newState = { ...state }

  // Timer
  newState.timer = tickTimer(newState.timer, dt)
  newState.score = newState.score + dt
  if (newState.timer <= 0) {
    return { ...newState, status: 'dead' }
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
      newState.scars = [...newState.scars, createScar(newState.player.dashStart, newState.player.dashEnd)]

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
        newState.timer = newState.timer + killed.length * TIMER_PER_KILL
      }
    }
  } else {
    // Move player
    newState.player = movePlayer(newState.player, input)
  }

  // Check scar collision (skip during dash)
  if (!newState.player.isDashing && newState.scars.length > 0) {
    if (checkScarCollision(newState.player.position, PLAYER_RADIUS, newState.scars)) {
      return { ...newState, status: 'dead' }
    }
  }

  // Check enemy collision (skip during dash)
  if (!newState.player.isDashing) {
    const enemyHit = checkEnemyCollision(newState.player.position, PLAYER_RADIUS, newState.enemies)
    if (enemyHit >= 0) {
      return { ...newState, status: 'dead' }
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
