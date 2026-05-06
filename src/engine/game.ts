import type { GameState, InputState, Goal } from './types'
import { createPlayer, movePlayer, startDash, updateDash } from './player'
import { createScar } from './scar'
import { updateEnemies, spawnEnemy } from './enemy'
import { checkScarCollision, checkEnemyCollision, checkDashKills, checkGoalReached } from './collision'
import { distance } from './vec2'
import {
  CANVAS_WIDTH, CANVAS_HEIGHT,
  PLAYER_RADIUS, ENEMY_KILL_RADIUS, GRACE_PERIOD,
  DASH_COOLDOWN, PLAYER_MAX_LIVES,
  TRAIL_MIN_DISTANCE, INVULN_FRAMES, TRAIL_SAFE_SEGMENTS,
  LINE_COLORS, getLevelConfig,
} from './constants'

let nextEnemyId = 0
let spawnAccumulator = 0
let dashCooldown = 0

function createGoal(level: number): Goal {
  const config = getLevelConfig(level)
  // Goal is always on the right side, with some randomness in Y
  const margin = config.goalRadius + 20
  return {
    position: {
      x: CANVAS_WIDTH - margin,
      y: margin + Math.random() * (CANVAS_HEIGHT - margin * 2),
    },
    radius: config.goalRadius,
    moving: config.goalMoving,
    speed: config.goalSpeed,
    angle: Math.random() * Math.PI * 2,
  }
}

function updateGoal(goal: Goal): Goal {
  if (!goal.moving) return goal
  const newAngle = goal.angle + goal.speed * (1 / 60)
  const centerY = CANVAS_HEIGHT / 2
  const range = CANVAS_HEIGHT / 2 - goal.radius - 20
  return {
    ...goal,
    angle: newAngle,
    position: {
      x: goal.position.x,
      y: centerY + Math.sin(newAngle) * range,
    },
  }
}

export function createGameState(highScore: number): GameState {
  return {
    status: 'idle',
    player: createPlayer(),
    scars: [],
    enemies: [],
    goal: createGoal(1),
    level: 1,
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
    goal: createGoal(1),
    level: 1,
    elapsed: 0,
    score: 0,
    kills: 0,
    lives: PLAYER_MAX_LIVES,
    startTime: Date.now(),
    lastTrailPos: null,
    invulnFrames: 0,
    lineColor: state.lineColor,
  }
}

export function nextLevel(state: GameState): GameState {
  const newLevel = state.level + 1
  nextEnemyId = 0
  spawnAccumulator = 0
  dashCooldown = 0
  return {
    ...state,
    status: 'playing',
    player: createPlayer(),
    scars: [],
    enemies: [],
    goal: createGoal(newLevel),
    level: newLevel,
    lastTrailPos: null,
    invulnFrames: 0,
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
  const config = getLevelConfig(state.level)
  let newState = { ...state }

  // Track time survived
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

    // Leave trail scar
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

  // Check goal reached
  if (checkGoalReached(newState.player.position, PLAYER_RADIUS, newState.goal)) {
    return { ...newState, status: 'level-complete' }
  }

  // Update goal (floating)
  newState.goal = updateGoal(newState.goal)

  // Check scar collision
  if (!newState.player.isDashing && newState.invulnFrames <= 0 && newState.scars.length > TRAIL_SAFE_SEGMENTS) {
    const checkableScars = newState.scars.slice(0, newState.scars.length - TRAIL_SAFE_SEGMENTS)
    if (checkScarCollision(newState.player.position, PLAYER_RADIUS, checkableScars)) {
      newState.lives = newState.lives - 1
      newState.invulnFrames = INVULN_FRAMES
      if (newState.lives <= 0) {
        return { ...newState, status: 'hatching' }
      }
    }
  }

  // Check enemy collision
  if (!newState.player.isDashing && newState.invulnFrames <= 0) {
    const enemyHit = checkEnemyCollision(newState.player.position, PLAYER_RADIUS, newState.enemies)
    if (enemyHit >= 0) {
      newState.enemies = newState.enemies.map((e, i) =>
        i === enemyHit ? { ...e, active: false } : e
      )
      newState.lives = newState.lives - 1
      newState.invulnFrames = INVULN_FRAMES
      if (newState.lives <= 0) {
        return { ...newState, status: 'hatching' }
      }
    }
  }

  // Update enemies
  newState.enemies = updateEnemies(newState.enemies, newState.player.position)

  // Spawn enemies (based on level config)
  const elapsed = (Date.now() - newState.startTime) / 1000
  if (elapsed > GRACE_PERIOD) {
    spawnAccumulator += dt
    const activeCount = newState.enemies.filter(e => e.active).length
    if (spawnAccumulator >= config.enemySpawnInterval && activeCount < config.enemyCount) {
      spawnAccumulator -= config.enemySpawnInterval
      newState.enemies = [...newState.enemies, spawnEnemy(nextEnemyId++, config.enemySpeed)]
    }
  }

  // Clean up inactive enemies
  newState.enemies = newState.enemies.filter(e => e.active)

  return newState
}
