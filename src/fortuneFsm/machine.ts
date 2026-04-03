import type { FsmSession, FsmState } from './types'
import { fsmSession } from './session'

export type TransitionResult = { ok: true; next: FsmState } | { ok: false; reason: string }

const EDGES: Record<FsmState, FsmState[]> = {
  INIT: ['CATEGORY_SELECTION'],
  CATEGORY_SELECTION: ['DECK_SELECTION'],
  DECK_SELECTION: ['CARD_SELECTION'],
  CARD_SELECTION: ['FORTUNE_SELECTION'],
  FORTUNE_SELECTION: ['REVEAL'],
  REVEAL: ['CONTINUE_DECISION'],
  CONTINUE_DECISION: ['CATEGORY_SELECTION', 'RESET'],
  RESET: []
}

export function canGoTo(next: FsmState): TransitionResult {
  if (!fsmSession.active && next !== 'RESET') {
    return { ok: false, reason: 'Session not active' }
  }
  const cur = fsmSession.state
  if (!EDGES[cur]!.includes(next)) {
    return { ok: false, reason: `Illegal ${cur} → ${next}` }
  }
  return { ok: true, next }
}

export function commitState(next: FsmState, extra?: Partial<FsmSession>): void {
  fsmSession.state = next
  if (extra) Object.assign(fsmSession, extra)
}

let lastFsmActionAt = 0

export function debounceOk(now: number, ms: number): boolean {
  if (now - lastFsmActionAt < ms) return false
  lastFsmActionAt = now
  return true
}

export function tryTransition(to: FsmState, extra?: Partial<FsmSession>): TransitionResult {
  const gate = canGoTo(to)
  if (!gate.ok) return gate
  commitState(to, extra)
  return { ok: true, next: to }
}
