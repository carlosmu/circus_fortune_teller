import { engine, AudioSource, Transform, VisibilityComponent } from '@dcl/sdk/ecs'
import { MessageBus } from '@dcl/sdk/message-bus'
import { Vector3 } from '@dcl/sdk/math'
import { gameData } from './gameState'
import { showFortune3DText } from './fortune3DText'
import { HOST_POSITION, WIZARD } from './scene'
import { SHOW_3D_FORTUNE } from './sceneConfig'
import type { FortuneCategory } from './types'

/** MessageBus para sincronizar el estado de la fortuna entre todos los jugadores en la escena */
export const fortuneMessageBus = new MessageBus()

export type ShowFortuneMessage = {
  text: string
  category: FortuneCategory
  guestId: string | null
  guestName: string | null
}

export type GuestRequestedMessage = {
  guestId: string
  guestName: string
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
    if (engine.entityExists(audioEntity)) {
      engine.removeEntity(audioEntity)
    }
  }, 8000)
}

/**
 * Registra los listeners para que todos los clientes actualicen su gameData
 * y muestren el texto 3D cuando alguien revela la fortuna (mismo realm).
 */
export function setupFortuneSync() {
  fortuneMessageBus.on('guest-requested-fortune', (data: GuestRequestedMessage) => {
    gameData.currentGuestId = data.guestId
    gameData.currentGuestName = data.guestName
    gameData.gameState = 'OCUPADO'
  })

  fortuneMessageBus.on('show-fortune', (data: ShowFortuneMessage) => {
    gameData.currentFortune = { text: data.text, category: data.category }
    gameData.currentGuestId = data.guestId
    gameData.currentGuestName = data.guestName
    gameData.gameState = 'MOSTRANDO_FORTUNA'
    playRevealSound()
    if (SHOW_3D_FORTUNE) {
      showFortune3DText({ text: data.text, category: data.category })
    }
  })

  fortuneMessageBus.on('hide-fortune', (_data: unknown) => {
    gameData.currentGuestId = null
    gameData.currentGuestName = null
    gameData.currentFortune = null
    gameData.gameState = 'LIBRE'
  })

  fortuneMessageBus.on('set-host', (data: { hostId: string | null }) => {
    gameData.currentHostId = data.hostId
    if (VisibilityComponent.has(WIZARD)) {
      VisibilityComponent.getMutable(WIZARD).visible = data.hostId === null
    } else {
      VisibilityComponent.create(WIZARD, { visible: data.hostId === null })
    }
  })
}
