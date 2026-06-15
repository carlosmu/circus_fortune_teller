import { writeFsmSession } from '../syncedState'
import type { FsmSession } from './types'

export function broadcastFsmSession(snapshot: FsmSession): void {
  writeFsmSession(snapshot)
}
