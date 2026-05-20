import { engine, AudioSource, Transform } from '@dcl/sdk/ecs'
import { MessageBus } from '@dcl/sdk/message-bus'
import { Vector3 } from '@dcl/sdk/math'
import { getPlayer } from '@dcl/sdk/players'
import { gameData } from './gameState'
import { hideFortune3DTextImmediate } from './fortune3DText'
import { FORTUNE_TELLER_POSITION } from './scene'
import { startRevealFortuneCinematic, stopOrbitCinematic } from './cinematicCamera'
import { onStateEnter } from './fortuneFsm/machine'
import type { FortuneCategory } from './types'

/** MessageBus to sync fortune state across all players in the scene */
export const fortuneMessageBus = new MessageBus()

/** Máximo de pedidos de lectura por sesión en la silla de invitado. */
export const GUEST_MAX_READINGS_PER_SEAT = 3
/** Sin interacción durante OCUPADO tras este tiempo → expulsión + teleport (solo cliente invitado mueve). */
export const GUEST_READING_IDLE_TIMEOUT_MS = 60000

let previousGuestSeatUserId: string | null = null

export function touchGuestReadingInteractionDeadline(): void {
  if (gameData.gameState === 'OCUPADO' && gameData.currentGuestId !== null) {
    gameData.guestLastInteractionAtMs = Date.now()
  }
}

export type GuestRequestedMessage = {
  guestId: string
  guestName: string
  /** Shared by all clients so card options and auto picks match. */
  roundSalt: number
  /** 1..GUEST_MAX_READINGS_PER_SEAT — lectura de esta sesión en la silla. */
  sessionReadingIndex: number
}

export type GuestReadingIdleKickMessage = {
  guestId: string
}

/** El invitado eligió “No” a otra fortuna; el cliente local usa esto para limpiar flags del Sit Spot. */
export type GuestChairDeclineMoreMessage = {
  guestId: string
}

export type GuestSeatMessage = {
  seatUserId: string | null
  seatUserName: string | null
  /** Mismo patrón que `set-fortune-teller`: banner central al ocupar la silla. */
  centerBannerText?: string | null
  centerBannerUntilMs?: number
}

export type FortuneTellerSessionUpdateMessage = {
  fortuneTellerId: string | null
  fortuneTellerSessionEndsAtMs: number | null
  fortuneTellerReadingsDone: number
  fortuneTellerMaxReadings: number
  fortuneTellerReleaseAtMs: number | null
  centerBannerText?: string | null
  centerBannerUntilMs?: number
}

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
  Transform.create(e, { position: Vector3.create(FORTUNE_TELLER_POSITION.x, FORTUNE_TELLER_POSITION.y + 1, FORTUNE_TELLER_POSITION.z) })
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

/** Gong al aparecer cartas 3D (card_*). Global = mismo volumen en toda la escena. */
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

/**
 * Registers listeners so all clients update gameData and show 3D text when someone reveals a fortune (same realm).
 */
export function setupFortuneSync() {
  setupSoundEntities()
  onStateEnter((state) => {
    if (state === 'REVEAL') playRevealSound()
  })
  fortuneMessageBus.on('guest-requested-fortune', (data: GuestRequestedMessage) => {
    if (
      data.sessionReadingIndex < 1 ||
      data.sessionReadingIndex > GUEST_MAX_READINGS_PER_SEAT
    ) {
      return
    }
    gameData.currentGuestId = data.guestId
    gameData.currentGuestName = data.guestName
    gameData.gameState = 'OCUPADO'
    gameData.revelationRoundSalt = data.roundSalt
    gameData.pendingGuestCategory = null
    gameData.suggestedCategory = null
    gameData.rejectedCategoryThisTurn = null
    gameData.revelationPhase = 'ft_asks_topic'
    gameData.currentIteration = data.sessionReadingIndex as 1 | 2 | 3
    gameData.categoryRejectionLine = null
    gameData.guestReadingsUsedThisSeat = Math.max(
      gameData.guestReadingsUsedThisSeat,
      data.sessionReadingIndex
    )
    gameData.guestLastInteractionAtMs = Date.now()
    const localUserId = getPlayer()?.userId ?? null
    if (localUserId !== null && localUserId === data.guestId) {
      startRevealFortuneCinematic()
    }
  })

  fortuneMessageBus.on('guest-seat-update', (data: GuestSeatMessage) => {
    if (data.seatUserId !== previousGuestSeatUserId) {
      gameData.guestReadingsUsedThisSeat = 0
      gameData.previouslySelectedCategories = []
      gameData.currentIteration = 1
      gameData.categoryRejectionLine = null
      gameData.suggestedCategory = null
      gameData.rejectedCategoryThisTurn = null
    }
    previousGuestSeatUserId = data.seatUserId
    gameData.guestSeatUserId = data.seatUserId
    gameData.guestSeatUserName = data.seatUserName
    if (typeof data.centerBannerUntilMs === 'number') {
      gameData.centerBannerText = data.centerBannerText ?? null
      gameData.centerBannerUntilMs = data.centerBannerUntilMs
      gameData.centerBannerVariant = 'default'
    }
  })

  fortuneMessageBus.on('guest-reading-idle-kick', (data: GuestReadingIdleKickMessage) => {
    if (gameData.currentGuestId !== data.guestId) return
    stopOrbitCinematic()
    gameData.currentGuestId = null
    gameData.currentGuestName = null
    gameData.currentFortune = null
    gameData.gameState = 'LIBRE'
    gameData.revelationPhase = 'idle'
    gameData.pendingGuestCategory = null
    gameData.revelationRoundSalt = 0
    gameData.guestLastInteractionAtMs = null
    gameData.guestReadingsUsedThisSeat = 0
    gameData.previouslySelectedCategories = []
    gameData.currentIteration = 1
    gameData.categoryRejectionLine = null
    gameData.suggestedCategory = null
    gameData.rejectedCategoryThisTurn = null
    if (gameData.guestSeatUserId === data.guestId) {
      gameData.guestSeatUserId = null
      gameData.guestSeatUserName = null
      previousGuestSeatUserId = null
    }
  })

  fortuneMessageBus.on('hide-fortune', (_data: unknown) => {
    hideFortune3DTextImmediate()
    const localUserId = getPlayer()?.userId ?? null
    if (localUserId !== null && localUserId === gameData.currentGuestId) {
      stopOrbitCinematic()
    }
    gameData.currentGuestId = null
    gameData.currentGuestName = null
    gameData.currentFortune = null
    gameData.gameState = 'LIBRE'
    gameData.revelationPhase = 'idle'
    gameData.pendingGuestCategory = null
    gameData.revelationRoundSalt = 0
    gameData.guestLastInteractionAtMs = null
    gameData.categoryRejectionLine = null
    gameData.suggestedCategory = null
    gameData.rejectedCategoryThisTurn = null
  })

  fortuneMessageBus.on(
    'set-fortune-teller',
    (data: {
      fortuneTellerId: string | null
      fortuneTellerName?: string | null
      fortuneTellerSessionEndsAtMs?: number | null
      fortuneTellerReadingsDone?: number
      fortuneTellerMaxReadings?: number
      fortuneTellerReleaseAtMs?: number | null
      centerBannerText?: string | null
      centerBannerUntilMs?: number
    }) => {
      gameData.currentFortuneTellerId = data.fortuneTellerId
      gameData.currentFortuneTellerName =
        data.fortuneTellerId != null ? (data.fortuneTellerName ?? gameData.currentFortuneTellerName) : null
      if (data.fortuneTellerId == null) {
        gameData.fortuneTellerSessionEndsAtMs = null
        gameData.fortuneTellerReadingsDone = 0
        gameData.fortuneTellerMaxReadings = 3
        gameData.fortuneTellerReleaseAtMs = null
        gameData.fortuneTellerTimeRemainingSec = 0
      } else {
        gameData.fortuneTellerSessionEndsAtMs = data.fortuneTellerSessionEndsAtMs ?? gameData.fortuneTellerSessionEndsAtMs
        gameData.fortuneTellerReadingsDone = data.fortuneTellerReadingsDone ?? gameData.fortuneTellerReadingsDone
        gameData.fortuneTellerMaxReadings = data.fortuneTellerMaxReadings ?? gameData.fortuneTellerMaxReadings
        gameData.fortuneTellerReleaseAtMs = data.fortuneTellerReleaseAtMs ?? null
      }
      if (typeof data.centerBannerUntilMs === 'number') {
        gameData.centerBannerText = data.centerBannerText ?? null
        gameData.centerBannerUntilMs = data.centerBannerUntilMs
        gameData.centerBannerVariant = 'default'
      }
    }
  )

  fortuneMessageBus.on('fortune-teller-session-update', (data: FortuneTellerSessionUpdateMessage) => {
    if (gameData.currentFortuneTellerId !== data.fortuneTellerId) return
    gameData.fortuneTellerSessionEndsAtMs = data.fortuneTellerSessionEndsAtMs
    gameData.fortuneTellerReadingsDone = data.fortuneTellerReadingsDone
    gameData.fortuneTellerMaxReadings = data.fortuneTellerMaxReadings
    gameData.fortuneTellerReleaseAtMs = data.fortuneTellerReleaseAtMs
    if (typeof data.centerBannerUntilMs === 'number') {
      gameData.centerBannerUntilMs = data.centerBannerUntilMs
      gameData.centerBannerText = data.centerBannerText ?? null
      gameData.centerBannerVariant = 'default'
    }
  })
}
