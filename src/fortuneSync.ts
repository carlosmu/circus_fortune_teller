import { MessageBus } from '@dcl/sdk/message-bus'
import { gameData } from './gameState'
import { showFortune3DText } from './fortune3DText'
import type { FortuneCategory } from './types'

/** MessageBus para sincronizar el estado de la fortuna entre todos los jugadores en la escena */
export const fortuneMessageBus = new MessageBus()

export type ShowFortuneMessage = {
  text: string
  category: FortuneCategory
  guestId: string | null
}

/**
 * Registra los listeners para que todos los clientes actualicen su gameData
 * y muestren el texto 3D cuando alguien revela la fortuna (mismo realm).
 */
export function setupFortuneSync() {
  fortuneMessageBus.on('show-fortune', (data: ShowFortuneMessage) => {
    gameData.currentFortune = { text: data.text, category: data.category }
    gameData.currentGuestId = data.guestId
    gameData.gameState = 'MOSTRANDO_FORTUNA'
    // Texto 3D sobre el mago en todos los clientes (quien revela y el resto en el mismo realm)
    showFortune3DText({ text: data.text, category: data.category })
  })

  fortuneMessageBus.on('hide-fortune', () => {
    gameData.currentGuestId = null
    gameData.currentFortune = null
    gameData.gameState = 'LIBRE'
  })
}
