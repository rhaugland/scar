'use client'

import { useRef, useEffect } from 'react'
import type { CollectedCard, Tier } from '@/engine/types'
import { renderMonster } from '@/engine/monsterRenderer'
import { generateDailyCard } from '@/engine/dailyCard'
import { downloadMonsterCard } from '@/lib/share'

interface MonsterDetailProps {
  card: CollectedCard
  onBack: () => void
}

const DETAIL_SIZE = 400

const TIER_COLORS: Record<Tier, string> = {
  bronze: '#d4d4d4',
  silver: '#3b82f6',
  gold: '#f59e0b',
}

export function MonsterDetail({ card, onBack }: MonsterDetailProps) {
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
      ctx!.fillRect(0, 0, DETAIL_SIZE, DETAIL_SIZE)

      renderMonster(ctx!, {
        seed: dailyCard.seed,
        form: card.form,
        primaryColor: card.primaryColor,
        secondaryColor: card.secondaryColor,
        offsetX: DETAIL_SIZE / 2,
        offsetY: DETAIL_SIZE / 2 - 20,
        scale: 0.5,
        level: card.bestLevel,
        showEyes: true,
        showAura: true,
        time: Date.now(),
      })

      animFrame = requestAnimationFrame(draw)
    }

    animFrame = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(animFrame)
  }, [card])

  const tierColor = TIER_COLORS[card.tier]

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center">
      <div className="absolute top-0 left-0 p-4">
        <button
          onClick={onBack}
          className="text-white/50 font-mono text-sm hover:text-white/80 transition-colors"
        >
          &larr; BACK
        </button>
      </div>

      <canvas
        ref={canvasRef}
        width={DETAIL_SIZE}
        height={DETAIL_SIZE}
        className="w-[280px] h-[280px] sm:w-[360px] sm:h-[360px]"
      />

      <span
        className="font-mono text-sm font-bold tracking-widest px-4 py-1 border-2 rounded mt-2"
        style={{
          color: tierColor,
          borderColor: tierColor,
          boxShadow: card.tier === 'gold' ? `0 0 12px ${tierColor}40` : undefined,
        }}
      >
        {card.tier.toUpperCase()}
      </span>

      <div className="flex flex-col items-center gap-2 mt-4">
        <p className="text-white font-mono text-2xl font-bold tracking-wider">
          {card.name}
        </p>
        <div className="flex gap-6 text-white/60 font-mono text-sm">
          <span>HP {card.stats.hp}</span>
          <span>ATK {card.stats.attack}</span>
        </div>
        <p className="text-white/40 font-mono text-xs">
          Level {card.bestLevel} | {card.bestKills} kills
        </p>
        <p className="text-white/30 font-mono text-[10px]">
          {card.date}
        </p>

        <button
          onClick={() => {
            const canvas = canvasRef.current
            if (canvas) {
              downloadMonsterCard(canvas, card.name, card.stats, card.bestLevel, card.bestKills)
            }
          }}
          className="border border-white/20 text-white/60 font-mono text-sm px-6 py-2 mt-3 hover:bg-white/10 transition-colors"
        >
          DOWNLOAD
        </button>
      </div>
    </div>
  )
}
