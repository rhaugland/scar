import type { InputState, Vec2 } from '@/engine/types'
import type { InputHandler } from './types'
import { normalize, sub } from '@/engine/vec2'

export class KeyboardInput implements InputHandler {
  private keys = new Set<string>()
  private dashDir: Vec2 | null = null
  private mousePos: Vec2 = { x: 0, y: 0 }
  private element: HTMLElement | null = null
  private enabled = false

  private onKeyDown = (e: KeyboardEvent) => {
    this.keys.add(e.key.toLowerCase())
  }
  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.key.toLowerCase())
  }
  private onMouseMove = (e: MouseEvent) => {
    const rect = this.element!.getBoundingClientRect()
    const scaleX = 700 / rect.width
    const scaleY = 700 / rect.height
    this.mousePos = {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    }
  }
  private playerPos: Vec2 = { x: 350, y: 350 }

  setPlayerPos(pos: Vec2): void {
    this.playerPos = pos
  }

  private onClick = () => {
    if (!this.enabled) return
    // Dash toward mouse position relative to player
    const dir = sub(this.mousePos, this.playerPos)
    if (dir.x !== 0 || dir.y !== 0) {
      this.dashDir = normalize(dir)
    }
  }

  enable(): void {
    this.enabled = true
  }

  disable(): void {
    this.enabled = false
    this.dashDir = null
  }

  attach(element: HTMLElement): void {
    this.element = element
    window.addEventListener('keydown', this.onKeyDown)
    window.addEventListener('keyup', this.onKeyUp)
    element.addEventListener('mousemove', this.onMouseMove)
    element.addEventListener('click', this.onClick)
  }

  detach(): void {
    window.removeEventListener('keydown', this.onKeyDown)
    window.removeEventListener('keyup', this.onKeyUp)
    this.element?.removeEventListener('mousemove', this.onMouseMove)
    this.element?.removeEventListener('click', this.onClick)
    this.element = null
  }

  getState(): InputState {
    let moveX = 0, moveY = 0
    if (this.keys.has('a') || this.keys.has('arrowleft')) moveX -= 1
    if (this.keys.has('d') || this.keys.has('arrowright')) moveX += 1
    if (this.keys.has('w') || this.keys.has('arrowup')) moveY -= 1
    if (this.keys.has('s') || this.keys.has('arrowdown')) moveY += 1

    const dashDirection = this.dashDir
    this.dashDir = null
    return { moveX, moveY, dashDirection }
  }
}
