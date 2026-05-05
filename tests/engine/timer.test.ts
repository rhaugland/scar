import { describe, it, expect } from 'vitest'
import { createTimer, tickTimer, addTime, getTimerColor } from '@/engine/timer'
import { TIMER_START, TIMER_PER_KILL, COLORS } from '@/engine/constants'

describe('timer', () => {
  it('createTimer starts at TIMER_START', () => {
    expect(createTimer()).toBe(TIMER_START)
  })

  it('tickTimer decreases by dt', () => {
    expect(tickTimer(10, 1 / 60)).toBeCloseTo(10 - 1 / 60)
  })

  it('tickTimer does not go below 0', () => {
    expect(tickTimer(0.001, 1)).toBe(0)
  })

  it('addTime adds TIMER_PER_KILL', () => {
    expect(addTime(5)).toBe(5 + TIMER_PER_KILL)
  })

  it('getTimerColor returns white when safe', () => {
    expect(getTimerColor(8)).toBe(COLORS.timerSafe)
  })

  it('getTimerColor returns yellow when warning', () => {
    expect(getTimerColor(4)).toBe(COLORS.timerWarning)
  })

  it('getTimerColor returns red when critical', () => {
    expect(getTimerColor(1.5)).toBe(COLORS.timerCritical)
  })
})
