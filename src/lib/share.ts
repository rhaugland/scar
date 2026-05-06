export function downloadMonsterCard(
  sourceCanvas: HTMLCanvasElement,
  name: string,
  stats: { hp: number; attack: number },
  level: number,
  kills: number,
): void {
  const w = 600
  const h = 800
  const card = document.createElement('canvas')
  card.width = w
  card.height = h
  const ctx = card.getContext('2d')!

  // Background
  ctx.fillStyle = '#0a0a0a'
  ctx.fillRect(0, 0, w, h)

  // Border glow
  ctx.strokeStyle = '#ec489940'
  ctx.lineWidth = 2
  ctx.strokeRect(8, 8, w - 16, h - 16)

  // Draw monster from source canvas
  const monsterSize = Math.min(w - 40, 500)
  const sx = (sourceCanvas.width - sourceCanvas.width) / 2
  const sy = 0
  ctx.drawImage(sourceCanvas, sx, sy, sourceCanvas.width, sourceCanvas.height, (w - monsterSize) / 2, 30, monsterSize, monsterSize)

  // Name
  ctx.textAlign = 'center'
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 32px monospace'
  ctx.fillText(name, w / 2, monsterSize + 70)

  // Stats
  ctx.fillStyle = '#ffffff99'
  ctx.font = '20px monospace'
  ctx.fillText(`HP ${stats.hp}    ATK ${stats.attack}`, w / 2, monsterSize + 110)

  // Level & kills
  ctx.fillStyle = '#ffffff66'
  ctx.font = '16px monospace'
  ctx.fillText(`Level ${level}  |  ${kills} kills`, w / 2, monsterSize + 145)

  // Branding
  ctx.fillStyle = '#ffffff30'
  ctx.font = '12px monospace'
  ctx.fillText('CONSTELLATIONAL', w / 2, h - 20)

  // Download
  const url = card.toDataURL('image/jpeg', 0.92)
  const a = document.createElement('a')
  a.href = url
  a.download = `constellational-${name.toLowerCase().replace(/\s+/g, '-')}.jpg`
  a.click()
}

export async function shareArenaPainting(canvas: HTMLCanvasElement, score: number, kills: number): Promise<void> {
  try {
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'))
    if (!blob) return

    const file = new File([blob], `constellational-${score.toFixed(1)}s.png`, { type: 'image/png' })

    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      await navigator.share({
        title: 'CONSTELLATIONAL',
        text: `${score.toFixed(1)}s | ${kills} kills`,
        files: [file],
      })
    } else {
      // Fallback: download
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = file.name
      a.click()
      URL.revokeObjectURL(url)
    }
  } catch {}
}
