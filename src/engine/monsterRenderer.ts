import type { Scar, Vec2 } from './types'

function getCentroid(scars: Scar[]): Vec2 {
  if (scars.length === 0) return { x: 0, y: 0 }
  let sumX = 0, sumY = 0, count = 0
  for (const scar of scars) {
    sumX += scar.start.x + scar.end.x
    sumY += scar.start.y + scar.end.y
    count += 2
  }
  return { x: sumX / count, y: sumY / count }
}

function getBounds(scars: Scar[]): { minX: number; minY: number; maxX: number; maxY: number } {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const scar of scars) {
    minX = Math.min(minX, scar.start.x, scar.end.x)
    minY = Math.min(minY, scar.start.y, scar.end.y)
    maxX = Math.max(maxX, scar.start.x, scar.end.x)
    maxY = Math.max(maxY, scar.start.y, scar.end.y)
  }
  return { minX, minY, maxX, maxY }
}

function getStarNodes(scars: Scar[]): Vec2[] {
  const nodes: Vec2[] = []
  for (let i = 0; i < scars.length; i++) {
    const scar = scars[i]
    if (i === 0) nodes.push(scar.start)
    nodes.push(scar.end)

    if (i > 0) {
      const prev = scars[i - 1]
      const dx1 = prev.end.x - prev.start.x
      const dy1 = prev.end.y - prev.start.y
      const dx2 = scar.end.x - scar.start.x
      const dy2 = scar.end.y - scar.start.y
      const dot = dx1 * dx2 + dy1 * dy2
      const mag1 = Math.sqrt(dx1 * dx1 + dy1 * dy1)
      const mag2 = Math.sqrt(dx2 * dx2 + dy2 * dy2)
      if (mag1 > 0 && mag2 > 0) {
        const cosAngle = dot / (mag1 * mag2)
        if (cosAngle < 0.707) {
          nodes.push(scar.start)
        }
      }
    }
  }
  return nodes
}

function getDominantColor(scars: Scar[]): string {
  if (scars.length === 0) return '#ec4899'
  const counts = new Map<string, number>()
  for (const scar of scars) {
    counts.set(scar.color, (counts.get(scar.color) ?? 0) + 1)
  }
  let maxColor = scars[0].color
  let maxCount = 0
  for (const [color, count] of counts) {
    if (count > maxCount) {
      maxCount = count
      maxColor = color
    }
  }
  return maxColor
}

export interface RenderMonsterOptions {
  scars: Scar[]
  offsetX: number
  offsetY: number
  scale: number
  animate?: boolean
  animationProgress?: number
  showEyes?: boolean
  showStars?: boolean
  showAura?: boolean
  time?: number
}

export function renderMonster(ctx: CanvasRenderingContext2D, options: RenderMonsterOptions): void {
  const {
    scars,
    offsetX,
    offsetY,
    scale,
    animate = false,
    animationProgress = 1,
    showEyes = true,
    showStars = true,
    showAura = true,
    time = Date.now(),
  } = options

  if (scars.length === 0) return

  const bounds = getBounds(scars)
  const centroid = getCentroid(scars)

  const monsterW = bounds.maxX - bounds.minX
  const monsterH = bounds.maxY - bounds.minY
  const centerX = bounds.minX + monsterW / 2
  const centerY = bounds.minY + monsterH / 2

  ctx.save()
  ctx.translate(offsetX, offsetY)
  ctx.scale(scale, scale)
  ctx.translate(-centerX, -centerY)

  const scarCount = animate ? Math.floor(scars.length * animationProgress) : scars.length

  // Particle aura
  if (showAura && !animate) {
    const dominantColor = getDominantColor(scars)
    const pulse = 0.3 + Math.sin(time / 500) * 0.15
    const auraRadius = Math.max(monsterW, monsterH) * 0.6
    const gradient = ctx.createRadialGradient(centroid.x, centroid.y, 0, centroid.x, centroid.y, auraRadius)
    gradient.addColorStop(0, dominantColor + '40')
    gradient.addColorStop(1, dominantColor + '00')
    ctx.globalAlpha = pulse
    ctx.fillStyle = gradient
    ctx.fillRect(bounds.minX - 30, bounds.minY - 30, monsterW + 60, monsterH + 60)
    ctx.globalAlpha = 1
  }

  // Constellation lines
  for (let i = 0; i < scarCount; i++) {
    const scar = scars[i]

    ctx.shadowColor = scar.color
    ctx.shadowBlur = 12
    ctx.strokeStyle = scar.color
    ctx.globalAlpha = 0.6
    ctx.lineWidth = scar.width * 0.8
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(scar.start.x, scar.start.y)
    ctx.lineTo(scar.end.x, scar.end.y)
    ctx.stroke()

    ctx.shadowBlur = 0
    ctx.strokeStyle = '#ffffff'
    ctx.globalAlpha = 0.9
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(scar.start.x, scar.start.y)
    ctx.lineTo(scar.end.x, scar.end.y)
    ctx.stroke()

    ctx.globalAlpha = 1
  }
  ctx.shadowBlur = 0

  // Star nodes
  if (showStars && scarCount > 0) {
    const visibleScars = scars.slice(0, scarCount)
    const stars = getStarNodes(visibleScars)
    const starPulse = 0.7 + Math.sin(time / 300) * 0.3

    for (const star of stars) {
      ctx.fillStyle = '#ffffff'
      ctx.globalAlpha = starPulse
      ctx.shadowColor = '#ffffff'
      ctx.shadowBlur = 8
      ctx.beginPath()
      ctx.arc(star.x, star.y, 3, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.shadowBlur = 0
    ctx.globalAlpha = 1
  }

  // Eyes
  if (showEyes && scarCount === scars.length) {
    const eyeSpacing = 8
    const eyeY = centroid.y - 5
    const eyePulse = 0.8 + Math.sin(time / 400) * 0.2
    const dominantColor = getDominantColor(scars)

    ctx.globalAlpha = eyePulse
    ctx.shadowColor = dominantColor
    ctx.shadowBlur = 10

    ctx.fillStyle = dominantColor
    ctx.beginPath()
    ctx.arc(centroid.x - eyeSpacing, eyeY, 4, 0, Math.PI * 2)
    ctx.fill()

    ctx.beginPath()
    ctx.arc(centroid.x + eyeSpacing, eyeY, 4, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = '#ffffff'
    ctx.shadowBlur = 0
    ctx.beginPath()
    ctx.arc(centroid.x - eyeSpacing, eyeY, 1.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(centroid.x + eyeSpacing, eyeY, 1.5, 0, Math.PI * 2)
    ctx.fill()

    ctx.globalAlpha = 1
    ctx.shadowBlur = 0
  }

  ctx.restore()
}
