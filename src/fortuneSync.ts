import { engine, AudioSource, Transform } from '@dcl/sdk/ecs'
import { MessageBus } from '@dcl/sdk/message-bus'
import { Vector3 } from '@dcl/sdk/math'
import { getPlayer } from '@dcl/sdk/players'
import { FORTUNES } from './fortunes'
import { gameData } from './gameState'
import { showFortune3DText } from './fortune3DText'
import { FORTUNE_TELLER_POSITION } from './scene'
import { SHOW_3D_FORTUNE } from './sceneConfig'
import { startRevealFortuneCinematic } from './cinematicCamera'
import type { FortuneCategory, RevelationPhase } from './types'

/** MessageBus to sync fortune state across all players in the scene */
export const fortuneMessageBus = new MessageBus()

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
}

export type RevelationPhaseUpdateMessage = {
  phase: RevelationPhase
  pendingGuestCategory?: FortuneCategory | null
}

export type GuestSeatMessage = {
  seatUserId: string | null
  seatUserName: string | null
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
    gameData.currentGuestId = data.guestId
    gameData.currentGuestName = data.guestName
    gameData.gameState = 'OCUPADO'
    gameData.revelationRoundSalt = data.roundSalt
    gameData.pendingGuestCategory = null
    gameData.revelationPhase = 'ft_asks_topic'
    const localUserId = getPlayer()?.userId ?? null
    if (localUserId !== null && localUserId === data.guestId) {
      startRevealFortuneCinematic()
    }
  })

  fortuneMessageBus.on('revelation-phase-update', (data: RevelationPhaseUpdateMessage) => {
    gameData.revelationPhase = data.phase
    if (data.pendingGuestCategory !== undefined) {
      gameData.pendingGuestCategory = data.pendingGuestCategory
    }
  })

  fortuneMessageBus.on('guest-seat-update', (data: GuestSeatMessage) => {
    gameData.guestSeatUserId = data.seatUserId
    gameData.guestSeatUserName = data.seatUserName
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
      gameData.currentFortune = { text: fortune.text, category: fortune.category, type: fortune.type }
      gameData.currentGuestId = data.guestId
      gameData.currentGuestName = data.guestName
      gameData.gameState = 'MOSTRANDO_FORTUNA'
      gameData.revelationPhase = 'idle'
      gameData.pendingGuestCategory = null
      playRevealSound()
      if (SHOW_3D_FORTUNE) {
        showFortune3DText({ text: fortune.text, category: fortune.category, type: fortune.type })
      }
    }
  })

  fortuneMessageBus.on('hide-fortune', (_data: unknown) => {
    gameData.currentGuestId = null
    gameData.currentGuestName = null
    gameData.currentFortune = null
    gameData.gameState = 'LIBRE'
    gameData.revelationPhase = 'idle'
    gameData.pendingGuestCategory = null
    gameData.revelationRoundSalt = 0
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
