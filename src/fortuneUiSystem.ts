import { engine } from '@dcl/sdk/ecs'
import { gameData } from './gameState'
import { fortuneMessageBus } from './fortuneSync'
import { FORTUNE_DISPLAY_DURATION } from './sceneConfig'

let uiSystemInitialized = false
let uiTimer = 0

export function setupFortuneUiSystem() {
  if (uiSystemInitialized) return
  uiSystemInitialized = true

  engine.addSystem((dt) => {
    if (gameData.gameState !== 'MOSTRANDO_FORTUNA') {
      uiTimer = 0
      return
    }

    // TODO:
    // - Mostrar panel de UI con la fortuna seleccionada
    //   Puedes acceder al texto y categoría así:
    //   const fortune = gameData.currentFortune
    // - Escuchar clic en "OK" para cerrar antes del timeout

    uiTimer += dt

    if (uiTimer >= FORTUNE_DISPLAY_DURATION) {
      uiTimer = 0

      // Cerrar la sesión y liberar al guest (local)
      gameData.currentGuestId = null
      gameData.currentGuestName = null
      gameData.currentFortune = null
      gameData.gameState = 'LIBRE'

      // Avisar a todos los jugadores para que oculten el panel
      fortuneMessageBus.emit('hide-fortune', {})

      // TODO: Desbloquear movimiento del player guest
    }
  })
}

