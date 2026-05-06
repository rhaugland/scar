'use client'

import { useRef, useEffect } from 'react'
import type { DailyCard, Tier } from '@/engine/types'
import { renderMonster } from '@/engine/monsterRenderer'

interface PreGameScreenProps {
  dailyCard: DailyCard
  currentTier: Tier | null
  highScore: number
  onStart: () => void
}

const PREVIEW_SIZE = 300

export function PreGameScreen({ dailyCard, currentTier, highScore, onStart }: PreGameScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animFrame = 0

    function draw() {
      ctx!.fillStyle = '#000000'
      ctx!.fillRect(0, 0, PREVIEW_SIZE, PREVIEW_SIZE)

      ctx!.globalAlpha = 0.25
      renderMonster(ctx!, {
        seed: dailyCard.seed,
        form: dailyCard.form,
        primaryColor: dailyCard.primaryColor,
        secondaryColor: dailyCard.secondaryColor,
        offsetX: PREVIEW_SIZE / 2,
        offsetY: PREVIEW_SIZE / 2,
        scale: 0.35,
        level: 5,
        showEyes: false,
        showAura: false,
        time: Date.now(),
      })
      ctx!.globalAlpha = 1

      animFrame = requestAnimationFrame(draw)
    }

    animFrame = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(animFrame)
  }, [dailyCard])

  const tierLabel = currentTier
    ? `YOUR BEST: ${currentTier.toUpperCase()}`
    : 'NOT YET UNLOCKED'

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none">
      <h1 className="text-white font-mono text-3xl sm:text-5xl font-bold tracking-widest mb-2">
        CONSTELLATIONAL
      </h1>
      <p className="text-pink-400/60 font-mono text-xs sm:text-sm mb-6">
        COLLECT THE COSMOS
      </p>

      <canvas
        ref={canvasRef}
        width={PREVIEW_SIZE}
        height={PREVIEW_SIZE}
        className="w-[200px] h-[200px] sm:w-[260px] sm:h-[260px] mb-4"
      />

      <p className="text-white/70 font-mono text-sm mb-1">
        TODAY&apos;S CARD: <span className="text-white font-bold">{dailyCard.name}</span>
      </p>
      <p className="text-white/40 font-mono text-[10px] mb-1">
        BRONZE: LVL 3 | SILVER: LVL 5 | GOLD: LVL 8
      </p>
      <p className={`font-mono text-xs mb-6 ${currentTier ? 'text-pink-400/80' : 'text-white/30'}`}>
        {tierLabel}
      </p>

      <p className="text-white/80 font-mono text-lg animate-pulse">
        TAP TO PLAY
      </p>

      {highScore > 0 && (
        <p className="text-white/40 font-mono text-xs mt-4">
          BEST: {highScore.toFixed(1)}s
        </p>
      )}
    </div>
  )
}
