import type { Monster, MonsterCollection } from '@/engine/types'
import { MONSTER_CAP } from '@/engine/constants'

const STORAGE_KEY = 'scar-monsters'

function loadCollection(): MonsterCollection {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { monsters: [], version: 1 }
    return JSON.parse(raw) as MonsterCollection
  } catch {
    return { monsters: [], version: 1 }
  }
}

function saveCollection(collection: MonsterCollection): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(collection))
  } catch {}
}

export function getMonsters(): Monster[] {
  return loadCollection().monsters
}

export function getMonsterCount(): number {
  return loadCollection().monsters.length
}

export function addMonster(monster: Monster): boolean {
  const collection = loadCollection()
  if (collection.monsters.length >= MONSTER_CAP) return false
  collection.monsters.push(monster)
  saveCollection(collection)
  return true
}

export function removeMonster(id: string): void {
  const collection = loadCollection()
  collection.monsters = collection.monsters.filter(m => m.id !== id)
  saveCollection(collection)
}
