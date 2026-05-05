export async function shareArenaPainting(canvas: HTMLCanvasElement, score: number, kills: number): Promise<void> {
  try {
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'))
    if (!blob) return

    const file = new File([blob], `scar-${score.toFixed(1)}s.png`, { type: 'image/png' })

    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      await navigator.share({
        title: 'SCAR',
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
