'use client'

import { useRef, useEffect } from 'react'
import type { CollectedCard, Tier } from '@/engine/types'
import { renderMonster } from '@/engine/monsterRenderer'
import { generateDailyCard } from '@/engine/dailyCard'

interface CardTileProps {
  card: CollectedCard
  onClick: () => void
}

const CARD_SIZE = 200

const TIER_BORDER: Record<Tier, string> = {
  bronze: 'border-white/30',
  silver: 'border-blue-500/50 shadow-[0_0_4px_rgba(59,130,246,0.3)]',
  gold: 'border-yellow-500/80 shadow-[0_0_8px_rgba(245,158,11,0.4)]',
}

export function CardTile({ card, onClick }: CardTileProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dailyCard = generateDailyCard(card.date)
    let animFrame = 0

    function draw() {
      ctx!.fillStyle = '#000000'
      ctx!.fillRect(0, 0, CARD_SIZE, CARD_SIZE)

      renderMonster(ctx!, {
        seed: dailyCard.seed,
        form: card.form,
        primaryColor: card.primaryColor,
        secondaryColor: card.secondaryColor,
        offsetX: CARD_SIZE / 2,
        offsetY: CARD_SIZE / 2,
        scale: 0.25,
        level: card.bestLevel,
        showEyes: true,
        showAura: false,
        time: Date.now(),
      })

      animFrame = requestAnimationFrame(draw)
    }

    animFrame = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(animFrame)
  }, [card])

  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-2 p-2 border transition-colors bg-black ${TIER_BORDER[card.tier]}`}
    >
      <canvas
        ref={canvasRef}
        width={CARD_SIZE}
        height={CARD_SIZE}
        className="w-full aspect-square"
      />
      <p className="text-white font-mono text-xs font-bold truncate w-full text-center">
        {card.name}
      </p>
      <div className="flex gap-3 text-white/50 font-mono text-[10px]">
        <span>HP {card.stats.hp}</span>
        <span>ATK {card.stats.attack}</span>
      </div>
      <span
        className="font-mono text-[10px] uppercase"
        style={{ color: card.tier === 'gold' ? '#f59e0b' : card.tier === 'silver' ? '#3b82f6' : '#9ca3af' }}
      >
        {card.tier}
      </span>
    </button>
  )
}
