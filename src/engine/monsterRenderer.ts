import type { Scar, Vec2, CreatureForm } from './types'

// --- Seeded PRNG ---

function seededRandom(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff
    return (s >>> 0) / 0xffffffff
  }
}

function hashScars(scars: Scar[], extraSeed = 0): number {
  let hash = extraSeed || scars.length * 2654435761
  for (let i = 0; i < scars.length; i++) {
    const s = scars[i]
    // Mix in position, color, time, and index for maximum variation
    hash ^= Math.floor(s.start.x * 73856093) ^ Math.floor(s.start.y * 19349663)
    hash ^= Math.floor(s.end.x * 83492791) ^ Math.floor(s.end.y * 67867979)
    hash ^= s.createdAt ^ (i * 2246822519)
    // Mix in color character codes
    for (let c = 0; c < s.color.length; c++) {
      hash = ((hash << 5) - hash) + s.color.charCodeAt(c)
    }
    hash = hash & hash
  }
  return Math.abs(hash) || 1
}

function getDominantColor(scars: Scar[]): string {
  if (scars.length === 0) return '#ec4899'
  const counts = new Map<string, number>()
  for (const scar of scars) counts.set(scar.color, (counts.get(scar.color) ?? 0) + 1)
  let best = scars[0].color, bestN = 0
  for (const [c, n] of counts) { if (n > bestN) { best = c; bestN = n } }
  return best
}

function getSecondaryColor(scars: Scar[], primary: string): string {
  for (const s of scars) { if (s.color !== primary) return s.color }
  return '#ffffff'
}

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.substring(0, 2), 16)
  const g = parseInt(h.substring(2, 4), 16)
  const b = parseInt(h.substring(4, 6), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

// --- Creature skeleton generation ---
// Each creature is a set of named nodes and edges forming a constellation

interface SkeletonNode {
  x: number
  y: number
  size: number // star size
  bright: boolean // brighter nodes at key joints
}

interface SkeletonEdge {
  from: number
  to: number
  glow: number // 0-1 glow intensity
}

interface CreatureSkeleton {
  nodes: SkeletonNode[]
  edges: SkeletonEdge[]
}

function pickForm(rng: () => number): CreatureForm {
  const forms: CreatureForm[] = ['biped', 'quadruped', 'serpent', 'winged', 'spider', 'jellyfish']
  return forms[Math.floor(rng() * forms.length)]
}

function generateSkeleton(form: CreatureForm, level: number, rng: () => number): CreatureSkeleton {
  const nodes: SkeletonNode[] = []
  const edges: SkeletonEdge[] = []

  function addNode(x: number, y: number, size: number, bright: boolean): number {
    nodes.push({ x, y, size, bright })
    return nodes.length - 1
  }

  function addEdge(from: number, to: number, glow = 0.7) {
    edges.push({ from, to, glow })
  }

  // Variation factors from rng
  const vx = () => (rng() - 0.5) * 12
  const vy = () => (rng() - 0.5) * 12
  const bodyScale = 0.8 + rng() * 0.4
  const s = bodyScale

  switch (form) {
    case 'biped': {
      // Head
      const headTop = addNode(0 + vx(), -75 * s + vy(), 4, true)
      const headL = addNode(-15 * s + vx(), -60 * s + vy(), 3, false)
      const headR = addNode(15 * s + vx(), -60 * s + vy(), 3, false)
      const chin = addNode(0 + vx(), -45 * s + vy(), 3, false)
      addEdge(headTop, headL); addEdge(headTop, headR)
      addEdge(headL, chin); addEdge(headR, chin)

      // Eyes
      const eyeL = addNode(-8 * s, -62 * s, 2.5, true)
      const eyeR = addNode(8 * s, -62 * s, 2.5, true)
      addEdge(headL, eyeL); addEdge(headR, eyeR)

      // Torso
      const neck = addNode(0 + vx(), -35 * s + vy(), 3, true)
      const shoulderL = addNode(-30 * s + vx(), -25 * s + vy(), 3.5, true)
      const shoulderR = addNode(30 * s + vx(), -25 * s + vy(), 3.5, true)
      const chest = addNode(0 + vx(), -10 * s + vy(), 3, false)
      const hip = addNode(0 + vx(), 15 * s + vy(), 3, true)
      addEdge(chin, neck); addEdge(neck, shoulderL); addEdge(neck, shoulderR)
      addEdge(shoulderL, chest); addEdge(shoulderR, chest); addEdge(chest, hip)

      // Arms
      const elbowL = addNode(-45 * s + vx(), -5 * s + vy(), 2.5, false)
      const elbowR = addNode(45 * s + vx(), -5 * s + vy(), 2.5, false)
      const handL = addNode(-55 * s + vx(), 15 * s + vy(), 3, true)
      const handR = addNode(55 * s + vx(), 15 * s + vy(), 3, true)
      addEdge(shoulderL, elbowL); addEdge(elbowL, handL)
      addEdge(shoulderR, elbowR); addEdge(elbowR, handR)

      // Legs
      const hipL = addNode(-15 * s + vx(), 25 * s + vy(), 3, false)
      const hipR = addNode(15 * s + vx(), 25 * s + vy(), 3, false)
      const kneeL = addNode(-20 * s + vx(), 50 * s + vy(), 2.5, false)
      const kneeR = addNode(20 * s + vx(), 50 * s + vy(), 2.5, false)
      const footL = addNode(-22 * s + vx(), 75 * s + vy(), 3, true)
      const footR = addNode(22 * s + vx(), 75 * s + vy(), 3, true)
      addEdge(hip, hipL); addEdge(hip, hipR)
      addEdge(hipL, kneeL); addEdge(kneeL, footL)
      addEdge(hipR, kneeR); addEdge(kneeR, footR)

      // Extra detail at higher levels
      if (level >= 3) {
        // Finger lines
        for (const hand of [handL, handR]) {
          const dir = hand === handL ? -1 : 1
          for (let f = 0; f < 3; f++) {
            const finger = addNode(nodes[hand].x + dir * (8 + f * 5) + vx(), nodes[hand].y + 10 + vy(), 1.5, false)
            addEdge(hand, finger)
          }
        }
      }
      if (level >= 5) {
        // Crown/horns
        const hornL = addNode(nodes[headTop].x - 20 * s, nodes[headTop].y - 20 * s + vy(), 3, true)
        const hornR = addNode(nodes[headTop].x + 20 * s, nodes[headTop].y - 20 * s + vy(), 3, true)
        addEdge(headTop, hornL); addEdge(headTop, hornR)
      }
      break
    }

    case 'quadruped': {
      // Head
      const snout = addNode(-50 * s + vx(), -20 * s + vy(), 3.5, true)
      const headTop = addNode(-35 * s + vx(), -35 * s + vy(), 4, true)
      const headBot = addNode(-35 * s + vx(), -10 * s + vy(), 3, false)
      const eye = addNode(-40 * s, -25 * s, 2.5, true)
      addEdge(snout, headTop); addEdge(snout, headBot); addEdge(headTop, headBot)
      addEdge(headTop, eye)

      // Spine
      const neck = addNode(-25 * s + vx(), -15 * s + vy(), 3, true)
      const back1 = addNode(0 + vx(), -20 * s + vy(), 3, false)
      const back2 = addNode(25 * s + vx(), -15 * s + vy(), 3, false)
      const tailBase = addNode(45 * s + vx(), -10 * s + vy(), 3, true)
      addEdge(headBot, neck); addEdge(neck, back1); addEdge(back1, back2); addEdge(back2, tailBase)

      // Belly
      const belly1 = addNode(-10 * s + vx(), 5 * s + vy(), 2, false)
      const belly2 = addNode(15 * s + vx(), 5 * s + vy(), 2, false)
      addEdge(neck, belly1); addEdge(belly1, belly2); addEdge(belly2, tailBase)

      // Front legs
      const fShoulderL = addNode(-20 * s + vx(), 0 + vy(), 2.5, false)
      const fFootL = addNode(-25 * s + vx(), 35 * s + vy(), 3, true)
      const fShoulderR = addNode(-10 * s + vx(), 0 + vy(), 2.5, false)
      const fFootR = addNode(-8 * s + vx(), 35 * s + vy(), 3, true)
      addEdge(neck, fShoulderL); addEdge(fShoulderL, fFootL)
      addEdge(belly1, fShoulderR); addEdge(fShoulderR, fFootR)

      // Back legs
      const bHipL = addNode(30 * s + vx(), 0 + vy(), 2.5, false)
      const bFootL = addNode(25 * s + vx(), 40 * s + vy(), 3, true)
      const bHipR = addNode(40 * s + vx(), 0 + vy(), 2.5, false)
      const bFootR = addNode(45 * s + vx(), 40 * s + vy(), 3, true)
      addEdge(back2, bHipL); addEdge(bHipL, bFootL)
      addEdge(tailBase, bHipR); addEdge(bHipR, bFootR)

      // Tail
      const tail1 = addNode(60 * s + vx(), -15 * s + vy(), 2, false)
      const tailTip = addNode(72 * s + vx(), -25 * s + vy(), 2.5, true)
      addEdge(tailBase, tail1); addEdge(tail1, tailTip)

      if (level >= 4) {
        // Ears
        const earL = addNode(nodes[headTop].x - 10 * s, nodes[headTop].y - 15 * s, 2, true)
        const earR = addNode(nodes[headTop].x + 5 * s, nodes[headTop].y - 18 * s, 2, true)
        addEdge(headTop, earL); addEdge(headTop, earR)
      }
      break
    }

    case 'serpent': {
      // Head
      const headTip = addNode(-60 * s + vx(), 0 + vy(), 4, true)
      const headTop = addNode(-50 * s + vx(), -12 * s + vy(), 3, false)
      const headBot = addNode(-50 * s + vx(), 8 * s + vy(), 3, false)
      const eye = addNode(-52 * s, -5 * s, 2.5, true)
      addEdge(headTip, headTop); addEdge(headTip, headBot); addEdge(headTop, headBot)
      addEdge(headTop, eye)

      // Undulating body
      const segments = 6 + Math.min(level, 6)
      let prev = headBot
      for (let i = 0; i < segments; i++) {
        const t = (i + 1) / segments
        const x = -40 * s + t * 110 * s
        const y = Math.sin(t * Math.PI * 2 + rng() * 2) * 20 * s
        const node = addNode(x + vx() * 0.5, y + vy() * 0.5, 2.5 - t * 0.8, i % 2 === 0)
        addEdge(prev, node)
        prev = node
      }
      // Tail tip
      const tailTip = addNode(75 * s + vx(), -10 * s + vy(), 3, true)
      addEdge(prev, tailTip)

      if (level >= 3) {
        // Fangs
        const fangL = addNode(nodes[headTip].x - 5, nodes[headTip].y + 12 * s, 2, true)
        const fangR = addNode(nodes[headTip].x + 5, nodes[headTip].y + 12 * s, 2, true)
        addEdge(headBot, fangL); addEdge(headBot, fangR)
      }
      if (level >= 5) {
        // Hood/frill
        const frillL = addNode(nodes[headTop].x - 15 * s, nodes[headTop].y - 10 * s, 2, true)
        const frillR = addNode(nodes[headTop].x + 15 * s, nodes[headTop].y - 15 * s, 2, true)
        addEdge(headTop, frillL); addEdge(headTop, frillR)
        addEdge(frillL, frillR)
      }
      break
    }

    case 'winged': {
      // Body
      const head = addNode(0 + vx(), -40 * s + vy(), 4, true)
      const eyeL = addNode(-8 * s, -42 * s, 2, true)
      const eyeR = addNode(8 * s, -42 * s, 2, true)
      const neck = addNode(0 + vx(), -25 * s + vy(), 3, true)
      const chest = addNode(0 + vx(), -5 * s + vy(), 3, false)
      const tail = addNode(0 + vx(), 20 * s + vy(), 3, true)
      addEdge(head, eyeL); addEdge(head, eyeR)
      addEdge(head, neck); addEdge(neck, chest); addEdge(chest, tail)

      // Wings
      const wingSpan = 50 * s + level * 5
      for (const side of [-1, 1]) {
        const wShoulder = addNode(side * 15 * s + vx(), -20 * s + vy(), 3, true)
        const wMid = addNode(side * wingSpan * 0.6 + vx(), -35 * s + vy(), 2.5, false)
        const wTip = addNode(side * wingSpan + vx(), -45 * s + vy(), 3.5, true)
        const wLower = addNode(side * wingSpan * 0.7 + vx(), -10 * s + vy(), 2.5, false)
        addEdge(neck, wShoulder); addEdge(wShoulder, wMid); addEdge(wMid, wTip)
        addEdge(wShoulder, wLower); addEdge(wLower, wTip)

        // Wing membrane lines
        if (level >= 3) {
          const wInner = addNode(side * wingSpan * 0.4 + vx(), -25 * s + vy(), 1.5, false)
          addEdge(wShoulder, wInner); addEdge(wInner, wMid)
        }
      }

      // Talons
      const footL = addNode(-12 * s + vx(), 40 * s + vy(), 3, true)
      const footR = addNode(12 * s + vx(), 40 * s + vy(), 3, true)
      addEdge(tail, footL); addEdge(tail, footR)

      if (level >= 4) {
        const tailMid = addNode(0 + vx(), 35 * s + vy(), 2, false)
        const tailTip = addNode(0 + vx(), 50 * s + vy(), 3, true)
        addEdge(tail, tailMid); addEdge(tailMid, tailTip)
      }
      break
    }

    case 'spider': {
      // Central body
      const head = addNode(0 + vx(), -20 * s + vy(), 4, true)
      const eyeL = addNode(-6 * s, -24 * s, 2, true)
      const eyeR = addNode(6 * s, -24 * s, 2, true)
      const thorax = addNode(0 + vx(), 0 + vy(), 3.5, true)
      const abdomen = addNode(0 + vx(), 25 * s + vy(), 4, true)
      addEdge(head, eyeL); addEdge(head, eyeR)
      addEdge(head, thorax); addEdge(thorax, abdomen)

      // Legs (4 pairs)
      const legPairs = Math.min(2 + Math.floor(level / 2), 4)
      for (let i = 0; i < legPairs; i++) {
        const yBase = -10 * s + i * 10 * s
        for (const side of [-1, 1]) {
          const joint1 = addNode(side * 30 * s + vx(), yBase - 15 * s + vy(), 2, false)
          const joint2 = addNode(side * 50 * s + vx(), yBase + 5 * s + vy(), 2, false)
          const tip = addNode(side * 55 * s + vx(), yBase + 25 * s + vy(), 2.5, true)
          addEdge(thorax, joint1); addEdge(joint1, joint2); addEdge(joint2, tip)
        }
      }

      if (level >= 5) {
        // Mandibles
        const mandL = addNode(-12 * s, nodes[head].y + 8, 2, true)
        const mandR = addNode(12 * s, nodes[head].y + 8, 2, true)
        addEdge(head, mandL); addEdge(head, mandR)
      }
      break
    }

    case 'jellyfish': {
      // Bell
      const bellTop = addNode(0 + vx(), -40 * s + vy(), 4, true)
      const bellL = addNode(-30 * s + vx(), -15 * s + vy(), 3, true)
      const bellR = addNode(30 * s + vx(), -15 * s + vy(), 3, true)
      const bellBot = addNode(0 + vx(), -5 * s + vy(), 3, true)
      addEdge(bellTop, bellL); addEdge(bellTop, bellR)
      addEdge(bellL, bellBot); addEdge(bellR, bellBot)

      // Bell cross lines
      const bellMidL = addNode(-18 * s + vx(), -28 * s + vy(), 2, false)
      const bellMidR = addNode(18 * s + vx(), -28 * s + vy(), 2, false)
      addEdge(bellTop, bellMidL); addEdge(bellTop, bellMidR)
      addEdge(bellMidL, bellL); addEdge(bellMidR, bellR)

      // Eyes
      const eyeL = addNode(-10 * s, -22 * s, 2.5, true)
      const eyeR = addNode(10 * s, -22 * s, 2.5, true)
      addEdge(bellMidL, eyeL); addEdge(bellMidR, eyeR)

      // Tentacles
      const tentCount = 3 + Math.min(level, 5)
      const spread = 50 * s
      for (let i = 0; i < tentCount; i++) {
        const x = -spread / 2 + (i / (tentCount - 1)) * spread
        const segments = 2 + Math.min(level, 4)
        let prev = bellBot
        for (let j = 0; j < segments; j++) {
          const t = (j + 1) / segments
          const wobble = Math.sin(i * 2 + j) * 8 * s
          const node = addNode(x + wobble + vx() * 0.5, -5 * s + t * 70 * s + vy() * 0.5, 2 - t * 0.5, j === segments - 1)
          addEdge(prev, node)
          prev = node
        }
      }
      break
    }
  }

  return { nodes, edges }
}

export function generateSkeletonFromSeed(
  seed: number,
  form: CreatureForm,
  level: number,
): CreatureSkeleton {
  const rng = seededRandom(seed + 2)
  return generateSkeleton(form, level, rng)
}

// --- Render ---

export interface RenderMonsterOptions {
  scars?: Scar[]
  seed?: number
  form?: CreatureForm
  primaryColor?: string
  secondaryColor?: string
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
    seed: seedOpt,
    form: formOpt,
    primaryColor: primaryOpt,
    secondaryColor: secondaryOpt,
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

  let seed: number
  let primaryColor: string
  let secondaryColor: string
  let skeleton: CreatureSkeleton

  if (seedOpt != null) {
    seed = seedOpt
    primaryColor = primaryOpt || '#ec4899'
    secondaryColor = secondaryOpt || '#ffffff'
    const form = formOpt || pickForm(seededRandom(seed + 1))
    skeleton = generateSkeleton(form, level, seededRandom(seed + 2))
  } else if (scars && scars.length > 0) {
    seed = hashScars(scars)
    primaryColor = getDominantColor(scars)
    secondaryColor = getSecondaryColor(scars, primaryColor)
    const form = pickForm(seededRandom(seed + 1))
    skeleton = generateSkeleton(form, level, seededRandom(seed + 2))
  } else {
    return
  }

  const rng = seededRandom(seed)
  const { nodes, edges } = skeleton

  // Subtle idle animation — gentle floating motion per node
  const animatedNodes = nodes.map((n, i) => ({
    ...n,
    x: n.x + Math.sin(time / 1200 + i * 0.7) * 1.5,
    y: n.y + Math.cos(time / 1400 + i * 0.9) * 1.5,
  }))

  // Animation progress determines how much to draw
  const edgeProgress = animate ? Math.min(1, animationProgress / 0.6) : 1
  const nodeProgress = animate ? Math.max(0, Math.min(1, (animationProgress - 0.3) / 0.5)) : 1
  const glowProgress = animate ? Math.max(0, Math.min(1, (animationProgress - 0.5) / 0.5)) : 1

  const edgeCount = Math.floor(edges.length * edgeProgress)
  const nodeCount = Math.floor(nodes.length * nodeProgress)

  ctx.save()
  ctx.translate(offsetX, offsetY)
  ctx.scale(scale, scale)

  // Background nebula glow
  if (showAura && glowProgress > 0) {
    const pulse = 0.15 + Math.sin(time / 800) * 0.05
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 120)
    gradient.addColorStop(0, hexToRgba(primaryColor, pulse * glowProgress))
    gradient.addColorStop(0.5, hexToRgba(primaryColor, pulse * 0.3 * glowProgress))
    gradient.addColorStop(1, hexToRgba(primaryColor, 0))
    ctx.fillStyle = gradient
    ctx.fillRect(-150, -150, 300, 300)
  }

  // Constellation edges (glowing lines)
  for (let i = 0; i < edgeCount; i++) {
    const edge = edges[i]
    const a = animatedNodes[edge.from]
    const b = animatedNodes[edge.to]

    // Outer glow line
    ctx.strokeStyle = hexToRgba(primaryColor, 0.3 * edge.glow)
    ctx.lineWidth = 4
    ctx.lineCap = 'round'
    ctx.shadowColor = primaryColor
    ctx.shadowBlur = 10
    ctx.beginPath()
    ctx.moveTo(a.x, a.y)
    ctx.lineTo(b.x, b.y)
    ctx.stroke()

    // Inner bright line
    ctx.shadowBlur = 0
    ctx.strokeStyle = hexToRgba(primaryColor, 0.6 * edge.glow)
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(a.x, a.y)
    ctx.lineTo(b.x, b.y)
    ctx.stroke()

    // Core white line
    ctx.strokeStyle = hexToRgba('#ffffff', 0.4 * edge.glow)
    ctx.lineWidth = 0.7
    ctx.beginPath()
    ctx.moveTo(a.x, a.y)
    ctx.lineTo(b.x, b.y)
    ctx.stroke()
  }

  // Star nodes
  for (let i = 0; i < nodeCount; i++) {
    const node = animatedNodes[i]
    const pulse = node.bright
      ? 0.8 + Math.sin(time / 500 + i * 0.4) * 0.2
      : 0.5 + Math.sin(time / 700 + i * 0.6) * 0.15
    const size = node.size * pulse

    // Outer glow
    ctx.shadowColor = node.bright ? '#ffffff' : primaryColor
    ctx.shadowBlur = node.bright ? 12 : 6

    // Star body
    ctx.fillStyle = node.bright ? '#ffffff' : hexToRgba(primaryColor, 0.9)
    ctx.beginPath()
    ctx.arc(node.x, node.y, size, 0, Math.PI * 2)
    ctx.fill()

    // Bright core
    if (node.bright) {
      ctx.shadowBlur = 0
      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.arc(node.x, node.y, size * 0.5, 0, Math.PI * 2)
      ctx.fill()

      // Cross flare on brightest stars
      if (node.size >= 3.5) {
        ctx.strokeStyle = hexToRgba('#ffffff', 0.3 * pulse)
        ctx.lineWidth = 0.5
        const flareLen = size * 3
        ctx.beginPath()
        ctx.moveTo(node.x - flareLen, node.y)
        ctx.lineTo(node.x + flareLen, node.y)
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(node.x, node.y - flareLen)
        ctx.lineTo(node.x, node.y + flareLen)
        ctx.stroke()
      }
    }
  }

  ctx.shadowBlur = 0

  // Secondary color accent — faint connecting arcs between bright nodes
  if (glowProgress > 0 && secondaryColor !== '#ffffff') {
    ctx.globalAlpha = 0.12 * glowProgress
    ctx.strokeStyle = secondaryColor
    ctx.lineWidth = 1
    const brightNodes = animatedNodes.filter((n, i) => i < nodeCount && n.bright)
    for (let i = 0; i < brightNodes.length - 1; i += 2) {
      const a = brightNodes[i]
      const b = brightNodes[i + 1]
      if (!b) break
      ctx.beginPath()
      ctx.moveTo(a.x, a.y)
      const cpx = (a.x + b.x) / 2 + (rng() - 0.5) * 30
      const cpy = (a.y + b.y) / 2 + (rng() - 0.5) * 30
      ctx.quadraticCurveTo(cpx, cpy, b.x, b.y)
      ctx.stroke()
    }
    ctx.globalAlpha = 1
  }

  ctx.restore()
}
