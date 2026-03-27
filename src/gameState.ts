import type { GlobalGameData } from './types'

export const gameData: GlobalGameData = {
  currentGuestId: null,
  currentGuestName: null,
  currentHostId: null,
  currentHostName: null,
  hostSessionEndsAtMs: null,
  hostReadingsDone: 0,
  hostMaxReadings: 3,
  hostReleaseAtMs: null,
  hostTimeRemainingSec: 0,
  centerBannerText: null,
  centerBannerUntilMs: 0,
  gameState: 'LIBRE',
  currentFortune: null,
  currentHostChoiceOptions: null,
  waitingPanelAlpha: 1
}

