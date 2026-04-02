import type { GlobalGameData } from './types'

export const gameData: GlobalGameData = {
  currentGuestId: null,
  currentGuestName: null,
  guestSeatUserId: null,
  guestSeatUserName: null,
  guestReadingsUsedThisSeat: 0,
  guestLastInteractionAtMs: null,
  currentFortuneTellerId: null,
  currentFortuneTellerName: null,
  fortuneTellerSessionEndsAtMs: null,
  fortuneTellerReadingsDone: 0,
  fortuneTellerMaxReadings: 3,
  fortuneTellerReleaseAtMs: null,
  fortuneTellerTimeRemainingSec: 0,
  centerBannerText: null,
  centerBannerUntilMs: 0,
  gameState: 'LIBRE',
  currentFortune: null,
  revelationPhase: 'idle',
  revelationRoundSalt: 0,
  pendingGuestCategory: null,
  previouslySelectedCategories: [],
  currentIteration: 1,
  categoryRejectionLine: null,
  waitingPanelAlpha: 1
}
