export type FortuneCategory = 'love' | 'money' | 'health' | 'work' | 'mystery' | 'pets' | 'family' | 'travel' | 'luck'

export type Fortune = {
  text: string
  category: FortuneCategory
}

export type GameState = 'LIBRE' | 'OCUPADO' | 'MOSTRANDO_FORTUNA'

/** Three random categories for the host to choose from this round. */
export type HostChoiceCategories = [FortuneCategory, FortuneCategory, FortuneCategory] | null

export type GlobalGameData = {
  currentGuestId: string | null
  currentGuestName: string | null
  currentHostId: string | null
  gameState: GameState
  currentFortune: Fortune | null
  /** Category options for the host this round (3 random). */
  currentHostChoiceOptions: HostChoiceCategories
  /** Alpha for "Waiting for the host..." text (0.5–1.0, animated). */
  waitingPanelAlpha: number
}

