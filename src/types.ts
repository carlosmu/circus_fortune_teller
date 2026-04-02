export type FortuneCategory = 'love' | 'money' | 'health' | 'work' | 'mystery' | 'pets' | 'family' | 'travel' | 'luck'

export type FortuneKind = 'advertencia' | 'consejo' | 'prediccion'

export type Fortune = {
  text: string
  category: FortuneCategory
  type: FortuneKind
}

export type GameState = 'LIBRE' | 'OCUPADO' | 'MOSTRANDO_FORTUNA'

/** Three random categories for the fortune teller to choose from this round. */
export type FortuneTellerChoiceCategories = [FortuneCategory, FortuneCategory, FortuneCategory] | null

/** Multi-step revelation while the table is occupied. */
export type RevelationPhase =
  | 'idle'
  | 'ft_asks_topic'
  | 'guest_chooses_category'
  | 'ft_chooses_kind'

export type GlobalGameData = {
  currentGuestId: string | null
  currentGuestName: string | null
  /** Player currently seated at Sit Spot: Guest (synced). */
  guestSeatUserId: string | null
  guestSeatUserName: string | null
  currentFortuneTellerId: string | null
  /** Display name of the current fortune teller (synced with MessageBus). */
  currentFortuneTellerName: string | null
  /** Absolute timestamp (ms) when fortune teller session ends. */
  fortuneTellerSessionEndsAtMs: number | null
  /** Number of completed readings in the current fortune teller session. */
  fortuneTellerReadingsDone: number
  /** Maximum readings allowed per fortune teller session. */
  fortuneTellerMaxReadings: number
  /** Release timestamp after final reading (ms), if scheduled. */
  fortuneTellerReleaseAtMs: number | null
  /** Smoothed remaining time for UI display (seconds). */
  fortuneTellerTimeRemainingSec: number
  /** Center banner text (e.g. fortune teller announcements). */
  centerBannerText: string | null
  /** Absolute timestamp (ms) when center banner should disappear. */
  centerBannerUntilMs: number
  gameState: GameState
  currentFortune: Fortune | null
  revelationPhase: RevelationPhase
  /** Salt from the guest request so all clients derive the same card options and auto picks. */
  revelationRoundSalt: number
  /** Category chosen by the guest before the fortune teller picks warning / advice / prediction. */
  pendingGuestCategory: FortuneCategory | null
  /** Alpha for "Waiting for the fortune teller..." text (0.5–1.0, animated). */
  waitingPanelAlpha: number
}

