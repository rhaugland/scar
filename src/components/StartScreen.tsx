'use client'

interface StartScreenProps {
  highScore: number
  onStart: () => void
}

export function StartScreen({ highScore, onStart }: StartScreenProps) {
  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none"
    >
      <h1 className="text-white font-mono text-6xl font-bold tracking-widest mb-4">
        SCAR
      </h1>
      <p className="text-pink-400/60 font-mono text-sm mb-8">
        YOUR POWER DESTROYS YOU
      </p>
      <p className="text-white/80 font-mono text-lg animate-pulse">
        TAP TO PLAY
      </p>
      {highScore > 0 && (
        <p className="text-white/40 font-mono text-xs mt-6">
          BEST: {highScore.toFixed(1)}s
        </p>
      )}
    </div>
  )
}
