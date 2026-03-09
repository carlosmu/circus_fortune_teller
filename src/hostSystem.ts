import { engine } from '@dcl/sdk/ecs'
import { getPlayer } from '@dcl/sdk/players'
import { gameData } from './gameState'
import { FORTUNES } from './fortunes'
import { fortuneMessageBus } from './fortuneSync'

let hostSystemInitialized = false
let hostTimer = 0
const HOST_REVEAL_DELAY = 3 // segundos aprox.

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

    // Contar tiempo mientras el host "conjura"
    hostTimer += dt

    if (hostTimer >= HOST_REVEAL_DELAY) {
      hostTimer = 0

      // Elegir una fortuna aleatoria
      const randomIndex = Math.floor(Math.random() * FORTUNES.length)
      const fortune = FORTUNES[randomIndex]

      // Guardar la fortuna seleccionada para que la UI pueda mostrarla
      gameData.currentFortune = fortune
      gameData.gameState = 'MOSTRANDO_FORTUNA'

      // Sincronizar con todos (UI + texto 3D): quien reciba el mensaje muestra fortuna y texto
      fortuneMessageBus.emit('show-fortune', {
        text: fortune.text,
        category: fortune.category,
        guestId: gameData.currentGuestId,
        guestName: gameData.currentGuestName ?? null
      })

      // Debug: loguear la fortuna seleccionada
      console.log('Fortune seleccionada:', fortune.text, '-', fortune.category)

      // TODO: Disparar animación de "revelar" en el host
    }
  })
}

