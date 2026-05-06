import type { GameState } from './types'
import { getScarOpacity } from './scar'
import { CANVAS_SIZE, ARENA_CENTER, ARENA_RADIUS, COLORS, SCREEN_SHAKE_DURATION, SCREEN_SHAKE_INTENSITY, PLAYER_MAX_LIVES } from './constants'

let shakeUntil = 0

export function triggerScreenShake(): void {
  shakeUntil = Date.now() + SCREEN_SHAKE_DURATION
}

export function render(ctx: CanvasRenderingContext2D, state: GameState): void {
  const now = Date.now()

  // Screen shake offset
  let offsetX = 0, offsetY = 0
  if (now < shakeUntil) {
    offsetX = (Math.random() - 0.5) * SCREEN_SHAKE_INTENSITY * 2
    offsetY = (Math.random() - 0.5) * SCREEN_SHAKE_INTENSITY * 2
  }

  ctx.save()
  ctx.translate(offsetX, offsetY)

  // Clear
  ctx.fillStyle = COLORS.background
  ctx.fillRect(-10, -10, CANVAS_SIZE + 20, CANVAS_SIZE + 20)

  // Arena rim (pulsing)
  const pulse = 0.15 + Math.sin(now / 1000) * 0.05
  ctx.strokeStyle = COLORS.arenaRim
  ctx.globalAlpha = pulse
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(ARENA_CENTER.x, ARENA_CENTER.y, ARENA_RADIUS, 0, Math.PI * 2)
  ctx.stroke()
  ctx.globalAlpha = 1

  // Scars
  for (const scar of state.scars) {
    const opacity = getScarOpacity(scar.createdAt, now)

    // Glow layer (uses scar's own color)
    ctx.strokeStyle = scar.color
    ctx.globalAlpha = opacity * 0.5
    ctx.lineWidth = scar.width
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(scar.start.x, scar.start.y)
    ctx.lineTo(scar.end.x, scar.end.y)
    ctx.stroke()

    // Core layer
    ctx.strokeStyle = '#ffffff'
    ctx.globalAlpha = opacity * 0.8
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(scar.start.x, scar.start.y)
    ctx.lineTo(scar.end.x, scar.end.y)
    ctx.stroke()

    ctx.globalAlpha = 1
  }

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
  // Flash effect during invulnerability
  const showPlayer = !isInvuln || Math.floor(now / 80) % 2 === 0

  if (showPlayer) {
    ctx.save()
    ctx.translate(p.position.x, p.position.y)
    ctx.rotate(p.rotation)

    // Glow
    ctx.shadowColor = COLORS.playerGlow
    ctx.shadowBlur = p.isDashing ? 20 : 8

    // Shard shape (asymmetric polygon)
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
    // Elapsed time
    ctx.font = 'bold 28px monospace'
    ctx.textAlign = 'center'
    ctx.fillStyle = '#ffffff'
    ctx.fillText(state.elapsed.toFixed(1) + 's', ARENA_CENTER.x, 40)

    // Lives (hearts)
    ctx.font = '16px monospace'
    ctx.fillStyle = state.lineColor
    const livesText = '♥'.repeat(state.lives) + '♡'.repeat(PLAYER_MAX_LIVES - state.lives)
    ctx.fillText(livesText, ARENA_CENTER.x, 65)

    // Kills count
    ctx.font = '14px monospace'
    ctx.fillStyle = '#ffffff66'
    ctx.fillText(`${state.kills} kills`, ARENA_CENTER.x, CANVAS_SIZE - 20)

    // Current line color indicator
    ctx.fillStyle = state.lineColor
    ctx.fillRect(ARENA_CENTER.x - 10, CANVAS_SIZE - 35, 20, 3)
  }

  // Pause overlay
  if (state.status === 'paused') {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)

    ctx.font = 'bold 36px monospace'
    ctx.textAlign = 'center'
    ctx.fillStyle = '#ffffff'
    ctx.fillText('PAUSED', ARENA_CENTER.x, ARENA_CENTER.y - 30)

    ctx.font = '16px monospace'
    ctx.fillStyle = '#ffffff88'
    ctx.fillText('SPACE to resume', ARENA_CENTER.x, ARENA_CENTER.y + 10)
    ctx.fillText('C to change line color', ARENA_CENTER.x, ARENA_CENTER.y + 35)

    // Color preview
    ctx.fillStyle = state.lineColor
    ctx.beginPath()
    ctx.arc(ARENA_CENTER.x, ARENA_CENTER.y + 70, 12, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#ffffff44'
    ctx.lineWidth = 1
    ctx.stroke()
  }

  ctx.restore()
}

export function renderDeathScreen(ctx: CanvasRenderingContext2D, state: GameState): void {
  render(ctx, state)

  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)'
  ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)

  ctx.font = 'bold 36px monospace'
  ctx.textAlign = 'center'
  ctx.fillStyle = '#ffffff'
  ctx.fillText(`${state.score.toFixed(1)}s`, ARENA_CENTER.x, ARENA_CENTER.y - 20)

  ctx.font = '18px monospace'
  ctx.fillStyle = '#ffffff88'
  ctx.fillText(`${state.kills} kills`, ARENA_CENTER.x, ARENA_CENTER.y + 15)
}
