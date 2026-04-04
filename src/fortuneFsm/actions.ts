import { executeTask } from '@dcl/sdk/ecs'
import { getPlayer } from '@dcl/sdk/players'
import type { FortuneCategory } from '../types'
import { FSM_DEBOUNCE_MS, type FsmCardChoice, type FsmDeck } from './types'
import { fsmSession, hardResetSession, sessionForSync } from './session'
import { debounceOk, tryTransition } from './machine'
import { broadcastFsmSession } from './sync'
import { fortuneMessageBus, touchGuestReadingInteractionDeadline } from '../fortuneSync'
import { FSM_CATEGORY_LABELS, getFsmCategoryOffer } from './categories'

function nowMs(): number {
  return Date.now()
}

function emit(): void {
  touchGuestReadingInteractionDeadline()
  broadcastFsmSession(sessionForSync())
}

function delayMs(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Host: INIT → CATEGORY_SELECTION */
export function hostOpenCategorySelection(): void {
  if (!debounceOk(nowMs(), FSM_DEBOUNCE_MS)) return
  const p = getPlayer()
  if (!p || p.userId !== fsmSession.hostId) return
  if (fsmSession.state !== 'INIT') return
  const r = tryTransition('CATEGORY_SELECTION')
  if (r.ok) emit()
}

/** Guest: elige una de las 3 categorías mostradas → DECK_SELECTION; queda excluida en la siguiente terna. */
export function guestPickCategory(category: FortuneCategory): void {
  if (!debounceOk(nowMs(), FSM_DEBOUNCE_MS)) return
  const p = getPlayer()
  if (!p || p.userId !== fsmSession.guestId) return
  if (fsmSession.state !== 'CATEGORY_SELECTION') return

  const offer = getFsmCategoryOffer(fsmSession.guestId, fsmSession.usedCategories)
  if (!offer.includes(category)) return

  const label = FSM_CATEGORY_LABELS[category]
  fsmSession.usedCategories = [...fsmSession.usedCategories, category]
  fsmSession.selectedCategory = label
  fsmSession.worldBanner = `Reading: ${label}`
  const r = tryTransition('DECK_SELECTION')
  if (r.ok) emit()
}

/** Host: deck → CARD_SELECTION */
export function hostPickDeck(deck: FsmDeck): void {
  if (!debounceOk(nowMs(), FSM_DEBOUNCE_MS)) return
  const p = getPlayer()
  if (!p || p.userId !== fsmSession.hostId) return
  if (fsmSession.state !== 'DECK_SELECTION') return
  fsmSession.selectedDeck = deck
  const r = tryTransition('CARD_SELECTION', { cardFlipIndex: null })
  if (r.ok) emit()
}

/** Guest: pick card A/B/C → FORTUNE_SELECTION */
export function guestPickCard(slot: FsmCardChoice, index: 0 | 1 | 2): void {
  if (!debounceOk(nowMs(), FSM_DEBOUNCE_MS)) return
  const p = getPlayer()
  if (!p || p.userId !== fsmSession.guestId) return
  if (fsmSession.state !== 'CARD_SELECTION') return
  fsmSession.selectedCardType = slot
  fsmSession.cardFlipIndex = index
  fsmSession.fortuneGuestHint = 'reading'
  fsmSession.hostFortunePickedAtMs = null
  fsmSession.selectedFortune = null
  const r = tryTransition('FORTUNE_SELECTION')
  if (r.ok) emit()
}

/** Host: fortune A/B/C — starts 2s timer to REVEAL */
export function hostPickFortune(choice: FsmCardChoice): void {
  if (!debounceOk(nowMs(), FSM_DEBOUNCE_MS)) return
  const p = getPlayer()
  if (!p || p.userId !== fsmSession.hostId) return
  if (fsmSession.state !== 'FORTUNE_SELECTION') return
  fsmSession.selectedFortune = choice
  fsmSession.hostFortunePickedAtMs = nowMs()
  fsmSession.fortuneGuestHint = 'reading'
  emit()
}

/** Called from engine when 2s elapsed after host fortune pick. */
export function fsmTickRevealIfReady(t: number): void {
  if (!fsmSession.active || fsmSession.state !== 'FORTUNE_SELECTION') return
  if (fsmSession.selectedFortune === null || fsmSession.hostFortunePickedAtMs === null) return
  const dt = t - fsmSession.hostFortunePickedAtMs
  if (dt >= 2000 && fsmSession.fortuneGuestHint === 'reading') {
    fsmSession.fortuneGuestHint = 'clear'
    emit()
    return
  }
  if (dt >= 2800 && fsmSession.fortuneGuestHint === 'clear') {
    const r = tryTransition('REVEAL', {
      revealEnteredAtMs: nowMs(),
      fortuneGuestHint: 'idle'
    })
    if (r.ok) emit()
  }
}

/** After REVEAL dwell → CONTINUE_DECISION */
export function fsmTickContinueIfReady(t: number): void {
  if (!fsmSession.active || fsmSession.state !== 'REVEAL') return
  if (fsmSession.revealEnteredAtMs === null) return
  if (t - fsmSession.revealEnteredAtMs < 3500) return
  const r = tryTransition('CONTINUE_DECISION')
  if (r.ok) emit()
}

/** Guest: another reading */
export function guestContinueYes(): void {
  if (!debounceOk(nowMs(), FSM_DEBOUNCE_MS)) return
  const p = getPlayer()
  if (!p || p.userId !== fsmSession.guestId) return
  if (fsmSession.state !== 'CONTINUE_DECISION') return
  fsmSession.selectedCategory = null
  fsmSession.selectedDeck = null
  fsmSession.selectedCardType = null
  fsmSession.selectedFortune = null
  fsmSession.worldBanner = null
  fsmSession.cardFlipIndex = null
  fsmSession.hostFortunePickedAtMs = null
  fsmSession.revealEnteredAtMs = null
  fsmSession.fortuneGuestHint = 'idle'
  fsmSession.sessionFinishedMessage = null
  const r = tryTransition('CATEGORY_SELECTION')
  if (r.ok) emit()
}

/** Guest: done → RESET (release via MessageBus + bridge) */
export function guestContinueNo(): void {
  if (!debounceOk(nowMs(), FSM_DEBOUNCE_MS)) return
  const p = getPlayer()
  if (!p || p.userId !== fsmSession.guestId) return
  if (fsmSession.state !== 'CONTINUE_DECISION') return
  const gid = fsmSession.guestId
  fsmSession.worldBanner = null
  fsmSession.sessionFinishedMessage = 'Your reading is finished'
  const r = tryTransition('RESET')
  if (!r.ok) return
  fsmSession.active = false
  emit()
  fortuneMessageBus.emit('hide-fortune', {})
  if (gid) fortuneMessageBus.emit('guest-chair-decline-more', { guestId: gid })
  executeTask(async () => {
    await delayMs(4500)
    hardResetSession()
    broadcastFsmSession(sessionForSync())
  })
}

/** Activate session at INIT (bridge). */
export function fsmActivateSession(hostId: string, guestId: string, guestName: string | null): void {
  Object.assign(fsmSession, {
    active: true,
    hostId,
    guestId,
    guestName,
    state: 'INIT' as const,
    selectedCategory: null,
    selectedDeck: null,
    selectedCardType: null,
    selectedFortune: null,
    worldBanner: null,
    fortuneGuestHint: 'idle' as const,
    hostFortunePickedAtMs: null,
    revealEnteredAtMs: null,
    usedCategories: [],
    cardFlipIndex: null,
    sessionFinishedMessage: null
  })
  emit()
}

export function fsmDeactivateSession(): void {
  hardResetSession()
  emit()
}
