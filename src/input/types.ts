import type { InputState } from '@/engine/types'

export interface InputHandler {
  getState(): InputState
  attach(element: HTMLElement): void
  detach(): void
  enable(): void
  disable(): void
}
