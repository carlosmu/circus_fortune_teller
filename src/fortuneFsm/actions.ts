import { executeTask } from '@dcl/sdk/ecs'
import { getPlayer } from '@dcl/sdk/players'
import type { FortuneCategory } from '../types'
import { gameData } from '../gameState'
import {
  FORTUNE_DISPLAY_DURATION,
  FSM_REVEAL_READING_PHASE_MS,
  FSM_REVEAL_SHOW_AT_MS
} from '../sceneConfig'
import { hashString, pickGuestMaxReadingsFarewellLine } from '../revelationRng'
import { getFsmRevealFortuneText } from './resolveRevealFortune'
import { FSM_DEBOUNCE_MS, type FsmCardChoice, type FsmDeck } from './types'
import { fsmSession, hardResetSession, sessionForSync } from './session'
import { debounceOk, tryTransition } from './machine'
import { broadcastFsmSession } from './sync'
import { GUEST_MAX_READINGS_PER_SEAT, touchGuestReadingInteractionDeadline } from '../fortuneSync'
import { patchSharedGameState } from '../syncedState'
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

const REVEAL_TO_CONTINUE_MS = FORTUNE_DISPLAY_DURATION * 1000

function isFsmHostClient(): boolean {
  const localUserId = getPlayer()?.userId ?? null
  return fsmSession.isVirtualHost || (localUserId !== null && localUserId === fsmSession.hostId)
}

function emitFsmSessionEnded(message: string): void {
  const gid = fsmSession.guestId
  fsmSession.sessionFinishedMessage = message
  fsmSession.sessionFinishedExpiresAtMs = nowMs() + 4500
  const r = tryTransition('RESET')
  if (!r.ok) return
  fsmSession.active = false
  emit()
  const guestBannerName = gid ? ((fsmSession.guestName ?? 'Someone').trim() || 'Someone') : null
  const bannerUntil = nowMs() + 2200
  patchSharedGameState({
    gameState: 'LIBRE',
    currentGuestId: null,
    currentGuestName: null,
    ...(gid ? { guestSeatUserId: null, guestSeatUserName: null } : {}),
    centerBannerText: guestBannerName ? `${guestBannerName} is no longer the Guest` : null,
    centerBannerUntilMs: bannerUntil,
    sessionEndReason: 'guest_declined',
  })
  executeTask(async () => {
    await delayMs(4500)
    hardResetSession()
    broadcastFsmSession(sessionForSync())
  })
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
  fsmSession.selectedCategoryKey = category
  const r = tryTransition('DECK_SELECTION')
  if (r.ok) {
    if (fsmSession.isVirtualHost) fsmSession.virtualHostPendingAtMs = nowMs()
    emit()
  }
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
  fsmSession.revealFortuneText = null
  const r = tryTransition('FORTUNE_SELECTION')
  if (r.ok) {
    if (fsmSession.isVirtualHost) fsmSession.virtualHostPendingAtMs = nowMs()
    emit()
  }
}

/** Host: fortune A/B/C — temporizador breve (sceneConfig) hasta REVEAL */
export function hostPickFortune(choice: FsmCardChoice): void {
  if (!debounceOk(nowMs(), FSM_DEBOUNCE_MS)) return
  const p = getPlayer()
  if (!p || p.userId !== fsmSession.hostId) return
  if (fsmSession.state !== 'FORTUNE_SELECTION') return
  fsmSession.selectedFortune = choice
  fsmSession.hostFortunePickedAtMs = nowMs()
  fsmSession.fortuneGuestHint = 'reading'
  fsmSession.revealFortuneText = null
  emit()
}

/** Called from engine: fases de hint invitado y transición a REVEAL (ver sceneConfig). Solo el host emite. */
export function fsmTickRevealIfReady(t: number): void {
  if (!fsmSession.active || fsmSession.state !== 'FORTUNE_SELECTION') return
  if (fsmSession.selectedFortune === null || fsmSession.hostFortunePickedAtMs === null) return
  if (!isFsmHostClient()) return
  const dt = t - fsmSession.hostFortunePickedAtMs
  if (dt >= FSM_REVEAL_READING_PHASE_MS && fsmSession.fortuneGuestHint === 'reading') {
    fsmSession.fortuneGuestHint = 'clear'
    emit()
    return
  }
  if (dt >= FSM_REVEAL_SHOW_AT_MS && fsmSession.fortuneGuestHint === 'clear') {
    const r = tryTransition('REVEAL', {
      revealEnteredAtMs: nowMs(),
      fortuneGuestHint: 'idle',
      revealFortuneText: getFsmRevealFortuneText(fsmSession)
    })
    if (r.ok) emit()
  }
}

/** After REVEAL dwell → CONTINUE_DECISION (o cierre si ya no quedan lecturas). */
export function fsmTickContinueIfReady(t: number): void {
  if (!fsmSession.active || fsmSession.state !== 'REVEAL') return
  if (fsmSession.revealEnteredAtMs === null) return
  if (t - fsmSession.revealEnteredAtMs < REVEAL_TO_CONTINUE_MS) return
  if (!isFsmHostClient()) return

  gameData.fortuneTellerReadingsDone = Math.min(
    gameData.fortuneTellerMaxReadings,
    gameData.fortuneTellerReadingsDone + 1
  )
  if (gameData.fortuneTellerReadingsDone >= gameData.fortuneTellerMaxReadings) {
    gameData.fortuneTellerReleaseAtMs = nowMs() + 5500
  }
  patchSharedGameState({
    fortuneTellerSessionEndsAtMs: gameData.fortuneTellerSessionEndsAtMs,
    fortuneTellerReadingsDone: gameData.fortuneTellerReadingsDone,
    fortuneTellerMaxReadings: gameData.fortuneTellerMaxReadings,
    fortuneTellerReleaseAtMs: gameData.fortuneTellerReleaseAtMs,
  })

  if (gameData.guestReadingsUsedThisSeat >= GUEST_MAX_READINGS_PER_SEAT) {
    emitFsmSessionEnded(
      pickGuestMaxReadingsFarewellLine(fsmSession.guestId ?? '', gameData.revelationRoundSalt)
    )
    return
  }
  const r = tryTransition('CONTINUE_DECISION')
  if (r.ok) emit()
}

const VIRTUAL_HOST_INIT_MS = 2000
const VIRTUAL_HOST_DECK_MS = 3000
const VIRTUAL_HOST_FORTUNE_MS = 1800

/** Auto-pick host decisions when no human fortune teller. */
export function fsmTickVirtualHost(t: number): void {
  if (!fsmSession.active || !fsmSession.isVirtualHost) return
  if (fsmSession.virtualHostPendingAtMs === null) return
  const dt = t - fsmSession.virtualHostPendingAtMs

  if (fsmSession.state === 'INIT' && dt >= VIRTUAL_HOST_INIT_MS) {
    fsmSession.virtualHostPendingAtMs = null
    const r = tryTransition('CATEGORY_SELECTION')
    if (r.ok) emit()
    return
  }

  if (fsmSession.state === 'DECK_SELECTION' && dt >= VIRTUAL_HOST_DECK_MS) {
    fsmSession.virtualHostPendingAtMs = null
    const decks: FsmDeck[] = ['Funny', 'Serious', 'Strange']
    const seed = `${fsmSession.guestId ?? ''}:${gameData.revelationRoundSalt}:vhDeck`
    const deck = decks[hashString(seed) % decks.length]!
    fsmSession.selectedDeck = deck
    const r = tryTransition('CARD_SELECTION', { cardFlipIndex: null })
    if (r.ok) emit()
    return
  }

  if (fsmSession.state === 'FORTUNE_SELECTION' && dt >= VIRTUAL_HOST_FORTUNE_MS) {
    fsmSession.virtualHostPendingAtMs = null
    const choices: FsmCardChoice[] = ['A', 'B', 'C']
    const seed = `${fsmSession.guestId ?? ''}:${gameData.revelationRoundSalt}:vhFortune`
    const choice = choices[hashString(seed) % choices.length]!
    fsmSession.selectedFortune = choice
    fsmSession.hostFortunePickedAtMs = nowMs()
    fsmSession.fortuneGuestHint = 'reading'
    emit()
    return
  }
}

/** Guest: another reading */
export function guestContinueYes(): void {
  if (!debounceOk(nowMs(), FSM_DEBOUNCE_MS)) return
  const p = getPlayer()
  if (!p || p.userId !== fsmSession.guestId) return
  if (fsmSession.state !== 'CONTINUE_DECISION') return

  const TIME_EXTENSION_MS = 30000
  const now = nowMs()
  if (gameData.fortuneTellerSessionEndsAtMs !== null) {
    gameData.fortuneTellerSessionEndsAtMs += TIME_EXTENSION_MS
  }
  gameData.guestLastInteractionAtMs = now

  fsmSession.selectedCategory = null
  fsmSession.selectedDeck = null
  fsmSession.selectedCardType = null
  fsmSession.selectedFortune = null
  fsmSession.cardFlipIndex = null
  fsmSession.hostFortunePickedAtMs = null
  fsmSession.revealEnteredAtMs = null
  fsmSession.revealFortuneText = null
  fsmSession.fortuneGuestHint = 'idle'
  fsmSession.sessionFinishedMessage = null
  fsmSession.sessionFinishedExpiresAtMs = null
  fsmSession.virtualHostPendingAtMs = null
  const r = tryTransition('CATEGORY_SELECTION')
  if (!r.ok) return
  const nextReading = gameData.guestReadingsUsedThisSeat + 1
  if (nextReading <= GUEST_MAX_READINGS_PER_SEAT && fsmSession.guestId !== null) {
    const roundSalt = nowMs()
    patchSharedGameState({
      revelationRoundSalt: roundSalt,
      currentIteration: nextReading,
      guestReadingsUsedThisSeat: nextReading,
      fortuneTellerSessionEndsAtMs: gameData.fortuneTellerSessionEndsAtMs,
    })
  }
  emit()
}

/** Guest: done → RESET */
export function guestContinueNo(): void {
  if (!debounceOk(nowMs(), FSM_DEBOUNCE_MS)) return
  const p = getPlayer()
  if (!p || p.userId !== fsmSession.guestId) return
  if (fsmSession.state !== 'CONTINUE_DECISION') return
  emitFsmSessionEnded('Your reading is finished')
}

/** Activate session at INIT (bridge). Accepts null hostId for virtual-host mode. */
export function fsmActivateSession(hostId: string | null, guestId: string, guestName: string | null): void {
  Object.assign(fsmSession, {
    active: true,
    hostId,
    guestId,
    guestName,
    state: 'INIT' as const,
    selectedCategory: null,
    selectedCategoryKey: null,
    selectedDeck: null,
    selectedCardType: null,
    selectedFortune: null,
    fortuneGuestHint: 'idle' as const,
    hostFortunePickedAtMs: null,
    revealEnteredAtMs: null,
    revealFortuneText: null,
    usedCategories: [],
    cardFlipIndex: null,
    sessionFinishedMessage: null,
    sessionFinishedExpiresAtMs: null,
    isVirtualHost: hostId === null,
    virtualHostPendingAtMs: hostId === null ? nowMs() : null
  })
  emit()
}

export function fsmDeactivateSession(): void {
  hardResetSession()
  emit()
}
