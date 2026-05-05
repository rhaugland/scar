'use client'

interface DeathScreenProps {
  score: number
  kills: number
  highScore: number
  isNewHighScore: boolean
  onRestart: () => void
  onShare: () => void
}

export function DeathScreen({ score, kills, highScore, isNewHighScore, onRestart, onShare }: DeathScreenProps) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none">
      <div className="pointer-events-auto flex flex-col items-center gap-4">
        {isNewHighScore && (
          <p className="text-pink-400 font-mono text-xs tracking-widest animate-pulse">
            NEW BEST
          </p>
        )}
        <p className="text-white font-mono text-4xl font-bold">
          {score.toFixed(1)}s
        </p>
        <p className="text-white/50 font-mono text-sm">
          {kills} kills
        </p>
        <div className="flex gap-4 mt-6">
          <button
            onClick={onShare}
            className="border border-pink-500/50 text-pink-400 font-mono text-sm px-6 py-2 hover:bg-pink-500/10 transition-colors"
          >
            SHARE
          </button>
          <button
            onClick={onRestart}
            className="border border-white/50 text-white font-mono text-sm px-6 py-2 hover:bg-white/10 transition-colors"
          >
            AGAIN
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
