'use client'

import type { Tier } from '@/engine/types'

interface DeathScreenProps {
  score: number
  kills: number
  level: number
  highScore: number
  isNewHighScore: boolean
  currentTier: Tier | null
  nextTierName: string | null
  nextTierLevel: number | null
  onRestart: () => void
  onViewCollection: () => void
}

export function DeathScreen({
  score,
  kills,
  level,
  highScore,
  isNewHighScore,
  currentTier,
  nextTierName,
  nextTierLevel,
  onRestart,
  onViewCollection,
}: DeathScreenProps) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none">
      <div className="pointer-events-auto flex flex-col items-center gap-4">
        {isNewHighScore && (
          <p className="text-pink-400 font-mono text-xs tracking-widest animate-pulse">
            NEW BEST
          </p>
        )}
        <p className="text-white font-mono text-4xl font-bold">
          Level {level}
        </p>
        <p className="text-white/50 font-mono text-sm">
          {score.toFixed(1)}s | {kills} kills
        </p>

        {nextTierName && nextTierLevel && (
          <p className="text-white/40 font-mono text-xs mt-2">
            NEED LEVEL {nextTierLevel} FOR {nextTierName.toUpperCase()}
          </p>
        )}
        {currentTier && !nextTierName && (
          <p className="text-yellow-400/60 font-mono text-xs mt-2">
            MAX TIER REACHED
          </p>
        )}

        <div className="flex gap-4 mt-6">
          <button
            onClick={(e) => { e.stopPropagation(); onRestart(); }}
            className="border border-white/50 text-white font-mono text-sm px-6 py-2 hover:bg-white/10 transition-colors"
          >
            TRY AGAIN
          </button>
          <button
            onClick={onViewCollection}
            className="border border-pink-500/50 text-pink-400 font-mono text-sm px-6 py-2 hover:bg-pink-500/10 transition-colors"
          >
            COLLECTION
          </button>
        </div>
        {!isNewHighScore && (
          <p className="text-white/30 font-mono text-xs mt-4">
            BEST: {highScore.toFixed(1)}s
          </p>
        )}
      </div>
    </div>
  )
}
