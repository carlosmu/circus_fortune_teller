import { engine } from '@dcl/sdk/ecs'
import { getPlayer } from '@dcl/sdk/players'
import { setupInteractionSystem } from './interactionSystem'
import { setupHostSystem } from './hostSystem'
import { setupFortuneUiSystem } from './fortuneUiSystem'
import { setupFortuneSync } from './fortuneSync'
import { setupGuestSpot } from './setupGuestSpot'
import { setupWizard } from './setupWizard'
import { setupUi } from './ui'
import { setupScene } from './scene'
import { registerVisit } from './supabase_api'

let visitRegistered = false

export function main() {
  // Registrar visita cuando el jugador esté disponible (puede no estarlo en el primer frame)
  engine.addSystem(() => {
    if (visitRegistered) return
    const player = getPlayer()
    const wallet = player?.userId
    if (wallet) {
      visitRegistered = true
      console.log('Player wallet:', wallet)
      registerVisit(wallet)
    }
  })

  // Sincronización de fortuna entre todos los jugadores (MessageBus)
  setupFortuneSync()

  // Inicializar la UI base
  setupUi()

  // Inicializar escena (mesa, wizard, etc.)
  setupScene()

  // Inicializar sistemas del minijuego
  setupGuestSpot()
  setupWizard()
  setupInteractionSystem()
  setupHostSystem()
  setupFortuneUiSystem()
}


