import { fortuneMessageBus } from '../fortuneSync'
import type { FsmSession } from './types'
import { restoreSessionFromPayload } from './session'

let listenerRegistered = false

export function broadcastFsmSession(snapshot: FsmSession): void {
  fortuneMessageBus.emit('fortune-fsm-session', snapshot)
}

/** Call once after setupFortuneSync() so listeners exist before any emit. */
export function setupFortuneFsmSync(): void {
  if (listenerRegistered) return
  listenerRegistered = true
  fortuneMessageBus.on('fortune-fsm-session', (payload: FsmSession) => {
    restoreSessionFromPayload(payload)
  })
}
