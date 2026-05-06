'use client'

import { useRef, useEffect, useState } from 'react'
import type { DailyCard, Tier } from '@/engine/types'
import { renderMonster } from '@/engine/monsterRenderer'
import { adjustStats } from '@/engine/dailyCard'

interface CardRevealScreenProps {
  dailyCard: DailyCard
  tier: Tier
  level: number
  kills: number
  isUpgrade: boolean
  onPlayAgain: () => void
  onViewCollection: () => void
}

type Phase = 'flash' | 'drawing' | 'badge' | 'stats'

const CANVAS_SIZE = 400

const TIER_COLORS: Record<Tier, string> = {
  bronze: '#d4d4d4',
  silver: '#3b82f6',
  gold: '#f59e0b',
}

const TIER_LABELS: Record<Tier, string> = {
  bronze: 'BRONZE',
  silver: 'SILVER',
  gold: 'GOLD',
}

export function CardRevealScreen({
  dailyCard,
  tier,
  level,
  kills,
  isUpgrade,
  onPlayAgain,
  onViewCollection,
}: CardRevealScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [phase, setPhase] = useState<Phase>('flash')
  const [drawProgress, setDrawProgress] = useState(0)
  const [badgeScale, setBadgeScale] = useState(0)
  const [statsOpacity, setStatsOpacity] = useState(0)
  const rafRef = useRef<number>(0)

  const stats = adjustStats(dailyCard.baseStats, tier)

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('drawing'), 300)
    return () => clearTimeout(t1)
  }, [])

  useEffect(() => {
    if (phase !== 'drawing') return
    const startTime = Date.now()
    const duration = 2500

    function animate() {
      const elapsed = Date.now() - startTime
      const progress = Math.min(1, elapsed / duration)
      setDrawProgress(progress)

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate)
      } else {
        setPhase('badge')
      }
    }

    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current)
  }, [phase])

  useEffect(() => {
    if (phase !== 'badge') return
    const startTime = Date.now()
    const duration = 500

    function animate() {
      const elapsed = Date.now() - startTime
      const t = Math.min(1, elapsed / duration)
      const overshoot = t < 0.7
        ? (t / 0.7) * 1.15
        : 1.15 - (0.15 * ((t - 0.7) / 0.3))
      setBadgeScale(overshoot)

      if (t < 1) {
        rafRef.current = requestAnimationFrame(animate)
      } else {
        setBadgeScale(1)
        setPhase('stats')
      }
    }

    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current)
  }, [phase])

  useEffect(() => {
    if (phase !== 'stats') return
    const startTime = Date.now()
    const duration = 500

    function animate() {
      const elapsed = Date.now() - startTime
      setStatsOpacity(Math.min(1, elapsed / duration))
      if (elapsed < duration) {
        rafRef.current = requestAnimationFrame(animate)
      }
    }

    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current)
  }, [phase])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    if (phase === 'flash') return

    let animFrame = 0

    function draw() {
      ctx!.fillStyle = '#000000'
      ctx!.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)

      renderMonster(ctx!, {
        seed: dailyCard.seed,
        form: dailyCard.form,
        primaryColor: dailyCard.primaryColor,
        secondaryColor: dailyCard.secondaryColor,
        offsetX: CANVAS_SIZE / 2,
        offsetY: CANVAS_SIZE / 2 - 20,
        scale: 0.5,
        level,
        animate: phase === 'drawing',
        animationProgress: drawProgress,
        showEyes: phase !== 'drawing',
        showAura: phase !== 'drawing',
        time: Date.now(),
      })

      animFrame = requestAnimationFrame(draw)
    }

    animFrame = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(animFrame)
  }, [phase, drawProgress, dailyCard, level])

  const tierColor = TIER_COLORS[tier]

  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black">
      {phase === 'flash' && (
        <div className="absolute inset-0 bg-white/90 flex items-center justify-center z-30 animate-pulse">
          <p className="text-black font-mono text-2xl font-bold tracking-widest">
            {isUpgrade ? 'TIER UPGRADED' : 'CARD UNLOCKED'}
          </p>
        </div>
      )}

      <canvas
        ref={canvasRef}
        width={CANVAS_SIZE}
        height={CANVAS_SIZE}
        className="w-[280px] h-[280px] sm:w-[360px] sm:h-[360px]"
      />

      {(phase === 'badge' || phase === 'stats') && (
        <div
          className="flex items-center gap-2 mt-2"
          style={{ transform: `scale(${badgeScale})` }}
        >
          <span
            className="font-mono text-lg font-bold tracking-widest px-4 py-1 border-2 rounded"
            style={{
              color: tierColor,
              borderColor: tierColor,
              boxShadow: tier === 'gold' ? `0 0 12px ${tierColor}40` : undefined,
            }}
          >
            {TIER_LABELS[tier]}
          </span>
        </div>
      )}

      {phase === 'stats' && (
        <div
          className="flex flex-col items-center gap-2 mt-4"
          style={{ opacity: statsOpacity }}
        >
          <p className="text-white font-mono text-2xl font-bold tracking-wider">
            {dailyCard.name}
          </p>
          <div className="flex gap-6 text-white/60 font-mono text-sm">
            <span>HP {stats.hp}</span>
            <span>ATK {stats.attack}</span>
          </div>
          <p className="text-white/30 font-mono text-[10px]">
            {dailyCard.date}
          </p>

          <div className="flex gap-3 mt-4">
            <button
              onClick={onPlayAgain}
              className="border border-white/30 text-white/60 font-mono text-sm px-6 py-2 hover:bg-white/10 transition-colors"
            >
              PLAY AGAIN
            </button>
            <button
              onClick={onViewCollection}
              className="border border-pink-500/50 text-pink-400 font-mono text-sm px-6 py-2 hover:bg-pink-500/10 transition-colors"
            >
              VIEW COLLECTION
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
