import { engine, AudioSource, Transform } from '@dcl/sdk/ecs'
import { Vector3 } from '@dcl/sdk/math'
import { getPlayer } from '@dcl/sdk/players'
import { isStateSyncronized } from '@dcl/sdk/network'
import { gameData } from './gameState'
import { hideFortune3DTextImmediate } from './fortune3DText'
import { FORTUNE_TELLER_POSITION } from './scene'
import { startRevealFortuneCinematic, stopOrbitCinematic } from './cinematicCamera'
import { onStateEnter, fireStateEnter } from './fortuneFsm/machine'
import { fsmSession, restoreSessionFromPayload } from './fortuneFsm/session'
import {
  SharedGameState,
  SharedFsmSession,
  gameStateSyncEnt,
  fsmSessionSyncEnt,
  readFsmSession,
  u2n,
  opt2ms,
  initSyncedState
} from './syncedState'

export { patchSharedGameState } from './syncedState'

export const GUEST_MAX_READINGS_PER_SEAT = 3
export const GUEST_READING_IDLE_TIMEOUT_MS = 60000

export function touchGuestReadingInteractionDeadline(): void {
  if (gameData.gameState === 'OCUPADO' && gameData.currentGuestId !== null) {
    gameData.guestLastInteractionAtMs = Date.now()
  }
}

// ─── Audio ────────────────────────────────────────────────────────────────────

const REVEAL_SOUND_PATH = 'assets/audio/magic_reveal.mp3'
const BUTTON_CLICK_SOUND_PATH = 'assets/audio/button_short_click.mp3'
const CARD_GONG_SOUND_PATH = 'assets/audio/gong.mp3'
const CARD_GONG_VOLUME = 0.5
const CARD_GONG_DEBOUNCE_MS = 120
const AUDIO_CLEANUP_MS = 2000

interface PendingAudio {
  entity: ReturnType<typeof engine.addEntity>
  createdAt: number
}
const pendingAudios: PendingAudio[] = []

function audioCleanupSystem(): void {
  const now = Date.now()
  for (let i = pendingAudios.length - 1; i >= 0; i--) {
    if (now - pendingAudios[i].createdAt >= AUDIO_CLEANUP_MS) {
      engine.removeEntity(pendingAudios[i].entity)
      pendingAudios.splice(i, 1)
    }
  }
}

function setupSoundEntities(): void {
  engine.addSystem(audioCleanupSystem)
}

export function playRevealSound(): void {
  const e = engine.addEntity()
  Transform.create(e, {
    position: Vector3.create(FORTUNE_TELLER_POSITION.x, FORTUNE_TELLER_POSITION.y + 1, FORTUNE_TELLER_POSITION.z)
  })
  AudioSource.create(e, { audioClipUrl: REVEAL_SOUND_PATH, playing: true, loop: false, volume: 1 })
  pendingAudios.push({ entity: e, createdAt: Date.now() })
}

export function playButtonClick(): void {
  const e = engine.addEntity()
  Transform.create(e, { position: Vector3.create(8, 1, 8) })
  AudioSource.create(e, { audioClipUrl: BUTTON_CLICK_SOUND_PATH, playing: true, loop: false, volume: 1 })
  pendingAudios.push({ entity: e, createdAt: Date.now() })
}

let lastCardGongAtMs = 0

export function playCardGongSound(): void {
  const now = Date.now()
  if (now - lastCardGongAtMs < CARD_GONG_DEBOUNCE_MS) return
  lastCardGongAtMs = now
  const e = engine.addEntity()
  Transform.create(e, { position: Vector3.create(8, 1, 8) })
  AudioSource.create(e, {
    audioClipUrl: CARD_GONG_SOUND_PATH,
    playing: true,
    loop: false,
    volume: CARD_GONG_VOLUME,
    global: true
  })
  pendingAudios.push({ entity: e, createdAt: now })
}

// ─── Reader system ────────────────────────────────────────────────────────────

let prevGuestSeatUserId: string | null = null
let prevGameState = 'LIBRE'
let lastAppliedGsVersion = -1
let lastAppliedFsmVersion = -1

type GuestDeclinedCb = (prevGuestId: string | null) => void
let guestDeclinedCb: GuestDeclinedCb | null = null

/** Register a callback fired on the dismissed guest's client when the host ends their session. */
export function onGuestDeclinedMore(cb: GuestDeclinedCb): void {
  guestDeclinedCb = cb
}

function applySharedGameState(): void {
  const c = SharedGameState.getOrNull(gameStateSyncEnt)
  if (c === null || c.syncVersion === lastAppliedGsVersion) return
  lastAppliedGsVersion = c.syncVersion

  const nowSeatId = u2n(c.guestSeatUserId)
  const nowGuestId = u2n(c.currentGuestId)
  const wasOcupado = prevGameState === 'OCUPADO'
  const nowOcupado = c.gameState === 'OCUPADO'
  const localUid = getPlayer()?.userId ?? null
  const prevGuestId = gameData.currentGuestId
  const prevRoundSalt = gameData.revelationRoundSalt

  if (nowSeatId !== prevGuestSeatUserId) {
    if (nowSeatId !== null) {
      gameData.previouslySelectedCategories = []
      gameData.categoryRejectionLine = null
    }
    prevGuestSeatUserId = nowSeatId
  }

  gameData.currentGuestId = nowGuestId
  gameData.currentGuestName = u2n(c.currentGuestName)
  gameData.guestSeatUserId = nowSeatId
  gameData.guestSeatUserName = u2n(c.guestSeatUserName)
  gameData.guestReadingsUsedThisSeat = c.guestReadingsUsedThisSeat
  gameData.currentFortuneTellerId = u2n(c.currentFortuneTellerId)
  gameData.currentFortuneTellerName = u2n(c.currentFortuneTellerName)
  gameData.fortuneTellerSessionEndsAtMs = opt2ms(c.fortuneTellerSessionEndsAtMs)
  gameData.fortuneTellerReadingsDone = c.fortuneTellerReadingsDone
  gameData.fortuneTellerMaxReadings = c.fortuneTellerMaxReadings
  gameData.fortuneTellerReleaseAtMs = opt2ms(c.fortuneTellerReleaseAtMs)
  gameData.centerBannerText = u2n(c.centerBannerText)
  gameData.centerBannerUntilMs = c.centerBannerUntilMs
  gameData.centerBannerVariant = c.centerBannerVariant as typeof gameData.centerBannerVariant
  gameData.revelationRoundSalt = c.revelationRoundSalt
  gameData.currentIteration = c.currentIteration as 1 | 2 | 3
  gameData.gameState = c.gameState as typeof gameData.gameState

  const isFirstReading = !wasOcupado && nowOcupado
  const isNewRound = nowOcupado && c.revelationRoundSalt !== prevRoundSalt
  if (isFirstReading || isNewRound) {
    gameData.revelationPhase = 'ft_asks_topic'
    gameData.pendingGuestCategory = null
    gameData.suggestedCategory = null
    gameData.rejectedCategoryThisTurn = null
    gameData.categoryRejectionLine = null
    gameData.guestLastInteractionAtMs = Date.now()
    if (localUid !== null && localUid === nowGuestId) {
      startRevealFortuneCinematic()
    }
  }

  if (wasOcupado && !nowOcupado) {
    hideFortune3DTextImmediate()
    if (localUid !== null && localUid === prevGuestId) {
      stopOrbitCinematic()
    }
    gameData.revelationPhase = 'idle'
    gameData.pendingGuestCategory = null
    gameData.currentFortune = null
    gameData.guestLastInteractionAtMs = null
    gameData.categoryRejectionLine = null
    gameData.suggestedCategory = null
    gameData.rejectedCategoryThisTurn = null
    if (c.sessionEndReason === 'guest_declined' && guestDeclinedCb !== null) {
      guestDeclinedCb(prevGuestId)
    }
  }

  prevGameState = c.gameState
}

function applySharedFsmSession(): void {
  const c = SharedFsmSession.getOrNull(fsmSessionSyncEnt)
  if (c === null || c.syncVersion === lastAppliedFsmVersion) return
  lastAppliedFsmVersion = c.syncVersion

  const prevState = fsmSession.state
  restoreSessionFromPayload(readFsmSession())
  if (prevState !== fsmSession.state) {
    fireStateEnter(fsmSession.state)
  }
}

export function setupFortuneSync(): void {
  initSyncedState()
  setupSoundEntities()
  onStateEnter((state) => {
    if (state === 'REVEAL') playRevealSound()
  })
  engine.addSystem(() => {
    if (!isStateSyncronized()) return
    applySharedGameState()
    applySharedFsmSession()
  })
}
