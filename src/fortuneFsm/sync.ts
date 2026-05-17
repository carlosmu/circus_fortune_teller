import { fortuneMessageBus } from '../fortuneSync'
import type { FsmSession } from './types'
import { fsmSession, restoreSessionFromPayload } from './session'
import { fireStateEnter } from './machine'

let listenerRegistered = false

export function broadcastFsmSession(snapshot: FsmSession): void {
  fortuneMessageBus.emit('fortune-fsm-session', snapshot)
}

/** Call once after setupFortuneSync() so listeners exist before any emit. */
export function setupFortuneFsmSync(): void {
  if (listenerRegistered) return
  listenerRegistered = true
  fortuneMessageBus.on('fortune-fsm-session', (payload: FsmSession) => {
    const prevState = fsmSession.state
    restoreSessionFromPayload(payload)
    if (prevState !== fsmSession.state) {
      fireStateEnter(fsmSession.state)
    }
  })
}
