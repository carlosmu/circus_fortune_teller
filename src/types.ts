export type FortuneCategory = 'love' | 'money' | 'health' | 'work' | 'mystery'

export type Fortune = {
  text: string
  category: FortuneCategory
}

export type GameState = 'LIBRE' | 'OCUPADO' | 'MOSTRANDO_FORTUNA'

/** Tres categorías elegidas al azar para que el host elija en esta ronda. */
export type HostChoiceCategories = [FortuneCategory, FortuneCategory, FortuneCategory] | null

export type GlobalGameData = {
  currentGuestId: string | null
  currentGuestName: string | null
  currentHostId: string | null
  gameState: GameState
  currentFortune: Fortune | null
  /** Opciones de categoría para el host en la ronda actual (3 aleatorias). */
  currentHostChoiceOptions: HostChoiceCategories
}

