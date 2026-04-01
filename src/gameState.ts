import type { GlobalGameData } from './types'

export const gameData: GlobalGameData = {
  currentGuestId: null,
  currentGuestName: null,
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
  currentFortuneTellerChoiceOptions: null,
  waitingPanelAlpha: 1
}
