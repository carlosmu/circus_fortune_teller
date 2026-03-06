export type FortuneCategory = 'love' | 'money' | 'health' | 'work' | 'mystery'

export type Fortune = {
  text: string
  category: FortuneCategory
}

export type GameState = 'LIBRE' | 'OCUPADO' | 'MOSTRANDO_FORTUNA'

export type GlobalGameData = {
  currentGuestId: string | null
  currentGuestName: string | null
  gameState: GameState
  currentFortune: Fortune | null
}

