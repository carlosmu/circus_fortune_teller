import { engine } from '@dcl/sdk/ecs'
import { gameData } from './gameState'

let interactionSystemInitialized = false

export function setupInteractionSystem() {
  if (interactionSystemInitialized) return
  interactionSystemInitialized = true

  engine.addSystem((dt) => {
    // TODO:
    // - Detectar interacción del jugador con el spot de guest
    // - Si gameData.gameState === 'LIBRE':
    //   - Asignar currentGuestId
    //   - Cambiar a 'OCUPADO'
    //   - Mover / bloquear al guest en la posición del guestSpot
  })
}

