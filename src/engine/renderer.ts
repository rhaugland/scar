import type { GameState } from './types'
import { getScarOpacity } from './scar'
import { CANVAS_WIDTH, CANVAS_HEIGHT, COLORS, SCREEN_SHAKE_DURATION, SCREEN_SHAKE_INTENSITY, PLAYER_MAX_LIVES } from './constants'

let shakeUntil = 0

export function triggerScreenShake(): void {
  shakeUntil = Date.now() + SCREEN_SHAKE_DURATION
}

export function render(ctx: CanvasRenderingContext2D, state: GameState): void {
  const now = Date.now()

  // Screen shake
  let offsetX = 0, offsetY = 0
  if (now < shakeUntil) {
    offsetX = (Math.random() - 0.5) * SCREEN_SHAKE_INTENSITY * 2
    offsetY = (Math.random() - 0.5) * SCREEN_SHAKE_INTENSITY * 2
  }

  ctx.save()
  ctx.translate(offsetX, offsetY)

  // Clear
  ctx.fillStyle = COLORS.background
  ctx.fillRect(-10, -10, CANVAS_WIDTH + 20, CANVAS_HEIGHT + 20)

  // Border
  ctx.strokeStyle = COLORS.border
  ctx.globalAlpha = 0.2
  ctx.lineWidth = 2
  ctx.strokeRect(1, 1, CANVAS_WIDTH - 2, CANVAS_HEIGHT - 2)
  ctx.globalAlpha = 1

  // Scars
  for (const scar of state.scars) {
    const opacity = getScarOpacity(scar.createdAt, now)

    ctx.strokeStyle = scar.color
    ctx.globalAlpha = opacity * 0.5
    ctx.lineWidth = scar.width
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(scar.start.x, scar.start.y)
    ctx.lineTo(scar.end.x, scar.end.y)
    ctx.stroke()

    ctx.strokeStyle = '#ffffff'
    ctx.globalAlpha = opacity * 0.8
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(scar.start.x, scar.start.y)
    ctx.lineTo(scar.end.x, scar.end.y)
    ctx.stroke()

    ctx.globalAlpha = 1
  }

  // Goal
  const g = state.goal
  const goalPulse = 0.6 + Math.sin(now / 200) * 0.4
  ctx.shadowColor = COLORS.goalGlow
  ctx.shadowBlur = 15

  ctx.fillStyle = COLORS.goal
  ctx.globalAlpha = goalPulse
  ctx.beginPath()
  ctx.arc(g.position.x, g.position.y, g.radius, 0, Math.PI * 2)
  ctx.fill()

  // Goal ring
  ctx.strokeStyle = COLORS.goalGlow
  ctx.globalAlpha = 0.3
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(g.position.x, g.position.y, g.radius + 5 + Math.sin(now / 300) * 3, 0, Math.PI * 2)
  ctx.stroke()

  ctx.shadowBlur = 0
  ctx.globalAlpha = 1

  // Enemies
  for (const enemy of state.enemies) {
    if (!enemy.active) continue
    ctx.fillStyle = COLORS.enemy
    ctx.globalAlpha = 0.7
    ctx.beginPath()
    ctx.arc(enemy.position.x, enemy.position.y, enemy.radius, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1
  }

  // Player shard
  const p = state.player
  const isInvuln = state.invulnFrames > 0
  const showPlayer = !isInvuln || Math.floor(now / 80) % 2 === 0

  if (showPlayer) {
    ctx.save()
    ctx.translate(p.position.x, p.position.y)
    ctx.rotate(p.rotation)

    ctx.shadowColor = COLORS.playerGlow
    ctx.shadowBlur = p.isDashing ? 20 : 8

    const sx = p.isDashing ? 1.8 : 1
    const sy = p.isDashing ? 0.6 : 1
    ctx.scale(sx, sy)

    ctx.fillStyle = COLORS.player
    ctx.globalAlpha = 0.9
    ctx.beginPath()
    ctx.moveTo(14, 0)
    ctx.lineTo(-4, -8)
    ctx.lineTo(-10, -3)
    ctx.lineTo(-8, 4)
    ctx.lineTo(-2, 9)
    ctx.closePath()
    ctx.fill()

    ctx.shadowBlur = 0
    ctx.globalAlpha = 1
    ctx.restore()
  }

  // HUD
  if (state.status === 'playing' || state.status === 'paused') {
    // Level
    ctx.font = 'bold 20px monospace'
    ctx.textAlign = 'left'
    ctx.fillStyle = '#ffffff'
    ctx.fillText(`LVL ${state.level}`, 12, 28)

    // Elapsed time
    ctx.font = '14px monospace'
    ctx.fillStyle = '#ffffff66'
    ctx.fillText(state.elapsed.toFixed(1) + 's', 12, 48)

    // Lives (hearts)
    ctx.font = '16px monospace'
    ctx.textAlign = 'right'
    ctx.fillStyle = state.lineColor
    const livesText = '♥'.repeat(state.lives) + '♡'.repeat(PLAYER_MAX_LIVES - state.lives)
    ctx.fillText(livesText, CANVAS_WIDTH - 12, 28)

    // Kills
    ctx.font = '14px monospace'
    ctx.fillStyle = '#ffffff66'
    ctx.textAlign = 'center'
    ctx.fillText(`${state.kills} kills`, CANVAS_WIDTH / 2, CANVAS_HEIGHT - 12)

    // Current line color bar
    ctx.fillStyle = state.lineColor
    ctx.fillRect(CANVAS_WIDTH / 2 - 10, CANVAS_HEIGHT - 28, 20, 3)
  }

  // Pause overlay
  if (state.status === 'paused') {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

    ctx.font = 'bold 36px monospace'
    ctx.textAlign = 'center'
    ctx.fillStyle = '#ffffff'
    ctx.fillText('PAUSED', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 30)

    ctx.font = '16px monospace'
    ctx.fillStyle = '#ffffff88'
    ctx.fillText('SPACE to resume', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 10)
    ctx.fillText('C to change line color', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 35)

    ctx.fillStyle = state.lineColor
    ctx.beginPath()
    ctx.arc(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 70, 12, 0, Math.PI * 2)
    ctx.fill()
  }

  // Level complete overlay
  if (state.status === 'level-complete') {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

    ctx.font = 'bold 36px monospace'
    ctx.textAlign = 'center'
    ctx.fillStyle = COLORS.goal
    ctx.fillText(`LEVEL ${state.level} CLEAR`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20)

    ctx.font = '16px monospace'
    ctx.fillStyle = '#ffffff88'
    ctx.fillText('click for next level', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 20)
  }

  ctx.restore()
}

export function renderDeathScreen(ctx: CanvasRenderingContext2D, state: GameState): void {
  render(ctx, state)

  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)'
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
}
