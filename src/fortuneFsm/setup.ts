import { engine } from '@dcl/sdk/ecs'
import { USE_FORTUNE_FSM_FLOW } from '../sceneConfig'
import { fsmTickContinueIfReady, fsmTickRevealIfReady, fsmTickVirtualHost } from './actions'

let setupDone = false

export function setupFortuneFsm(): void {
  if (!USE_FORTUNE_FSM_FLOW || setupDone) return
  setupDone = true

  engine.addSystem(() => {
    const t = Date.now()
    fsmTickVirtualHost(t)
    fsmTickRevealIfReady(t)
    fsmTickContinueIfReady(t)
  })
}
