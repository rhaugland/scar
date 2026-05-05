import { TIMER_START, TIMER_PER_KILL, COLORS } from './constants'

export function createTimer(): number {
  return TIMER_START
}

export function tickTimer(timer: number, dt: number): number {
  return Math.max(0, timer - dt)
}

export function addTime(timer: number): number {
  return timer + TIMER_PER_KILL
}

export function getTimerColor(timer: number): string {
  if (timer < 2) return COLORS.timerCritical
  if (timer < 5) return COLORS.timerWarning
  return COLORS.timerSafe
}
