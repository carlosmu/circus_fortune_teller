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
import type { FortuneCategory } from './types'

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
    const localUserId = getPlayer()?.userId ?? null
    if (localUserId !== null && localUserId === data.guestId) {
      startRevealFortuneCinematic()
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
      gameData.currentFortune = { text: fortune.text, category: fortune.category }
      gameData.currentGuestId = data.guestId
      gameData.currentGuestName = data.guestName
      gameData.gameState = 'MOSTRANDO_FORTUNA'
      playRevealSound()
      if (SHOW_3D_FORTUNE) {
        showFortune3DText({ text: fortune.text, category: fortune.category })
      }
    }
  })

  fortuneMessageBus.on('hide-fortune', (_data: unknown) => {
    gameData.currentGuestId = null
    gameData.currentGuestName = null
    gameData.currentFortune = null
    gameData.gameState = 'LIBRE'
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
