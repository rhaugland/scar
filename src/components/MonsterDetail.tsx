'use client'

import { useRef, useEffect } from 'react'
import type { Monster } from '@/engine/types'
import { renderMonster } from '@/engine/monsterRenderer'
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '@/engine/constants'

interface MonsterDetailProps {
  monster: Monster
  onRelease: () => void
  onBack: () => void
}

export function MonsterDetail({ monster, onRelease, onBack }: MonsterDetailProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animFrame = 0

    function draw() {
      ctx!.fillStyle = '#000000'
      ctx!.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

      renderMonster(ctx!, {
        scars: monster.scars,
        offsetX: CANVAS_WIDTH / 2,
        offsetY: CANVAS_HEIGHT / 2 - 40,
        scale: 0.7,
        level: monster.level,
        showEyes: true,
        showAura: true,
        time: Date.now(),
      })

      animFrame = requestAnimationFrame(draw)
    }

    animFrame = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(animFrame)
  }, [monster])

  return (
    <div className="fixed inset-0 z-30 bg-black flex flex-col items-center">
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="w-full max-w-[700px] aspect-square"
      />

      <div className="flex flex-col items-center gap-3 mt-4">
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
        <p className="text-white/30 font-mono text-[10px]">
          {new Date(monster.createdAt).toLocaleDateString()}
        </p>

        <div className="flex gap-4 mt-4">
          <button
            onClick={onBack}
            className="border border-white/30 text-white/60 font-mono text-sm px-6 py-2 hover:bg-white/10 transition-colors"
          >
            BACK
          </button>
          <button
            onClick={onRelease}
            className="border border-red-500/40 text-red-400/60 font-mono text-sm px-6 py-2 hover:bg-red-500/10 transition-colors"
          >
            RELEASE
          </button>
        </div>
      </div>
    </div>
  )
}
