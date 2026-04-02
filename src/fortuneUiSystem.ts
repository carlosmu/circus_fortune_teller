import { engine } from '@dcl/sdk/ecs'
import { gameData } from './gameState'
import { fortuneMessageBus, GUEST_MAX_READINGS_PER_SEAT } from './fortuneSync'
import { FORTUNE_DISPLAY_DURATION, FORTUNE_FAREWELL_MAX_READINGS_DURATION } from './sceneConfig'

let uiSystemInitialized = false
let uiTimer = 0
let farewellTimer = 0

export function setupFortuneUiSystem() {
  if (uiSystemInitialized) return
  uiSystemInitialized = true

  engine.addSystem((dt) => {
    if (gameData.gameState !== 'MOSTRANDO_FORTUNA') {
      uiTimer = 0
      farewellTimer = 0
      return
    }

    if (gameData.revelationPhase === 'guest_farewell_max_readings') {
      uiTimer = 0
      farewellTimer += dt
      if (farewellTimer >= FORTUNE_FAREWELL_MAX_READINGS_DURATION) {
        farewellTimer = 0
        fortuneMessageBus.emit('hide-fortune', {})
      }
      return
    }

    farewellTimer = 0

    if (gameData.revelationPhase !== 'fortune_display') {
      return
    }

    uiTimer += dt

    if (uiTimer >= FORTUNE_DISPLAY_DURATION) {
      uiTimer = 0

      if (gameData.guestReadingsUsedThisSeat >= GUEST_MAX_READINGS_PER_SEAT) {
        fortuneMessageBus.emit('revelation-phase-update', { phase: 'guest_farewell_max_readings' })
        return
      }

      fortuneMessageBus.emit('revelation-phase-update', { phase: 'guest_learn_more' })
    }
  })
}

