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
  selectedDeck: FsmDeck | null
  selectedCardType: FsmCardChoice | null
  /** Host-chosen fortune key A/B/C → mapped copy at reveal. */
  selectedFortune: FsmCardChoice | null
  /** World line e.g. "Reading: Category" */
  worldBanner: string | null
  /** Guest copy during FORTUNE_SELECTION + delay before REVEAL. */
  fortuneGuestHint: 'reading' | 'clear' | 'idle'
  /** When host confirmed A/B/C (ms) for 2s delay before REVEAL. */
  hostFortunePickedAtMs: number | null
  /** When REVEAL started (ms) for auto-advance to CONTINUE. */
  revealEnteredAtMs: number | null
  /** Categories already used this seating (exclude on loop). */
  usedCategories: string[]
  /** Card row: which slot flipped (UI). */
  cardFlipIndex: number | null
  /** Finished reading global line. */
  sessionFinishedMessage: string | null
}

export const FSM_DEBOUNCE_MS = 400

export const FORTUNE_LINE_BY_CHOICE: Record<FsmCardChoice, string> = {
  A: 'find unexpected joy in the coming days.',
  B: 'face a trial that will strengthen you.',
  C: 'discover a truth that was hidden from you.'
}
