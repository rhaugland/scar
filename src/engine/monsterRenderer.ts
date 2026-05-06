import type { Scar, Vec2 } from './types'

// --- Seeded PRNG for deterministic creature generation ---

function seededRandom(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff
    return (s >>> 0) / 0xffffffff
  }
}

function hashScars(scars: Scar[]): number {
  let hash = 0
  for (const s of scars) {
    hash = ((hash << 5) - hash) + Math.floor(s.start.x * 7 + s.start.y * 13 + s.end.x * 19 + s.end.y * 23)
    hash = hash & hash
  }
  return Math.abs(hash) || 1
}

// --- Color helpers ---

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [parseInt(h.substring(0, 2), 16), parseInt(h.substring(2, 4), 16), parseInt(h.substring(4, 6), 16)]
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(c => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, '0')).join('')
}

function lighten(hex: string, amt: number): string {
  const [r, g, b] = hexToRgb(hex)
  return rgbToHex(r + (255 - r) * amt, g + (255 - g) * amt, b + (255 - b) * amt)
}

function darken(hex: string, amt: number): string {
  const [r, g, b] = hexToRgb(hex)
  return rgbToHex(r * (1 - amt), g * (1 - amt), b * (1 - amt))
}

function getDominantColor(scars: Scar[]): string {
  if (scars.length === 0) return '#ec4899'
  const counts = new Map<string, number>()
  for (const scar of scars) {
    counts.set(scar.color, (counts.get(scar.color) ?? 0) + 1)
  }
  let best = scars[0].color, bestN = 0
  for (const [c, n] of counts) { if (n > bestN) { best = c; bestN = n } }
  return best
}

function getSecondaryColor(scars: Scar[], primary: string): string {
  const counts = new Map<string, number>()
  for (const scar of scars) {
    if (scar.color !== primary) counts.set(scar.color, (counts.get(scar.color) ?? 0) + 1)
  }
  let best = lighten(primary, 0.3), bestN = 0
  for (const [c, n] of counts) { if (n > bestN) { best = c; bestN = n } }
  return best
}

// --- Body shape types ---

type BodyType = 'round' | 'tall' | 'wide' | 'teardrop' | 'star'

function pickBodyType(rng: () => number): BodyType {
  const types: BodyType[] = ['round', 'tall', 'wide', 'teardrop', 'star']
  return types[Math.floor(rng() * types.length)]
}

// Draw a smooth body shape centered at (cx, cy)
function drawBody(
  ctx: CanvasRenderingContext2D, cx: number, cy: number,
  w: number, h: number, bodyType: BodyType,
  primaryColor: string, secondaryColor: string, time: number
) {
  // Breathing animation
  const breathe = 1 + Math.sin(time / 800) * 0.02
  const bw = w * breathe
  const bh = h * breathe

  // Body gradient
  const grad = ctx.createRadialGradient(
    cx - bw * 0.15, cy - bh * 0.2, 0,
    cx, cy, Math.max(bw, bh) * 0.55
  )
  grad.addColorStop(0, lighten(primaryColor, 0.25))
  grad.addColorStop(0.6, primaryColor)
  grad.addColorStop(1, darken(primaryColor, 0.3))

  ctx.fillStyle = grad
  ctx.shadowColor = primaryColor
  ctx.shadowBlur = 12

  ctx.beginPath()
  switch (bodyType) {
    case 'round':
      ctx.ellipse(cx, cy, bw * 0.45, bh * 0.45, 0, 0, Math.PI * 2)
      break
    case 'tall':
      drawRoundedRect(ctx, cx, cy, bw * 0.35, bh * 0.5, bw * 0.15)
      break
    case 'wide':
      ctx.ellipse(cx, cy, bw * 0.5, bh * 0.35, 0, 0, Math.PI * 2)
      break
    case 'teardrop':
      drawTeardrop(ctx, cx, cy, bw * 0.4, bh * 0.5)
      break
    case 'star':
      drawBlobStar(ctx, cx, cy, bw * 0.45, bh * 0.45, 5)
      break
  }
  ctx.fill()
  ctx.shadowBlur = 0

  // Subtle outline
  ctx.strokeStyle = darken(primaryColor, 0.4)
  ctx.lineWidth = 2
  ctx.stroke()

  // Belly patch
  ctx.fillStyle = lighten(primaryColor, 0.35)
  ctx.globalAlpha = 0.5
  ctx.beginPath()
  ctx.ellipse(cx, cy + bh * 0.08, bw * 0.22, bh * 0.2, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.globalAlpha = 1
}

function drawRoundedRect(ctx: CanvasRenderingContext2D, cx: number, cy: number, hw: number, hh: number, r: number) {
  const x = cx - hw, y = cy - hh, w = hw * 2, h = hh * 2
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
}

function drawTeardrop(ctx: CanvasRenderingContext2D, cx: number, cy: number, w: number, h: number) {
  ctx.moveTo(cx, cy - h)
  ctx.bezierCurveTo(cx + w * 1.2, cy - h * 0.3, cx + w, cy + h * 0.5, cx, cy + h)
  ctx.bezierCurveTo(cx - w, cy + h * 0.5, cx - w * 1.2, cy - h * 0.3, cx, cy - h)
}

function drawBlobStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, points: number) {
  for (let i = 0; i <= points * 2; i++) {
    const angle = (i * Math.PI) / points - Math.PI / 2
    const r = i % 2 === 0 ? 1 : 0.7
    const x = cx + Math.cos(angle) * rx * r
    const y = cy + Math.sin(angle) * ry * r
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.closePath()
}

// --- Eyes ---

type EyeStyle = 'round' | 'cute' | 'narrow' | 'dot'

function drawEyes(
  ctx: CanvasRenderingContext2D, cx: number, cy: number,
  bodyW: number, bodyH: number, level: number,
  eyeStyle: EyeStyle, primaryColor: string, time: number
) {
  const spacing = bodyW * 0.14
  const eyeY = cy - bodyH * 0.1
  const size = bodyW * 0.08 + 2

  const lookX = Math.sin(time / 2500) * 2
  const lookY = Math.cos(time / 3500) * 1
  const blink = Math.sin(time / 2200) > 0.93 ? 0.15 : 1

  for (const side of [-1, 1]) {
    const ex = cx + side * spacing + lookX
    const ey = eyeY + lookY

    switch (eyeStyle) {
      case 'round':
      case 'cute': {
        // White
        ctx.fillStyle = '#ffffff'
        ctx.shadowColor = '#ffffff'
        ctx.shadowBlur = 4
        ctx.beginPath()
        const scaleY = eyeStyle === 'cute' ? 1.2 : 1
        ctx.ellipse(ex, ey, size, size * scaleY * blink, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.shadowBlur = 0

        // Iris
        ctx.fillStyle = darken(primaryColor, 0.2)
        const irisR = size * 0.6
        ctx.beginPath()
        ctx.arc(ex + lookX * 0.5, ey + lookY * 0.3, irisR * blink, 0, Math.PI * 2)
        ctx.fill()

        // Pupil
        ctx.fillStyle = '#111111'
        ctx.beginPath()
        ctx.arc(ex + lookX * 0.7, ey + lookY * 0.4, irisR * 0.55 * blink, 0, Math.PI * 2)
        ctx.fill()

        // Highlight
        ctx.fillStyle = '#ffffff'
        ctx.beginPath()
        ctx.arc(ex + size * 0.25, ey - size * 0.25, size * 0.25, 0, Math.PI * 2)
        ctx.fill()
        if (eyeStyle === 'cute') {
          ctx.beginPath()
          ctx.arc(ex - size * 0.15, ey + size * 0.15, size * 0.12, 0, Math.PI * 2)
          ctx.fill()
        }
        break
      }
      case 'narrow': {
        ctx.fillStyle = '#ffffff'
        ctx.beginPath()
        ctx.ellipse(ex, ey, size * 1.2, size * 0.5 * blink, side * 0.15, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#111111'
        ctx.beginPath()
        ctx.ellipse(ex + lookX * 0.5, ey, size * 0.5, size * 0.35 * blink, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#ffffff'
        ctx.beginPath()
        ctx.arc(ex + size * 0.3, ey - size * 0.15, size * 0.15, 0, Math.PI * 2)
        ctx.fill()
        break
      }
      case 'dot': {
        ctx.fillStyle = '#111111'
        ctx.beginPath()
        ctx.arc(ex, ey, size * 0.5 * blink, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#ffffff'
        ctx.beginPath()
        ctx.arc(ex + size * 0.15, ey - size * 0.15, size * 0.18, 0, Math.PI * 2)
        ctx.fill()
        break
      }
    }
  }

  // Extra eyes at level 7+
  if (level >= 7) {
    const extraY = eyeY - bodyH * 0.1
    ctx.fillStyle = primaryColor
    ctx.globalAlpha = 0.6
    for (const side of [-1, 1]) {
      ctx.beginPath()
      ctx.arc(cx + side * spacing * 1.6, extraY, size * 0.5, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#ffffff'
      ctx.globalAlpha = 0.8
      ctx.beginPath()
      ctx.arc(cx + side * spacing * 1.6 + 1, extraY - 1, size * 0.15, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = primaryColor
      ctx.globalAlpha = 0.6
    }
    ctx.globalAlpha = 1
  }
}

// --- Mouth ---

type MouthStyle = 'smile' | 'open' | 'fangs' | 'beak'

function drawMouth(
  ctx: CanvasRenderingContext2D, cx: number, cy: number,
  bodyW: number, bodyH: number, level: number,
  mouthStyle: MouthStyle, primaryColor: string, time: number
) {
  const my = cy + bodyH * 0.1
  const mw = bodyW * 0.12 + level

  switch (mouthStyle) {
    case 'smile': {
      ctx.strokeStyle = darken(primaryColor, 0.5)
      ctx.lineWidth = 2
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.arc(cx, my - mw * 0.3, mw, 0.2, Math.PI - 0.2)
      ctx.stroke()
      break
    }
    case 'open': {
      // Open mouth with tongue
      ctx.fillStyle = darken(primaryColor, 0.6)
      ctx.beginPath()
      ctx.ellipse(cx, my, mw * 0.6, mw * 0.4, 0, 0, Math.PI * 2)
      ctx.fill()
      // Tongue
      ctx.fillStyle = '#e85d75'
      ctx.beginPath()
      ctx.ellipse(cx, my + mw * 0.15, mw * 0.3, mw * 0.2, 0, 0, Math.PI)
      ctx.fill()
      break
    }
    case 'fangs': {
      ctx.fillStyle = darken(primaryColor, 0.6)
      ctx.beginPath()
      ctx.ellipse(cx, my, mw * 0.7, mw * 0.35, 0, 0, Math.PI * 2)
      ctx.fill()
      // Teeth
      ctx.fillStyle = '#ffffff'
      const tw = mw * 0.15
      for (let i = 0; i < 5; i++) {
        const tx = cx - mw * 0.5 + (i + 0.5) * (mw / 5) * 2
        ctx.beginPath()
        ctx.moveTo(tx - tw, my - mw * 0.25)
        ctx.lineTo(tx, my + mw * 0.05)
        ctx.lineTo(tx + tw, my - mw * 0.25)
        ctx.fill()
      }
      // Bottom fangs
      for (const side of [-1, 1]) {
        ctx.beginPath()
        const fx = cx + side * mw * 0.35
        ctx.moveTo(fx - tw, my + mw * 0.25)
        ctx.lineTo(fx, my - mw * 0.05)
        ctx.lineTo(fx + tw, my + mw * 0.25)
        ctx.fill()
      }
      break
    }
    case 'beak': {
      ctx.fillStyle = darken(primaryColor, 0.15)
      ctx.beginPath()
      ctx.moveTo(cx - mw * 0.5, my - mw * 0.1)
      ctx.lineTo(cx, my + mw * 0.5)
      ctx.lineTo(cx + mw * 0.5, my - mw * 0.1)
      ctx.closePath()
      ctx.fill()
      ctx.strokeStyle = darken(primaryColor, 0.5)
      ctx.lineWidth = 1.5
      ctx.stroke()
      // Mouth line
      ctx.strokeStyle = darken(primaryColor, 0.6)
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(cx - mw * 0.35, my + mw * 0.05)
      ctx.lineTo(cx + mw * 0.35, my + mw * 0.05)
      ctx.stroke()
      break
    }
  }
}

// --- Appendages ---

type AppendageStyle = 'arms' | 'tentacles' | 'wings' | 'flippers'

function drawAppendages(
  ctx: CanvasRenderingContext2D, cx: number, cy: number,
  bodyW: number, bodyH: number, level: number,
  style: AppendageStyle, color: string, time: number, rng: () => number
) {
  const limbColor = darken(color, 0.15)
  const sway = Math.sin(time / 600) * 6

  switch (style) {
    case 'arms': {
      const count = Math.min(1 + Math.floor((level - 2) / 3), 3)
      for (let i = 0; i < count; i++) {
        const yOff = -bodyH * 0.05 + i * bodyH * 0.18
        const armLen = bodyW * 0.25 + level * 2
        for (const side of [-1, 1]) {
          const sx = cx + side * bodyW * 0.4
          const sy = cy + yOff
          const ex = sx + side * armLen
          const ey = sy + armLen * 0.3 + sway * (i + 1) * 0.3

          ctx.strokeStyle = limbColor
          ctx.lineWidth = 5 + level * 0.3
          ctx.lineCap = 'round'
          ctx.lineJoin = 'round'
          ctx.beginPath()
          ctx.moveTo(sx, sy)
          ctx.quadraticCurveTo(sx + side * armLen * 0.6, sy - 8 + sway, ex, ey)
          ctx.stroke()

          // Hand/paw
          ctx.fillStyle = lighten(color, 0.1)
          ctx.beginPath()
          ctx.arc(ex, ey, 5 + level * 0.5, 0, Math.PI * 2)
          ctx.fill()
        }
      }
      break
    }
    case 'tentacles': {
      const count = 2 + Math.min(Math.floor(level / 2), 4)
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI + Math.PI * 0.0
        const sx = cx + Math.cos(angle) * bodyW * 0.3
        const sy = cy + bodyH * 0.3
        const tentLen = bodyH * 0.35 + level * 3
        const wave = Math.sin(time / 400 + i * 1.2) * 12

        ctx.strokeStyle = limbColor
        ctx.lineWidth = 4
        ctx.lineCap = 'round'
        ctx.beginPath()
        ctx.moveTo(sx, sy)
        ctx.bezierCurveTo(
          sx + wave, sy + tentLen * 0.4,
          sx - wave * 0.5, sy + tentLen * 0.7,
          sx + wave * 0.3, sy + tentLen
        )
        ctx.stroke()

        // Suction cups
        ctx.fillStyle = lighten(color, 0.3)
        for (let j = 1; j <= 3; j++) {
          const t = j / 4
          const px = sx + wave * t * Math.sin(t * 3)
          const py = sy + tentLen * t
          ctx.beginPath()
          ctx.arc(px, py, 2, 0, Math.PI * 2)
          ctx.fill()
        }
      }
      break
    }
    case 'wings': {
      const wingW = bodyW * 0.5 + level * 3
      const wingH = bodyH * 0.4
      const flap = Math.sin(time / 300) * 0.15

      for (const side of [-1, 1]) {
        ctx.save()
        ctx.translate(cx + side * bodyW * 0.35, cy - bodyH * 0.15)
        ctx.scale(side, 1)
        ctx.rotate(flap)

        ctx.fillStyle = lighten(color, 0.15)
        ctx.globalAlpha = 0.85
        ctx.beginPath()
        ctx.moveTo(0, 0)
        ctx.bezierCurveTo(wingW * 0.3, -wingH * 0.8, wingW * 0.8, -wingH * 0.5, wingW, -wingH * 0.2)
        ctx.bezierCurveTo(wingW * 0.7, wingH * 0.1, wingW * 0.3, wingH * 0.2, 0, wingH * 0.1)
        ctx.closePath()
        ctx.fill()

        // Wing membrane lines
        ctx.strokeStyle = darken(color, 0.2)
        ctx.lineWidth = 1
        ctx.globalAlpha = 0.4
        for (let i = 1; i <= 3; i++) {
          const t = i / 4
          ctx.beginPath()
          ctx.moveTo(0, 0)
          ctx.quadraticCurveTo(wingW * t * 0.8, -wingH * t * 0.5, wingW * t, -wingH * 0.1 * t)
          ctx.stroke()
        }
        ctx.globalAlpha = 1

        ctx.restore()
      }
      break
    }
    case 'flippers': {
      const flipLen = bodyW * 0.3 + level * 2
      const wiggle = Math.sin(time / 500) * 8

      for (const side of [-1, 1]) {
        const sx = cx + side * bodyW * 0.38
        const sy = cy + bodyH * 0.05

        ctx.fillStyle = limbColor
        ctx.beginPath()
        ctx.ellipse(
          sx + side * flipLen * 0.4, sy + wiggle * side,
          flipLen * 0.5, flipLen * 0.2,
          side * 0.4 + Math.sin(time / 500) * 0.1, 0, Math.PI * 2
        )
        ctx.fill()
      }
      break
    }
  }
}

// --- Legs ---

function drawLegs(
  ctx: CanvasRenderingContext2D, cx: number, cy: number,
  bodyW: number, bodyH: number, level: number,
  color: string, time: number, rng: () => number
) {
  const legColor = darken(color, 0.15)
  const count = Math.min(1 + Math.floor(level / 3), 3)
  const hop = Math.abs(Math.sin(time / 400)) * 2

  for (let i = 0; i < count; i++) {
    const spread = (i - (count - 1) / 2) * bodyW * 0.25
    for (const side of [-1, 1]) {
      const lx = cx + side * bodyW * 0.15 + spread * side * 0.5
      const ly = cy + bodyH * 0.38
      const legLen = bodyH * 0.2 + level * 1.5

      ctx.strokeStyle = legColor
      ctx.lineWidth = 5 + level * 0.3
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(lx, ly)
      ctx.lineTo(lx + side * 3, ly + legLen - hop)
      ctx.stroke()

      // Foot
      ctx.fillStyle = lighten(color, 0.1)
      ctx.beginPath()
      ctx.ellipse(lx + side * 5, ly + legLen - hop, 6 + level * 0.4, 3 + level * 0.2, side * 0.3, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}

// --- Decorations (horns, ears, tail, patterns) ---

function drawHorns(
  ctx: CanvasRenderingContext2D, cx: number, cy: number,
  bodyW: number, bodyH: number, level: number,
  color: string, rng: () => number
) {
  const hornColor = darken(color, 0.1)
  const hornLen = 12 + level * 4
  const hornW = 4 + level

  for (const side of [-1, 1]) {
    const bx = cx + side * bodyW * 0.2
    const by = cy - bodyH * 0.4
    const tx = bx + side * hornLen * 0.4
    const ty = by - hornLen

    ctx.fillStyle = hornColor
    ctx.beginPath()
    ctx.moveTo(bx - side * hornW * 0.5, by)
    ctx.quadraticCurveTo(bx + side * hornW * 0.3, by - hornLen * 0.5, tx, ty)
    ctx.quadraticCurveTo(bx + side * hornW, by - hornLen * 0.3, bx + side * hornW * 0.5, by)
    ctx.closePath()
    ctx.fill()

    // Horn highlight
    ctx.strokeStyle = lighten(color, 0.2)
    ctx.lineWidth = 1
    ctx.globalAlpha = 0.5
    ctx.beginPath()
    ctx.moveTo(bx, by - 2)
    ctx.quadraticCurveTo(bx + side * hornW * 0.2, by - hornLen * 0.5, tx, ty)
    ctx.stroke()
    ctx.globalAlpha = 1
  }
}

function drawEars(
  ctx: CanvasRenderingContext2D, cx: number, cy: number,
  bodyW: number, bodyH: number, level: number,
  color: string, earType: 'pointed' | 'round' | 'floppy', time: number
) {
  const earColor = lighten(color, 0.1)
  const innerColor = lighten(color, 0.35)

  for (const side of [-1, 1]) {
    const ex = cx + side * bodyW * 0.3
    const ey = cy - bodyH * 0.35

    ctx.fillStyle = earColor
    switch (earType) {
      case 'pointed': {
        const earH = bodyH * 0.25 + level * 2
        ctx.beginPath()
        ctx.moveTo(ex - side * 8, ey + 5)
        ctx.lineTo(ex + side * 3, ey - earH)
        ctx.lineTo(ex + side * 12, ey + 5)
        ctx.closePath()
        ctx.fill()
        ctx.fillStyle = innerColor
        ctx.globalAlpha = 0.6
        ctx.beginPath()
        ctx.moveTo(ex - side * 4, ey + 2)
        ctx.lineTo(ex + side * 3, ey - earH * 0.7)
        ctx.lineTo(ex + side * 8, ey + 2)
        ctx.closePath()
        ctx.fill()
        ctx.globalAlpha = 1
        break
      }
      case 'round': {
        const earR = bodyW * 0.1 + level
        ctx.beginPath()
        ctx.arc(ex, ey - earR * 0.5, earR, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = innerColor
        ctx.globalAlpha = 0.5
        ctx.beginPath()
        ctx.arc(ex, ey - earR * 0.5, earR * 0.6, 0, Math.PI * 2)
        ctx.fill()
        ctx.globalAlpha = 1
        break
      }
      case 'floppy': {
        const droop = Math.sin(time / 1200 + side) * 3
        ctx.beginPath()
        ctx.moveTo(ex, ey)
        ctx.quadraticCurveTo(ex + side * 20, ey - 10, ex + side * 25, ey + 15 + droop)
        ctx.quadraticCurveTo(ex + side * 15, ey + 20 + droop, ex, ey + 5)
        ctx.closePath()
        ctx.fill()
        break
      }
    }
  }
}

function drawTail(
  ctx: CanvasRenderingContext2D, cx: number, cy: number,
  bodyW: number, bodyH: number, level: number,
  color: string, time: number
) {
  const tailColor = darken(color, 0.1)
  const tailLen = bodyW * 0.4 + level * 3
  const wag = Math.sin(time / 350) * 15

  ctx.strokeStyle = tailColor
  ctx.lineWidth = 5 + level * 0.3
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(cx, cy + bodyH * 0.3)
  ctx.bezierCurveTo(
    cx - tailLen * 0.3, cy + bodyH * 0.5 + wag,
    cx - tailLen * 0.7, cy + bodyH * 0.3 + wag * 0.5,
    cx - tailLen, cy + bodyH * 0.15 + wag
  )
  ctx.stroke()

  // Tail tip
  ctx.fillStyle = lighten(color, 0.2)
  ctx.beginPath()
  ctx.arc(cx - tailLen, cy + bodyH * 0.15 + wag, 5 + level * 0.5, 0, Math.PI * 2)
  ctx.fill()
}

function drawPatterns(
  ctx: CanvasRenderingContext2D, cx: number, cy: number,
  bodyW: number, bodyH: number,
  patternType: 'spots' | 'stripes' | 'diamonds',
  secondaryColor: string, rng: () => number
) {
  ctx.globalAlpha = 0.35

  switch (patternType) {
    case 'spots': {
      ctx.fillStyle = secondaryColor
      const count = 4 + Math.floor(rng() * 5)
      for (let i = 0; i < count; i++) {
        const px = cx + (rng() - 0.5) * bodyW * 0.6
        const py = cy + (rng() - 0.5) * bodyH * 0.6
        const r = 3 + rng() * 6
        ctx.beginPath()
        ctx.arc(px, py, r, 0, Math.PI * 2)
        ctx.fill()
      }
      break
    }
    case 'stripes': {
      ctx.strokeStyle = secondaryColor
      ctx.lineWidth = 3
      ctx.lineCap = 'round'
      const count = 3 + Math.floor(rng() * 3)
      for (let i = 0; i < count; i++) {
        const py = cy - bodyH * 0.25 + (i / count) * bodyH * 0.5
        const sw = bodyW * (0.2 + rng() * 0.15)
        ctx.beginPath()
        ctx.moveTo(cx - sw, py)
        ctx.lineTo(cx + sw, py)
        ctx.stroke()
      }
      break
    }
    case 'diamonds': {
      ctx.fillStyle = secondaryColor
      const count = 3 + Math.floor(rng() * 3)
      for (let i = 0; i < count; i++) {
        const px = cx + (rng() - 0.5) * bodyW * 0.5
        const py = cy + (rng() - 0.5) * bodyH * 0.5
        const s = 4 + rng() * 5
        ctx.beginPath()
        ctx.moveTo(px, py - s)
        ctx.lineTo(px + s, py)
        ctx.lineTo(px, py + s)
        ctx.lineTo(px - s, py)
        ctx.closePath()
        ctx.fill()
      }
      break
    }
  }

  ctx.globalAlpha = 1
}

// --- Cheek blush (makes creatures cute) ---

function drawBlush(ctx: CanvasRenderingContext2D, cx: number, cy: number, bodyW: number, bodyH: number) {
  ctx.fillStyle = '#ff6b9d'
  ctx.globalAlpha = 0.2
  for (const side of [-1, 1]) {
    ctx.beginPath()
    ctx.ellipse(cx + side * bodyW * 0.2, cy + bodyH * 0.02, bodyW * 0.06, bodyW * 0.04, 0, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1
}

// --- Scar fingerprint (subtle internal texture) ---

function drawScarFingerprint(
  ctx: CanvasRenderingContext2D, cx: number, cy: number,
  bodyW: number, bodyH: number, scars: Scar[],
  originalCentroid: Vec2
) {
  if (scars.length === 0) return
  ctx.globalAlpha = 0.08
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 1

  // Scale and offset the scar pattern to fit inside the body
  const scarBounds = getBoundsFromScars(scars)
  const sw = scarBounds.maxX - scarBounds.minX || 1
  const sh = scarBounds.maxY - scarBounds.minY || 1
  const fitScale = Math.min(bodyW * 0.6 / sw, bodyH * 0.6 / sh)

  for (const scar of scars) {
    const x1 = cx + (scar.start.x - originalCentroid.x) * fitScale
    const y1 = cy + (scar.start.y - originalCentroid.y) * fitScale
    const x2 = cx + (scar.end.x - originalCentroid.x) * fitScale
    const y2 = cy + (scar.end.y - originalCentroid.y) * fitScale
    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2, y2)
    ctx.stroke()
  }
  ctx.globalAlpha = 1
}

function getBoundsFromScars(scars: Scar[]) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const s of scars) {
    minX = Math.min(minX, s.start.x, s.end.x); minY = Math.min(minY, s.start.y, s.end.y)
    maxX = Math.max(maxX, s.start.x, s.end.x); maxY = Math.max(maxY, s.start.y, s.end.y)
  }
  return { minX, minY, maxX, maxY }
}

function getCentroidFromScars(scars: Scar[]): Vec2 {
  let sx = 0, sy = 0, n = 0
  for (const s of scars) {
    sx += s.start.x + s.end.x; sy += s.start.y + s.end.y; n += 2
  }
  return n > 0 ? { x: sx / n, y: sy / n } : { x: 0, y: 0 }
}

// --- Main render ---

export interface RenderMonsterOptions {
  scars: Scar[]
  offsetX: number
  offsetY: number
  scale: number
  level?: number
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
    level = 1,
    animate = false,
    animationProgress = 1,
    showEyes = true,
    showAura = true,
    time = Date.now(),
  } = options

  if (scars.length === 0) return

  const seed = hashScars(scars)
  const rng = seededRandom(seed)

  const primaryColor = getDominantColor(scars)
  const secondaryColor = getSecondaryColor(scars, primaryColor)

  // Determine creature traits from seed
  const bodyType = pickBodyType(seededRandom(seed + 1))
  const eyeStyles: EyeStyle[] = ['round', 'cute', 'narrow', 'dot']
  const eyeStyle = eyeStyles[Math.floor(seededRandom(seed + 2)() * eyeStyles.length)]
  const mouthStyles: MouthStyle[] = ['smile', 'open', 'fangs', 'beak']
  const mouthStyle = mouthStyles[Math.floor(seededRandom(seed + 3)() * mouthStyles.length)]
  const appendageStyles: AppendageStyle[] = ['arms', 'tentacles', 'wings', 'flippers']
  const appendageStyle = appendageStyles[Math.floor(seededRandom(seed + 4)() * appendageStyles.length)]
  const earTypes: ('pointed' | 'round' | 'floppy')[] = ['pointed', 'round', 'floppy']
  const earType = earTypes[Math.floor(seededRandom(seed + 5)() * earTypes.length)]
  const patternTypes: ('spots' | 'stripes' | 'diamonds')[] = ['spots', 'stripes', 'diamonds']
  const patternType = patternTypes[Math.floor(seededRandom(seed + 6)() * patternTypes.length)]
  const hasTail = seededRandom(seed + 7)() > 0.4
  const hasHorns = level >= 5 && seededRandom(seed + 8)() > 0.3
  const hasEars = seededRandom(seed + 9)() > 0.3

  // Body size scales with scar count
  const baseSize = 80 + Math.min(scars.length, 100) * 0.5
  const bodyW = baseSize * (bodyType === 'wide' ? 1.3 : bodyType === 'tall' ? 0.8 : 1)
  const bodyH = baseSize * (bodyType === 'tall' ? 1.3 : bodyType === 'wide' ? 0.8 : 1)

  // Animation: 0-0.3 body forms, 0.3-0.6 fills, 0.6-1.0 features
  const bodyProgress = animate ? Math.min(1, animationProgress / 0.3) : 1
  const fillProgress = animate ? Math.max(0, Math.min(1, (animationProgress - 0.3) / 0.3)) : 1
  const featureProgress = animate ? Math.max(0, Math.min(1, (animationProgress - 0.6) / 0.4)) : 1

  ctx.save()
  ctx.translate(offsetX, offsetY)
  ctx.scale(scale, scale)

  // Aura
  if (showAura && fillProgress > 0) {
    const pulse = 0.2 + Math.sin(time / 600) * 0.1
    const auraR = Math.max(bodyW, bodyH) * 0.8
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, auraR)
    gradient.addColorStop(0, primaryColor + '25')
    gradient.addColorStop(1, primaryColor + '00')
    ctx.globalAlpha = pulse * fillProgress
    ctx.fillStyle = gradient
    ctx.fillRect(-auraR, -auraR, auraR * 2, auraR * 2)
    ctx.globalAlpha = 1
  }

  if (bodyProgress <= 0) { ctx.restore(); return }

  // Behind-body features
  if (featureProgress > 0) {
    ctx.globalAlpha = featureProgress

    // Tail
    if (hasTail && level >= 2) {
      drawTail(ctx, 0, 0, bodyW, bodyH, level, primaryColor, time)
    }

    // Wings (behind body)
    if (appendageStyle === 'wings' && level >= 3) {
      drawAppendages(ctx, 0, 0, bodyW, bodyH, level, 'wings', primaryColor, time, seededRandom(seed + 20))
    }

    ctx.globalAlpha = 1
  }

  // Legs (level 3+, except tentacle creatures)
  if (level >= 3 && appendageStyle !== 'tentacles' && featureProgress > 0) {
    ctx.globalAlpha = featureProgress
    drawLegs(ctx, 0, 0, bodyW, bodyH, level, primaryColor, time, seededRandom(seed + 30))
    ctx.globalAlpha = 1
  }

  // Body
  ctx.globalAlpha = bodyProgress
  drawBody(ctx, 0, 0, bodyW, bodyH, bodyType, primaryColor, secondaryColor, time)
  ctx.globalAlpha = 1

  // Patterns on body
  if (fillProgress > 0 && level >= 2) {
    ctx.globalAlpha = fillProgress
    drawPatterns(ctx, 0, 0, bodyW, bodyH, patternType, secondaryColor, seededRandom(seed + 40))
    ctx.globalAlpha = 1
  }

  // Scar fingerprint inside body
  if (fillProgress > 0) {
    const scarCentroid = getCentroidFromScars(scars)
    drawScarFingerprint(ctx, 0, 0, bodyW, bodyH, scars, scarCentroid)
  }

  // Front features
  if (featureProgress > 0) {
    ctx.globalAlpha = featureProgress

    // Ears (level 2+)
    if (hasEars && level >= 2) {
      drawEars(ctx, 0, 0, bodyW, bodyH, level, primaryColor, earType, time)
    }

    // Horns (level 5+)
    if (hasHorns) {
      drawHorns(ctx, 0, 0, bodyW, bodyH, level, primaryColor, seededRandom(seed + 50))
    }

    // Arms/tentacles/flippers (not wings - those were drawn behind)
    if (level >= 3 && appendageStyle !== 'wings') {
      drawAppendages(ctx, 0, 0, bodyW, bodyH, level, appendageStyle, primaryColor, time, seededRandom(seed + 60))
    }
    // Tentacles at level 2
    if (level >= 2 && appendageStyle === 'tentacles') {
      drawAppendages(ctx, 0, 0, bodyW, bodyH, level, 'tentacles', primaryColor, time, seededRandom(seed + 60))
    }

    // Eyes
    if (showEyes) {
      drawEyes(ctx, 0, 0, bodyW, bodyH, level, eyeStyle, primaryColor, time)
    }

    // Mouth (level 2+)
    if (level >= 2) {
      drawMouth(ctx, 0, 0, bodyW, bodyH, level, mouthStyle, primaryColor, time)
    }

    // Cheek blush (cute creatures)
    if (eyeStyle === 'cute' || eyeStyle === 'dot') {
      drawBlush(ctx, 0, 0, bodyW, bodyH)
    }

    ctx.globalAlpha = 1
  }

  ctx.restore()
}
