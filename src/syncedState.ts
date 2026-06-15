import { engine, Schemas } from '@dcl/sdk/ecs'
import { syncEntity } from '@dcl/sdk/network'
import type { FsmSession } from './fortuneFsm/types'

export const SharedGameState = engine.defineComponent('fortune:gs', {
  syncVersion: Schemas.Int,
  gameState: Schemas.String,
  currentGuestId: Schemas.Optional(Schemas.String),
  currentGuestName: Schemas.Optional(Schemas.String),
  guestSeatUserId: Schemas.Optional(Schemas.String),
  guestSeatUserName: Schemas.Optional(Schemas.String),
  guestReadingsUsedThisSeat: Schemas.Int,
  currentFortuneTellerId: Schemas.Optional(Schemas.String),
  currentFortuneTellerName: Schemas.Optional(Schemas.String),
  fortuneTellerSessionEndsAtMs: Schemas.Optional(Schemas.Int64),
  fortuneTellerReadingsDone: Schemas.Int,
  fortuneTellerMaxReadings: Schemas.Int,
  fortuneTellerReleaseAtMs: Schemas.Optional(Schemas.Int64),
  centerBannerText: Schemas.Optional(Schemas.String),
  centerBannerUntilMs: Schemas.Int64,
  centerBannerVariant: Schemas.String,
  currentIteration: Schemas.Int,
  revelationRoundSalt: Schemas.Int64,
  sessionEndReason: Schemas.String,
})

export const SharedFsmSession = engine.defineComponent('fortune:fsm', {
  syncVersion: Schemas.Int,
  active: Schemas.Boolean,
  hostId: Schemas.Optional(Schemas.String),
  guestId: Schemas.Optional(Schemas.String),
  guestName: Schemas.Optional(Schemas.String),
  state: Schemas.String,
  selectedCategory: Schemas.Optional(Schemas.String),
  selectedCategoryKey: Schemas.Optional(Schemas.String),
  selectedDeck: Schemas.Optional(Schemas.String),
  selectedCardType: Schemas.Optional(Schemas.String),
  selectedFortune: Schemas.Optional(Schemas.String),
  fortuneGuestHint: Schemas.String,
  hostFortunePickedAtMs: Schemas.Optional(Schemas.Int64),
  revealEnteredAtMs: Schemas.Optional(Schemas.Int64),
  revealFortuneText: Schemas.Optional(Schemas.String),
  usedCategories: Schemas.Array(Schemas.String),
  cardFlipIndex: Schemas.Optional(Schemas.Int),
  sessionFinishedMessage: Schemas.Optional(Schemas.String),
  sessionFinishedExpiresAtMs: Schemas.Optional(Schemas.Int64),
  isVirtualHost: Schemas.Boolean,
  virtualHostPendingAtMs: Schemas.Optional(Schemas.Int64),
})

const SYNC_ID_GAME_STATE = 1
const SYNC_ID_FSM_SESSION = 2

export const gameStateSyncEnt = engine.addEntity()
export const fsmSessionSyncEnt = engine.addEntity()

/** Must be called once from inside main() before any other sync operations. */
export function initSyncedState(): void {
  SharedGameState.createOrReplace(gameStateSyncEnt, {
    syncVersion: 0,
    gameState: 'LIBRE',
    guestReadingsUsedThisSeat: 0,
    fortuneTellerReadingsDone: 0,
    fortuneTellerMaxReadings: 3,
    centerBannerUntilMs: 0,
    centerBannerVariant: 'default',
    currentIteration: 1,
    revelationRoundSalt: 0,
    sessionEndReason: '',
  })
  syncEntity(gameStateSyncEnt, [SharedGameState.componentId], SYNC_ID_GAME_STATE)

  SharedFsmSession.createOrReplace(fsmSessionSyncEnt, {
    syncVersion: 0,
    active: false,
    state: 'RESET',
    fortuneGuestHint: 'idle',
    usedCategories: [],
    isVirtualHost: false,
  })
  syncEntity(fsmSessionSyncEnt, [SharedFsmSession.componentId], SYNC_ID_FSM_SESSION)
}

// null ↔ undefined helpers (Schemas.Optional uses undefined; FsmSession/gameData use null)
export const n2u = <T>(v: T | null | undefined): T | undefined => (v !== null && v !== undefined ? v : undefined)
export const u2n = <T>(v: T | undefined): T | null => (v !== undefined ? v : null)
const ms2opt = (v: number | null): number | undefined => (v !== null ? v : undefined)
export const opt2ms = (v: number | undefined): number | null => (v !== undefined ? v : null)

export function writeFsmSession(s: FsmSession): void {
  const c = SharedFsmSession.getMutable(fsmSessionSyncEnt)
  c.syncVersion = (c.syncVersion + 1) | 0
  c.active = s.active
  c.hostId = n2u(s.hostId)
  c.guestId = n2u(s.guestId)
  c.guestName = n2u(s.guestName)
  c.state = s.state
  c.selectedCategory = n2u(s.selectedCategory)
  c.selectedCategoryKey = n2u(s.selectedCategoryKey)
  c.selectedDeck = n2u(s.selectedDeck)
  c.selectedCardType = n2u(s.selectedCardType)
  c.selectedFortune = n2u(s.selectedFortune)
  c.fortuneGuestHint = s.fortuneGuestHint
  c.hostFortunePickedAtMs = ms2opt(s.hostFortunePickedAtMs)
  c.revealEnteredAtMs = ms2opt(s.revealEnteredAtMs)
  c.revealFortuneText = n2u(s.revealFortuneText)
  c.usedCategories = [...s.usedCategories]
  c.cardFlipIndex = n2u(s.cardFlipIndex)
  c.sessionFinishedMessage = n2u(s.sessionFinishedMessage)
  c.sessionFinishedExpiresAtMs = ms2opt(s.sessionFinishedExpiresAtMs)
  c.isVirtualHost = s.isVirtualHost
  c.virtualHostPendingAtMs = ms2opt(s.virtualHostPendingAtMs)
}

export function readFsmSession(): FsmSession {
  const c = SharedFsmSession.get(fsmSessionSyncEnt)
  return {
    active: c.active,
    hostId: u2n(c.hostId),
    guestId: u2n(c.guestId),
    guestName: u2n(c.guestName),
    state: c.state as FsmSession['state'],
    selectedCategory: u2n(c.selectedCategory),
    selectedCategoryKey: u2n(c.selectedCategoryKey) as FsmSession['selectedCategoryKey'],
    selectedDeck: u2n(c.selectedDeck) as FsmSession['selectedDeck'],
    selectedCardType: u2n(c.selectedCardType) as FsmSession['selectedCardType'],
    selectedFortune: u2n(c.selectedFortune) as FsmSession['selectedFortune'],
    fortuneGuestHint: c.fortuneGuestHint as FsmSession['fortuneGuestHint'],
    hostFortunePickedAtMs: opt2ms(c.hostFortunePickedAtMs),
    revealEnteredAtMs: opt2ms(c.revealEnteredAtMs),
    revealFortuneText: u2n(c.revealFortuneText),
    usedCategories: [...c.usedCategories] as FsmSession['usedCategories'],
    cardFlipIndex: u2n(c.cardFlipIndex) as FsmSession['cardFlipIndex'],
    sessionFinishedMessage: u2n(c.sessionFinishedMessage),
    sessionFinishedExpiresAtMs: opt2ms(c.sessionFinishedExpiresAtMs),
    isVirtualHost: c.isVirtualHost,
    virtualHostPendingAtMs: opt2ms(c.virtualHostPendingAtMs),
  }
}

export function patchSharedGameState(patch: {
  gameState?: string
  currentGuestId?: string | null
  currentGuestName?: string | null
  guestSeatUserId?: string | null
  guestSeatUserName?: string | null
  guestReadingsUsedThisSeat?: number
  currentFortuneTellerId?: string | null
  currentFortuneTellerName?: string | null
  fortuneTellerSessionEndsAtMs?: number | null
  fortuneTellerReadingsDone?: number
  fortuneTellerMaxReadings?: number
  fortuneTellerReleaseAtMs?: number | null
  centerBannerText?: string | null
  centerBannerUntilMs?: number
  centerBannerVariant?: string
  currentIteration?: number
  revelationRoundSalt?: number
  sessionEndReason?: string
}): void {
  const c = SharedGameState.getMutable(gameStateSyncEnt)
  c.syncVersion = (c.syncVersion + 1) | 0
  if (patch.gameState !== undefined) c.gameState = patch.gameState
  if (patch.currentGuestId !== undefined) c.currentGuestId = n2u(patch.currentGuestId)
  if (patch.currentGuestName !== undefined) c.currentGuestName = n2u(patch.currentGuestName)
  if (patch.guestSeatUserId !== undefined) c.guestSeatUserId = n2u(patch.guestSeatUserId)
  if (patch.guestSeatUserName !== undefined) c.guestSeatUserName = n2u(patch.guestSeatUserName)
  if (patch.guestReadingsUsedThisSeat !== undefined) c.guestReadingsUsedThisSeat = patch.guestReadingsUsedThisSeat
  if (patch.currentFortuneTellerId !== undefined) c.currentFortuneTellerId = n2u(patch.currentFortuneTellerId)
  if (patch.currentFortuneTellerName !== undefined) c.currentFortuneTellerName = n2u(patch.currentFortuneTellerName)
  if (patch.fortuneTellerSessionEndsAtMs !== undefined) c.fortuneTellerSessionEndsAtMs = ms2opt(patch.fortuneTellerSessionEndsAtMs)
  if (patch.fortuneTellerReadingsDone !== undefined) c.fortuneTellerReadingsDone = patch.fortuneTellerReadingsDone
  if (patch.fortuneTellerMaxReadings !== undefined) c.fortuneTellerMaxReadings = patch.fortuneTellerMaxReadings
  if (patch.fortuneTellerReleaseAtMs !== undefined) c.fortuneTellerReleaseAtMs = ms2opt(patch.fortuneTellerReleaseAtMs)
  if (patch.centerBannerText !== undefined) c.centerBannerText = n2u(patch.centerBannerText)
  if (patch.centerBannerUntilMs !== undefined) c.centerBannerUntilMs = patch.centerBannerUntilMs
  if (patch.centerBannerVariant !== undefined) c.centerBannerVariant = patch.centerBannerVariant
  if (patch.currentIteration !== undefined) c.currentIteration = patch.currentIteration
  if (patch.revelationRoundSalt !== undefined) c.revelationRoundSalt = patch.revelationRoundSalt
  if (patch.sessionEndReason !== undefined) c.sessionEndReason = patch.sessionEndReason
}
