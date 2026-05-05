const HIGH_SCORE_KEY = 'scar-high-score'

export function getHighScore(): number {
  try {
    const val = localStorage.getItem(HIGH_SCORE_KEY)
    return val ? parseFloat(val) : 0
  } catch {
    return 0
  }
}

export function setHighScore(score: number): void {
  try {
    localStorage.setItem(HIGH_SCORE_KEY, score.toFixed(1))
  } catch {}
}
