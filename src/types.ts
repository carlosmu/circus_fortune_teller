export type FortuneCategory = 'amor' | 'dinero' | 'salud' | 'trabajo' | 'misterio'

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

