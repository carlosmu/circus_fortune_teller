import type { FsmSession, FsmState } from './types'
import { clearRevealFortuneMemo } from './resolveRevealFortune'

export function createInitialSession(): FsmSession {
  return {
    active: false,
    hostId: null,
    guestId: null,
    guestName: null,
    state: 'RESET',
    selectedCategory: null,
    selectedCategoryKey: null,
    selectedDeck: null,
    selectedCardType: null,
    selectedFortune: null,
    fortuneGuestHint: 'idle',
    hostFortunePickedAtMs: null,
    revealEnteredAtMs: null,
    revealFortuneText: null,
    usedCategories: [],
    cardFlipIndex: null,
    sessionFinishedMessage: null,
    sessionFinishedExpiresAtMs: null,
    isVirtualHost: false,
    virtualHostPendingAtMs: null
  }
}

/** Authoritative session (each client mirrors via sync). */
export const fsmSession: FsmSession = createInitialSession()

export function applySessionPatch(patch: Partial<FsmSession>): void {
  Object.assign(fsmSession, patch)
}

export function replaceSession(next: FsmSession): void {
  Object.assign(fsmSession, createInitialSession(), next)
}

export function hardResetSession(): void {
  replaceSession(createInitialSession())
}

export function sessionForSync(): FsmSession {
  return { ...fsmSession }
}

export function restoreSessionFromPayload(s: FsmSession): void {
  replaceSession(s)
  clearRevealFortuneMemo()
}

export function assertState(expected: FsmState): boolean {
  return fsmSession.active && fsmSession.state === expected
}
