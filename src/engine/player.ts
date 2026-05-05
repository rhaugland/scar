import type { Player, InputState, Vec2 } from './types'
import { add, scale, normalize, length } from './vec2'
import { ARENA_CENTER, PLAYER_RADIUS, PLAYER_SPEED, DASH_DISTANCE, DASH_DURATION } from './constants'
import { clampToBoundary } from './collision'

export function createPlayer(): Player {
  return {
    position: { ...ARENA_CENTER },
    radius: PLAYER_RADIUS,
    rotation: 0,
    isDashing: false,
    dashStart: null,
    dashEnd: null,
    dashProgress: 0,
  }
}

export function movePlayer(player: Player, input: InputState): Player {
  if (player.isDashing) return player

  const moveVec: Vec2 = { x: input.moveX, y: input.moveY }
  const moveLen = length(moveVec)
  if (moveLen === 0) return player

  const normalized = normalize(moveVec)
  const newPos = clampToBoundary(
    add(player.position, scale(normalized, PLAYER_SPEED)),
    player.radius
  )
  const rotation = Math.atan2(normalized.y, normalized.x)

  return { ...player, position: newPos, rotation }
}

export function startDash(player: Player, direction: Vec2): Player {
  const normalized = normalize(direction)
  const dashEnd = clampToBoundary(
    add(player.position, scale(normalized, DASH_DISTANCE)),
    player.radius
  )
  return {
    ...player,
    isDashing: true,
    dashStart: { ...player.position },
    dashEnd,
    dashProgress: 0,
    rotation: Math.atan2(normalized.y, normalized.x),
  }
}

export function updateDash(player: Player): Player {
  if (!player.isDashing || !player.dashStart || !player.dashEnd) return player

  const newProgress = player.dashProgress + 1 / DASH_DURATION

  if (newProgress >= 1) {
    return {
      ...player,
      isDashing: false,
      position: player.dashEnd,
      dashProgress: 1,
    }
  }

  const position = {
    x: player.dashStart.x + (player.dashEnd.x - player.dashStart.x) * newProgress,
    y: player.dashStart.y + (player.dashEnd.y - player.dashStart.y) * newProgress,
  }

  return { ...player, position, dashProgress: newProgress }
}
