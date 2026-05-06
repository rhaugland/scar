'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import type { Monster, Scar } from '@/engine/types'
import { generateMonster } from '@/engine/monster'
import { renderMonster } from '@/engine/monsterRenderer'
import { getMonsterCount } from '@/lib/monsterStorage'
import { MONSTER_CAP, CANVAS_WIDTH, CANVAS_HEIGHT } from '@/engine/constants'

interface HatchingScreenProps {
  scars: Scar[]
  level: number
  kills: number
  lineColor: string
  onAddMonster: (monster: Monster) => void
  onSkip: () => void
}

type Phase = 'forming' | 'drawing' | 'reveal'

export function HatchingScreen({ scars, level, kills, lineColor, onAddMonster, onSkip }: HatchingScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [phase, setPhase] = useState<Phase>('forming')
  const [monster, setMonster] = useState<Monster | null>(null)
  const [drawProgress, setDrawProgress] = useState(0)
  const rafRef = useRef<number>(0)
  const collectionCount = getMonsterCount()
  const isFull = collectionCount >= MONSTER_CAP

  // Generate monster on mount
  useEffect(() => {
    const m = generateMonster(scars, level, kills, lineColor)
    setMonster(m)

    // Phase 1: "forming" text for 1.5 seconds
    const formingTimer = setTimeout(() => {
      setPhase('drawing')
    }, 1500)

    return () => clearTimeout(formingTimer)
  }, [scars, level, kills, lineColor])

  // Phase 2: Animate scar drawing
  useEffect(() => {
    if (phase !== 'drawing' || !monster) return

    const duration = Math.max(1000, Math.min(3000, scars.length * 30))
    const startTime = Date.now()

    function animate() {
      const elapsed = Date.now() - startTime
      const progress = Math.min(1, elapsed / duration)
      setDrawProgress(progress)

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate)
      } else {
        setTimeout(() => setPhase('reveal'), 500)
      }
    }

    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current)
  }, [phase, monster, scars.length])

  // Canvas rendering
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !monster) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animFrame = 0

    function draw() {
      ctx!.fillStyle = '#000000'
      ctx!.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

      if (phase === 'drawing' || phase === 'reveal') {
        renderMonster(ctx!, {
          scars: monster!.scars,
          offsetX: CANVAS_WIDTH / 2,
          offsetY: CANVAS_HEIGHT / 2,
          scale: 0.8,
          animate: phase === 'drawing',
          animationProgress: drawProgress,
          showEyes: phase === 'reveal',
          showStars: true,
          showAura: phase === 'reveal',
          time: Date.now(),
        })
      }

      animFrame = requestAnimationFrame(draw)
    }

    animFrame = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(animFrame)
  }, [phase, monster, drawProgress])

  const handleAdd = useCallback(() => {
    if (monster) onAddMonster(monster)
  }, [monster, onAddMonster])

  if (!monster) return null

  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black">
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="w-full h-full max-w-[700px] max-h-[700px] aspect-square"
      />

      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        {phase === 'forming' && (
          <p className="text-white/60 font-mono text-lg animate-pulse">
            A shard is forming...
          </p>
        )}

        {phase === 'reveal' && (
          <div className="pointer-events-auto flex flex-col items-center gap-3 mt-auto mb-16">
            <p className="text-white font-mono text-2xl font-bold tracking-wider">
              {monster.name}
            </p>
            <div className="flex gap-6 text-white/60 font-mono text-sm">
              <span>HP {monster.stats.hp}</span>
              <span>ATK {monster.stats.attack}</span>
            </div>
            <p className="text-white/40 font-mono text-xs">
              Level {monster.level} | {monster.kills} kills
            </p>
            <div className="flex gap-4 mt-4">
              <button
                onClick={handleAdd}
                disabled={isFull}
                className="border border-pink-500/50 text-pink-400 font-mono text-sm px-6 py-2 hover:bg-pink-500/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {isFull ? `COLLECTION FULL (${MONSTER_CAP})` : `ADD TO COLLECTION (${collectionCount}/${MONSTER_CAP})`}
              </button>
              <button
                onClick={onSkip}
                className="border border-white/30 text-white/50 font-mono text-sm px-6 py-2 hover:bg-white/10 transition-colors"
              >
                PLAY AGAIN
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
