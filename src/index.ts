import { engine } from '@dcl/sdk/ecs'
import { getPlayer } from '@dcl/sdk/players'
import { setupFortuneSync } from './fortuneSync'
import { setupFortuneFsm } from './fortuneFsm/setup'
import { setupGuestSpot } from './setupGuestSpot'
import { setupWizard } from './setupWizard'
import { setupDeckCards } from './setupDeckCards'
import { setupDeckMeanings } from './setupDeckMeanings'
import { setupCards } from './setupCards'
import { setupUi } from './ui'
import { setupScene } from './scene'
import { setupPlayerRoleLabels } from './playerRoleLabels'
import { initSmokeParticles } from './smokeParticles'

export function main() {
  initSmokeParticles()

  // Fortune sync across players (MessageBus)
  setupFortuneSync()
  setupFortuneFsm()

  // Inicializar la UI base
  setupUi()

  // Inicializar escena (mesa, wizard, etc.)
  setupScene()

  setupGuestSpot()
  setupPlayerRoleLabels()
  setupWizard()
  setupDeckCards()
  setupDeckMeanings()
  setupCards()
}


