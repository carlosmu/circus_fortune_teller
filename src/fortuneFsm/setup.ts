import { engine } from '@dcl/sdk/ecs'
import { gameData } from '../gameState'
import { USE_FORTUNE_FSM_FLOW } from '../sceneConfig'
import { fortuneMessageBus } from '../fortuneSync'
import {
  fsmActivateSession,
  fsmDeactivateSession,
  fsmTickContinueIfReady,
  fsmTickRevealIfReady,
  fsmTickVirtualHost
} from './actions'
import { fsmSession } from './session'
import { setupFortuneFsmSync } from './sync'

let setupDone = false

export function setupFortuneFsm(): void {
  if (!USE_FORTUNE_FSM_FLOW || setupDone) return
  setupDone = true

  setupFortuneFsmSync()

  fortuneMessageBus.on('guest-requested-fortune', (data) => {
    const hostId = gameData.currentFortuneTellerId
    if (fsmSession.active && fsmSession.guestId === data.guestId) return
    fsmActivateSession(hostId, data.guestId, data.guestName ?? null)
  })

  fortuneMessageBus.on('hide-fortune', () => {
    if (!fsmSession.active) return
    fsmDeactivateSession()
  })

  fortuneMessageBus.on('guest-reading-idle-kick', (payload: { guestId: string }) => {
    if (!fsmSession.active) return
    if (fsmSession.guestId !== payload.guestId) return
    fsmDeactivateSession()
  })

  engine.addSystem(() => {
    const t = Date.now()
    fsmTickVirtualHost(t)
    fsmTickRevealIfReady(t)
    fsmTickContinueIfReady(t)
  })
}
