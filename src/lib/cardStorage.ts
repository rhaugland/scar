import type { CollectedCard, CardCollection, Tier, Monster, MonsterCollection } from '@/engine/types'

const STORAGE_KEY = 'scar-monsters'

const TIER_RANK: Record<Tier, number> = { bronze: 1, silver: 2, gold: 3 }

function migrateV1(v1: MonsterCollection): CardCollection {
  const cards: CollectedCard[] = v1.monsters.map((m: Monster) => {
    let tier: Tier = 'bronze'
    if (m.level >= 8) tier = 'gold'
    else if (m.level >= 5) tier = 'silver'

    return {
      date: new Date(m.createdAt).toISOString().slice(0, 10),
      name: m.name,
      tier,
      stats: m.stats,
      form: 'biped' as const,
      primaryColor: m.lineColors[0] || '#ec4899',
      secondaryColor: m.lineColors[1] || '#ffffff',
      bestLevel: m.level,
      bestKills: m.kills,
      unlockedAt: m.createdAt,
    }
  })

  return { cards, version: 2, todayBest: { date: '', tier: null, bestLevel: 0, bestKills: 0 } }
}

function loadCollection(): CardCollection {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { cards: [], version: 2, todayBest: { date: '', tier: null, bestLevel: 0, bestKills: 0 } }
    const parsed = JSON.parse(raw)
    if (parsed.version === 1) {
      const migrated = migrateV1(parsed as MonsterCollection)
      saveCollection(migrated)
      return migrated
    }
    return parsed as CardCollection
  } catch {
    return { cards: [], version: 2, todayBest: { date: '', tier: null, bestLevel: 0, bestKills: 0 } }
  }
}

function saveCollection(collection: CardCollection): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(collection))
  } catch {}
}

export function getCards(): CollectedCard[] {
  return loadCollection().cards
}

export function getCardCount(): number {
  return loadCollection().cards.length
}

export function getCardForDate(date: string): CollectedCard | null {
  const cards = loadCollection().cards
  return cards.find(c => c.date === date) ?? null
}

export function saveCardResult(card: CollectedCard): void {
  const collection = loadCollection()
  const existingIndex = collection.cards.findIndex(c => c.date === card.date)

  if (existingIndex >= 0) {
    const existing = collection.cards[existingIndex]
    if (TIER_RANK[card.tier] > TIER_RANK[existing.tier]) {
      collection.cards[existingIndex] = card
    }
  } else {
    collection.cards.push(card)
  }

  collection.todayBest = {
    date: card.date,
    tier: collection.cards.find(c => c.date === card.date)!.tier,
    bestLevel: Math.max(collection.todayBest.date === card.date ? collection.todayBest.bestLevel : 0, card.bestLevel),
    bestKills: Math.max(collection.todayBest.date === card.date ? collection.todayBest.bestKills : 0, card.bestKills),
  }

  saveCollection(collection)
}

export function getTodayProgress(date: string): CardCollection['todayBest'] {
  const collection = loadCollection()
  if (collection.todayBest.date === date) return collection.todayBest
  const card = collection.cards.find(c => c.date === date)
  if (card) {
    return { date, tier: card.tier, bestLevel: card.bestLevel, bestKills: card.bestKills }
  }
  return { date, tier: null, bestLevel: 0, bestKills: 0 }
}
