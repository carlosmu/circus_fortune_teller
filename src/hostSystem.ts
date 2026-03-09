import { engine } from '@dcl/sdk/ecs'
import { getPlayer } from '@dcl/sdk/players'
import { gameData } from './gameState'
import { FORTUNES } from './fortunes'
import { fortuneMessageBus } from './fortuneSync'
import type { FortuneCategory } from './types'

let hostSystemInitialized = false
let hostTimer = 0
const HOST_REVEAL_DELAY = 3 // segundos (solo cuando no hay host designado)

/**
 * Elige una fortuna al azar de la categoría y la revela a todos (solo debe llamar el host desde la UI).
 */
export function revealFortuneForCategory(category: FortuneCategory): void {
  const byCategory = FORTUNES.filter((f) => f.category === category)
  if (byCategory.length === 0) return
  const fortune = byCategory[Math.floor(Math.random() * byCategory.length)]

  gameData.currentFortune = fortune
  gameData.gameState = 'MOSTRANDO_FORTUNA'

  fortuneMessageBus.emit('show-fortune', {
    text: fortune.text,
    category: fortune.category,
    guestId: gameData.currentGuestId,
    guestName: gameData.currentGuestName ?? null
  })
}

export function setupHostSystem() {
  if (hostSystemInitialized) return
  hostSystemInitialized = true

  engine.addSystem((dt) => {
    if (gameData.gameState !== 'OCUPADO') {
      hostTimer = 0
      return
    }

    const localUserId = getPlayer()?.userId ?? null
    const isHost =
      gameData.currentHostId === null || gameData.currentHostId === localUserId
    if (!isHost) return

    // Si hay un host designado, no elegir automáticamente; el host elige categoría en la UI
    if (gameData.currentHostId !== null) return

    hostTimer += dt

    if (hostTimer >= HOST_REVEAL_DELAY) {
      hostTimer = 0

      const randomIndex = Math.floor(Math.random() * FORTUNES.length)
      const fortune = FORTUNES[randomIndex]

      gameData.currentFortune = fortune
      gameData.gameState = 'MOSTRANDO_FORTUNA'

      fortuneMessageBus.emit('show-fortune', {
        text: fortune.text,
        category: fortune.category,
        guestId: gameData.currentGuestId,
        guestName: gameData.currentGuestName ?? null
      })
    }
  })
}

