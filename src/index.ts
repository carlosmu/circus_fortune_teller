import { setupInteractionSystem } from './interactionSystem'
import { setupHostSystem } from './hostSystem'
import { setupFortuneUiSystem } from './fortuneUiSystem'
import { setupFortuneSync } from './fortuneSync'
import { setupGuestSpot } from './setupGuestSpot'
import { setupUi } from './ui'
import { setupScene } from './scene'

export function main() {
  // Sincronización de fortuna entre todos los jugadores (MessageBus)
  setupFortuneSync()

  // Inicializar la UI base
  setupUi()

  // Inicializar escena (mesa, etc.)
  setupScene()

  // Inicializar sistemas del minijuego
  setupGuestSpot()
  setupInteractionSystem()
  setupHostSystem()
  setupFortuneUiSystem()
}


