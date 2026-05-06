'use client'

import { useState, useCallback, useEffect } from 'react'
import { GameCanvas } from '@/components/GameCanvas'
import { PreGameScreen } from '@/components/PreGameScreen'
import { CardRevealScreen } from '@/components/CardRevealScreen'
import { DeathScreen } from '@/components/DeathScreen'
import { TabBar } from '@/components/TabBar'
import { CollectionTab } from '@/components/CollectionTab'
import { BattleTab } from '@/components/BattleTab'
import { generateDailyCard, getTierForLevel, adjustStats, getNextTierInfo, getTodayDateString } from '@/engine/dailyCard'
import { getHighScore } from '@/lib/storage'
import { getCards, getCardCount, saveCardResult, getTodayProgress } from '@/lib/cardStorage'
import type { GameState, Tier, CollectedCard, DailyCard } from '@/engine/types'

type Tab = 'play' | 'collection' | 'battle'
type Screen = 'pre-game' | 'playing' | 'reveal' | 'dead'

const TIER_RANK: Record<Tier, number> = { bronze: 1, silver: 2, gold: 3 }

export default function Home() {
  const [tab, setTab] = useState<Tab>('play')
  const [screen, setScreen] = useState<Screen>('pre-game')
  const [highScore, setHighScore] = useState(0)
  const [cards, setCards] = useState<CollectedCard[]>([])
  const [cardCount, setCardCount] = useState(0)

  // Daily card state
  const [todayDate] = useState(() => getTodayDateString())
  const [dailyCard] = useState<DailyCard>(() => generateDailyCard(getTodayDateString()))
  const [currentTier, setCurrentTier] = useState<Tier | null>(null)

  // Reveal state
  const [revealTier, setRevealTier] = useState<Tier>('bronze')
  const [revealLevel, setRevealLevel] = useState(0)
  const [revealKills, setRevealKills] = useState(0)
  const [revealIsUpgrade, setRevealIsUpgrade] = useState(false)

  // Death state (no tier earned)
  const [deathState, setDeathState] = useState<GameState | null>(null)

  const refreshCards = useCallback(() => {
    setCards(getCards())
    setCardCount(getCardCount())
  }, [])

  const refreshTodayProgress = useCallback(() => {
    const progress = getTodayProgress(todayDate)
    setCurrentTier(progress.tier)
  }, [todayDate])

  useEffect(() => {
    setHighScore(getHighScore())
    refreshCards()
    refreshTodayProgress()
  }, [refreshCards, refreshTodayProgress])

  const handleStart = useCallback(() => {
    setScreen('playing')
  }, [])

  const handleDeath = useCallback((state: GameState) => {
    setHighScore(state.highScore)

    const earnedTier = getTierForLevel(state.level)

    // Check if this unlocks or upgrades a tier
    if (earnedTier && (!currentTier || TIER_RANK[earnedTier] > TIER_RANK[currentTier])) {
      // Save the card
      const stats = adjustStats(dailyCard.baseStats, earnedTier)
      const card: CollectedCard = {
        date: todayDate,
        name: dailyCard.name,
        tier: earnedTier,
        stats,
        form: dailyCard.form,
        primaryColor: dailyCard.primaryColor,
        secondaryColor: dailyCard.secondaryColor,
        bestLevel: state.level,
        bestKills: state.kills,
        unlockedAt: Date.now(),
      }
      saveCardResult(card)
      refreshCards()

      const isUpgrade = currentTier !== null
      setCurrentTier(earnedTier)

      // Show reveal
      setRevealTier(earnedTier)
      setRevealLevel(state.level)
      setRevealKills(state.kills)
      setRevealIsUpgrade(isUpgrade)
      setScreen('reveal')
    } else {
      // No new tier — show death screen
      setDeathState(state)
      setScreen('dead')
    }
  }, [currentTier, dailyCard, todayDate, refreshCards])

  const handlePlayAgain = useCallback(() => {
    setScreen('pre-game')
  }, [])

  const handleViewCollection = useCallback(() => {
    setScreen('pre-game')
    setTab('collection')
    refreshCards()
  }, [refreshCards])

  const handleRestart = useCallback(() => {
    setScreen('playing')
    const canvas = document.querySelector('canvas')
    canvas?.click()
  }, [])

  const handleTabChange = useCallback((newTab: Tab) => {
    setTab(newTab)
    if (newTab === 'collection') refreshCards()
    if (newTab === 'play') refreshTodayProgress()
  }, [refreshCards, refreshTodayProgress])

  const nextInfo = getNextTierInfo(currentTier)

  return (
    <div className="w-screen h-screen bg-black relative overflow-hidden">
      {/* Play tab */}
      <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-200 ${tab === 'play' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
        <GameCanvas onDeath={handleDeath} onStart={handleStart} />

        {screen === 'pre-game' && (
          <PreGameScreen
            dailyCard={dailyCard}
            currentTier={currentTier}
            highScore={highScore}
            onStart={handleStart}
          />
        )}

        {screen === 'reveal' && (
          <CardRevealScreen
            dailyCard={dailyCard}
            tier={revealTier}
            level={revealLevel}
            kills={revealKills}
            isUpgrade={revealIsUpgrade}
            onPlayAgain={handlePlayAgain}
            onViewCollection={handleViewCollection}
          />
        )}

        {screen === 'dead' && deathState && (
          <DeathScreen
            score={deathState.score}
            kills={deathState.kills}
            level={deathState.level}
            highScore={deathState.highScore}
            isNewHighScore={deathState.score >= deathState.highScore}
            currentTier={currentTier}
            nextTierName={nextInfo?.tier ?? null}
            nextTierLevel={nextInfo?.level ?? null}
            onRestart={handleRestart}
            onViewCollection={handleViewCollection}
          />
        )}
      </div>

      {/* Collection tab */}
      <div className={`absolute inset-0 transition-opacity duration-200 ${tab === 'collection' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
        <CollectionTab cards={cards} onCardsChange={refreshCards} />
      </div>

      {/* Battle tab */}
      <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-200 ${tab === 'battle' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
        <BattleTab />
      </div>

      {/* Tab bar */}
      <TabBar active={tab} onChange={handleTabChange} monsterCount={cardCount} />
    </div>
  )
}
