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
  /** Display name of the current host (synced with MessageBus). */
  currentHostName: string | null
  /** Absolute timestamp (ms) when host session ends. */
  hostSessionEndsAtMs: number | null
  /** Number of completed readings in the current host session. */
  hostReadingsDone: number
  /** Maximum readings allowed per host session. */
  hostMaxReadings: number
  /** Release timestamp after final reading (ms), if scheduled. */
  hostReleaseAtMs: number | null
  /** Smoothed remaining time for UI display (seconds). */
  hostTimeRemainingSec: number
  /** Center banner text (e.g. host announcements). */
  centerBannerText: string | null
  /** Absolute timestamp (ms) when center banner should disappear. */
  centerBannerUntilMs: number
  gameState: GameState
  currentFortune: Fortune | null
  /** Category options for the host this round (3 random). */
  currentHostChoiceOptions: HostChoiceCategories
  /** Alpha for "Waiting for the host..." text (0.5–1.0, animated). */
  waitingPanelAlpha: number
}

