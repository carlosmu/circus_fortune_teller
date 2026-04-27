import { engine, AudioSource, Transform } from '@dcl/sdk/ecs'
import { MessageBus } from '@dcl/sdk/message-bus'
import { Vector3 } from '@dcl/sdk/math'
import { getPlayer } from '@dcl/sdk/players'
import { FORTUNES } from './fortunes'
import { gameData } from './gameState'
import { hideFortune3DTextImmediate, showFortune3DText } from './fortune3DText'
import { FORTUNE_TELLER_POSITION } from './scene'
import { SHOW_3D_FORTUNE } from './sceneConfig'
import { startRevealFortuneCinematic, stopOrbitCinematic } from './cinematicCamera'
import type { FortuneCategory, RevelationPhase } from './types'

/** MessageBus to sync fortune state across all players in the scene */
export const fortuneMessageBus = new MessageBus()

/** Máximo de pedidos de lectura por sesión en la silla de invitado. */
export const GUEST_MAX_READINGS_PER_SEAT = 3
/** Sin interacción durante OCUPADO tras este tiempo → expulsión + teleport (solo cliente invitado mueve). */
export const GUEST_READING_IDLE_TIMEOUT_MS = 30000

let previousGuestSeatUserId: string | null = null

export function touchGuestReadingInteractionDeadline(): void {
  if (gameData.gameState === 'OCUPADO' && gameData.currentGuestId !== null) {
    gameData.guestLastInteractionAtMs = Date.now()
  }
}

/** Fortune index in FORTUNES instead of full text to stay under MessageBus size limit. */
export type ShowFortuneMessage = {
  fortuneIndex: number
  category: FortuneCategory
  guestId: string | null
  guestName: string | null
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

export type RevelationPhaseUpdateMessage = {
  phase: RevelationPhase
  pendingGuestCategory?: FortuneCategory | null
  suggestedCategory?: FortuneCategory | null
  rejectedCategoryThisTurn?: FortuneCategory | null
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

const REVEAL_SOUND_FILENAME = 'Into_the_Depths.mp3'
const REVEAL_SOUND_PATH = 'assets/audio/' + encodeURIComponent(REVEAL_SOUND_FILENAME)

const SOUND_CLEANUP_DELAY = 8

let pendingSoundCleanup: { entity: ReturnType<typeof engine.addEntity>; elapsed: number } | null = null

function playRevealSound() {
  if (pendingSoundCleanup) {
    engine.removeEntity(pendingSoundCleanup.entity)
    pendingSoundCleanup = null
  }
  const audioEntity = engine.addEntity()
  Transform.create(audioEntity, {
    position: Vector3.create(FORTUNE_TELLER_POSITION.x, FORTUNE_TELLER_POSITION.y + 1, FORTUNE_TELLER_POSITION.z)
  })
  AudioSource.create(audioEntity, {
    audioClipUrl: REVEAL_SOUND_PATH,
    playing: true,
    volume: 1
  })
  pendingSoundCleanup = { entity: audioEntity, elapsed: 0 }
}

function soundCleanupSystem(dt: number) {
  if (!pendingSoundCleanup) return
  pendingSoundCleanup.elapsed += dt
  if (pendingSoundCleanup.elapsed >= SOUND_CLEANUP_DELAY) {
    engine.removeEntity(pendingSoundCleanup.entity)
    pendingSoundCleanup = null
  }
}

/**
 * Registers listeners so all clients update gameData and show 3D text when someone reveals a fortune (same realm).
 */
export function setupFortuneSync() {
  engine.addSystem(soundCleanupSystem)
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

  fortuneMessageBus.on('revelation-phase-update', (data: RevelationPhaseUpdateMessage) => {
    if (data.phase === 'guest_learn_more' || data.phase === 'guest_farewell_max_readings') {
      if (gameData.gameState === 'MOSTRANDO_FORTUNA') {
        gameData.revelationPhase = data.phase
      }
      if (data.suggestedCategory !== undefined) gameData.suggestedCategory = data.suggestedCategory
      if (data.rejectedCategoryThisTurn !== undefined) {
        gameData.rejectedCategoryThisTurn = data.rejectedCategoryThisTurn
      }
      return
    }
    gameData.revelationPhase = data.phase
    if (data.pendingGuestCategory !== undefined) {
      gameData.pendingGuestCategory = data.pendingGuestCategory
      if (
        data.phase === 'ft_chooses_kind' &&
        data.pendingGuestCategory !== null &&
        !gameData.previouslySelectedCategories.includes(data.pendingGuestCategory)
      ) {
        gameData.previouslySelectedCategories = [
          ...gameData.previouslySelectedCategories,
          data.pendingGuestCategory
        ]
      }
    }
    if (data.suggestedCategory !== undefined) gameData.suggestedCategory = data.suggestedCategory
    if (data.rejectedCategoryThisTurn !== undefined) {
      gameData.rejectedCategoryThisTurn = data.rejectedCategoryThisTurn
    }
    touchGuestReadingInteractionDeadline()
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

  fortuneMessageBus.on('show-fortune', (data: ShowFortuneMessage) => {
    console.log(
      `[FortuneSync] show-fortune received guestId=${data.guestId ?? 'null'} category=${data.category}`
    )
    const fortune =
      data.fortuneIndex >= 0 && data.fortuneIndex < FORTUNES.length
        ? FORTUNES[data.fortuneIndex]
        : null
    if (fortune) {
      gameData.currentFortune = { text: fortune.text, category: fortune.category, deck: fortune.deck, type: fortune.type }
      gameData.currentGuestId = data.guestId
      gameData.currentGuestName = data.guestName
      gameData.gameState = 'MOSTRANDO_FORTUNA'
      gameData.revelationPhase = 'fortune_display'
      gameData.pendingGuestCategory = null
      gameData.suggestedCategory = null
      gameData.rejectedCategoryThisTurn = null
      gameData.guestLastInteractionAtMs = null
      playRevealSound()
      if (SHOW_3D_FORTUNE) {
        showFortune3DText({ text: fortune.text, category: fortune.category, deck: fortune.deck, type: fortune.type })
      }
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
        const revelPhase = gameData.revelationPhase
        gameData.fortuneTellerSessionEndsAtMs = null
        gameData.fortuneTellerReadingsDone = 0
        gameData.fortuneTellerMaxReadings = 3
        gameData.fortuneTellerReleaseAtMs = null
        gameData.fortuneTellerTimeRemainingSec = 0

        if (gameData.gameState === 'OCUPADO' && gameData.currentGuestId !== null) {
          if (revelPhase === 'ft_asks_topic') {
            gameData.pendingGuestCategory = null
            fortuneMessageBus.emit('revelation-fallback-auto', {})
          } else if (revelPhase === 'ft_chooses_kind' && gameData.pendingGuestCategory !== null) {
            fortuneMessageBus.emit('revelation-fallback-auto', {})
          }
        }
      } else {
        gameData.fortuneTellerSessionEndsAtMs = data.fortuneTellerSessionEndsAtMs ?? gameData.fortuneTellerSessionEndsAtMs
        gameData.fortuneTellerReadingsDone = data.fortuneTellerReadingsDone ?? gameData.fortuneTellerReadingsDone
        gameData.fortuneTellerMaxReadings = data.fortuneTellerMaxReadings ?? gameData.fortuneTellerMaxReadings
        gameData.fortuneTellerReleaseAtMs = data.fortuneTellerReleaseAtMs ?? null
      }
      if (typeof data.centerBannerUntilMs === 'number') {
        gameData.centerBannerText = data.centerBannerText ?? null
        gameData.centerBannerUntilMs = data.centerBannerUntilMs
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
    }
  })
}
