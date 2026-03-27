import { engine, AudioSource, Transform } from '@dcl/sdk/ecs'
import { MessageBus } from '@dcl/sdk/message-bus'
import { Vector3 } from '@dcl/sdk/math'
import { getPlayer } from '@dcl/sdk/players'
import { FORTUNES } from './fortunes'
import { gameData } from './gameState'
import { showFortune3DText } from './fortune3DText'
import { HOST_POSITION } from './scene'
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

export type HostSessionUpdateMessage = {
  hostId: string | null
  hostSessionEndsAtMs: number | null
  hostReadingsDone: number
  hostMaxReadings: number
  hostReleaseAtMs: number | null
  centerBannerText?: string | null
  centerBannerUntilMs?: number
}

const REVEAL_SOUND_FILENAME = 'Into_the_Depths.mp3'
const REVEAL_SOUND_PATH = 'assets/audio/' + encodeURIComponent(REVEAL_SOUND_FILENAME)

function playRevealSound() {
  const audioEntity = engine.addEntity()
  Transform.create(audioEntity, {
    position: Vector3.create(HOST_POSITION.x, HOST_POSITION.y + 1, HOST_POSITION.z)
  })
  AudioSource.create(audioEntity, {
    audioClipUrl: REVEAL_SOUND_PATH,
    playing: true,
    volume: 1
  })
  setTimeout(() => {
    engine.removeEntity(audioEntity)
  }, 8000)
}

/**
 * Registers listeners so all clients update gameData and show 3D text when someone reveals a fortune (same realm).
 */
export function setupFortuneSync() {
  fortuneMessageBus.on('guest-requested-fortune', (data: GuestRequestedMessage) => {
    gameData.currentGuestId = data.guestId
    gameData.currentGuestName = data.guestName
    gameData.gameState = 'OCUPADO'
    // Only the requesting guest should see this closeup.
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
    'set-host',
    (data: {
      hostId: string | null
      hostName?: string | null
      hostSessionEndsAtMs?: number | null
      hostReadingsDone?: number
      hostMaxReadings?: number
      hostReleaseAtMs?: number | null
    }) => {
      gameData.currentHostId = data.hostId
      gameData.currentHostName =
        data.hostId != null ? (data.hostName ?? gameData.currentHostName) : null
      if (data.hostId == null) {
        gameData.hostSessionEndsAtMs = null
        gameData.hostReadingsDone = 0
        gameData.hostMaxReadings = 3
        gameData.hostReleaseAtMs = null
        gameData.hostTimeRemainingSec = 0
      } else {
        gameData.hostSessionEndsAtMs = data.hostSessionEndsAtMs ?? gameData.hostSessionEndsAtMs
        gameData.hostReadingsDone = data.hostReadingsDone ?? gameData.hostReadingsDone
        gameData.hostMaxReadings = data.hostMaxReadings ?? gameData.hostMaxReadings
        gameData.hostReleaseAtMs = data.hostReleaseAtMs ?? null
      }
    }
  )

  fortuneMessageBus.on('host-session-update', (data: HostSessionUpdateMessage) => {
    if (gameData.currentHostId !== data.hostId) return
    gameData.hostSessionEndsAtMs = data.hostSessionEndsAtMs
    gameData.hostReadingsDone = data.hostReadingsDone
    gameData.hostMaxReadings = data.hostMaxReadings
    gameData.hostReleaseAtMs = data.hostReleaseAtMs
    if (typeof data.centerBannerUntilMs === 'number') {
      gameData.centerBannerUntilMs = data.centerBannerUntilMs
      gameData.centerBannerText = data.centerBannerText ?? null
    }
  })
}
