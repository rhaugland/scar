import type { InputState, Vec2 } from '@/engine/types'
import type { InputHandler } from './types'
import { normalize } from '@/engine/vec2'

export class TouchInput implements InputHandler {
  private moveVector: Vec2 = { x: 0, y: 0 }
  private dashDir: Vec2 | null = null
  private joystickStart: Vec2 | null = null
  private swipeStart: Vec2 | null = null
  private element: HTMLElement | null = null
  private joystickTouchId: number | null = null

  private onTouchStart = (e: TouchEvent) => {
    e.preventDefault()
    const rect = this.element!.getBoundingClientRect()
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i]
      const x = touch.clientX - rect.left
      const halfWidth = rect.width / 2

      if (x < halfWidth) {
        this.joystickStart = { x: touch.clientX, y: touch.clientY }
        this.joystickTouchId = touch.identifier
      } else {
        this.swipeStart = { x: touch.clientX, y: touch.clientY }
      }
    }
  }

  private onTouchMove = (e: TouchEvent) => {
    e.preventDefault()
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i]
      if (touch.identifier === this.joystickTouchId && this.joystickStart) {
        const dx = touch.clientX - this.joystickStart.x
        const dy = touch.clientY - this.joystickStart.y
        const maxDist = 50
        this.moveVector = {
          x: Math.max(-1, Math.min(1, dx / maxDist)),
          y: Math.max(-1, Math.min(1, dy / maxDist)),
        }
      }
    }
  }

  private onTouchEnd = (e: TouchEvent) => {
    e.preventDefault()
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i]
      if (touch.identifier === this.joystickTouchId) {
        this.joystickStart = null
        this.joystickTouchId = null
        this.moveVector = { x: 0, y: 0 }
      } else if (this.swipeStart) {
        const dx = touch.clientX - this.swipeStart.x
        const dy = touch.clientY - this.swipeStart.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist > 20) {
          this.dashDir = normalize({ x: dx, y: dy })
        }
        this.swipeStart = null
      }
    }
  }

  attach(element: HTMLElement): void {
    this.element = element
    element.addEventListener('touchstart', this.onTouchStart, { passive: false })
    element.addEventListener('touchmove', this.onTouchMove, { passive: false })
    element.addEventListener('touchend', this.onTouchEnd, { passive: false })
  }

  detach(): void {
    this.element?.removeEventListener('touchstart', this.onTouchStart)
    this.element?.removeEventListener('touchmove', this.onTouchMove)
    this.element?.removeEventListener('touchend', this.onTouchEnd)
    this.element = null
  }

  getState(): InputState {
    const dashDirection = this.dashDir
    this.dashDir = null
    return { moveX: this.moveVector.x, moveY: this.moveVector.y, dashDirection }
  }
}
