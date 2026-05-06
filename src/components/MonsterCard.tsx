'use client'

import { useRef, useEffect } from 'react'
import type { Monster } from '@/engine/types'
import { renderMonster } from '@/engine/monsterRenderer'

interface MonsterCardProps {
  monster: Monster
  onClick: () => void
}

const CARD_SIZE = 200

export function MonsterCard({ monster, onClick }: MonsterCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animFrame = 0

    function draw() {
      ctx!.fillStyle = '#000000'
      ctx!.fillRect(0, 0, CARD_SIZE, CARD_SIZE)

      renderMonster(ctx!, {
        scars: monster.scars,
        offsetX: CARD_SIZE / 2,
        offsetY: CARD_SIZE / 2,
        scale: 0.25,
        showEyes: true,
        showStars: true,
        showAura: false,
        time: Date.now(),
      })

      animFrame = requestAnimationFrame(draw)
    }

    animFrame = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(animFrame)
  }, [monster])

  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-2 p-2 border border-white/10 hover:border-pink-500/40 transition-colors bg-black"
    >
      <canvas
        ref={canvasRef}
        width={CARD_SIZE}
        height={CARD_SIZE}
        className="w-full aspect-square"
      />
      <p className="text-white font-mono text-xs font-bold truncate w-full text-center">
        {monster.name}
      </p>
      <div className="flex gap-3 text-white/50 font-mono text-[10px]">
        <span>HP {monster.stats.hp}</span>
        <span>ATK {monster.stats.attack}</span>
      </div>
      <span className="text-pink-400/40 font-mono text-[10px]">
        LVL {monster.level}
      </span>
    </button>
  )
}
