import type { FortuneCategory } from '../types'

/** Core FSM states for Host + Guest fortune flow (spectators out of scope). */
export type FsmState =
  | 'INIT'
  | 'CATEGORY_SELECTION'
  | 'DECK_SELECTION'
  | 'CARD_SELECTION'
  | 'FORTUNE_SELECTION'
  | 'REVEAL'
  | 'CONTINUE_DECISION'
  | 'RESET'

export type FsmDeck = 'Funny' | 'Serious' | 'Strange'

export type FsmCardChoice = 'A' | 'B' | 'C'

/** Snapshot synced across clients (MessageBus). */
export type FsmSession = {
  active: boolean
  hostId: string | null
  guestId: string | null
  guestName: string | null
  state: FsmState
  selectedCategory: string | null
  /** Clave `FortuneCategory` para filtrar `FORTUNES` al revelar (la etiqueta va en `selectedCategory`). */
  selectedCategoryKey: FortuneCategory | null
  selectedDeck: FsmDeck | null
  selectedCardType: FsmCardChoice | null
  /** Host-chosen fortune key A/B/C → mapped copy at reveal. */
  selectedFortune: FsmCardChoice | null
  /** Guest copy during FORTUNE_SELECTION + delay before REVEAL. */
  fortuneGuestHint: 'reading' | 'clear' | 'idle'
  /** When host confirmed A/B/C (ms) for 2s delay before REVEAL. */
  hostFortunePickedAtMs: number | null
  /** When REVEAL started (ms) for auto-advance to CONTINUE. */
  revealEnteredAtMs: number | null
  /** Categorías ya elegidas en esta sesión FSM (no vuelven a salir en la terna hasta agotar las 6). */
  usedCategories: FortuneCategory[]
  /** Card row: which slot flipped (UI). */
  cardFlipIndex: number | null
  /** Finished reading global line. */
  sessionFinishedMessage: string | null
  /** When the session finished message expires (ms). */
  sessionFinishedExpiresAtMs: number | null
  /** No human fortune teller: FSM auto-picks host decisions. */
  isVirtualHost: boolean
  /** When virtual host entered state needing auto-pick (ms). */
  virtualHostPendingAtMs: number | null
}

export const FSM_DEBOUNCE_MS = 400
