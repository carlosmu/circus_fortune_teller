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

    uiTimer += dt

    if (uiTimer >= FORTUNE_DISPLAY_DURATION) {
      uiTimer = 0

      // Close session and release guest (local)
      gameData.currentGuestId = null
      gameData.currentGuestName = null
      gameData.currentFortune = null
      gameData.gameState = 'LIBRE'
      gameData.revelationPhase = 'idle'
      gameData.pendingGuestCategory = null
      gameData.revelationRoundSalt = 0

      fortuneMessageBus.emit('hide-fortune', {})
    }
  })
}

