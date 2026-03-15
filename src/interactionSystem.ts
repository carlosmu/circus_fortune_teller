import { engine } from '@dcl/sdk/ecs'
import { gameData } from './gameState'

let interactionSystemInitialized = false

export function setupInteractionSystem() {
  if (interactionSystemInitialized) return
  interactionSystemInitialized = true

  engine.addSystem((dt) => {
    // TODO:
    // - Detect player interaction with guest spot
    // - Si gameData.gameState === 'LIBRE':
    //   - Asignar currentGuestId
    //   - Cambiar a 'OCUPADO'
    //   - Move / lock guest at guestSpot position
  })
}

