import { VisibilityComponent } from '@dcl/sdk/ecs'
import { MessageBus } from '@dcl/sdk/message-bus'
import { gameData } from './gameState'
import { showFortune3DText } from './fortune3DText'
import { WIZARD } from './scene'
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
