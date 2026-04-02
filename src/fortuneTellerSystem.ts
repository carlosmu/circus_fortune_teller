import { executeTask } from '@dcl/sdk/ecs'
import { getPlayer } from '@dcl/sdk/players'
import { gameData } from './gameState'
import { FORTUNES } from './fortunes'
import { displaceGuestSeatOccupantToRandomArea } from './guestSeatDisplace'
import {
  fortuneMessageBus,
  GUEST_MAX_READINGS_PER_SEAT,
  type GuestChairDeclineMoreMessage,
  type RevelationPhaseUpdateMessage
} from './fortuneSync'
import { hashString, pickKindSeeded } from './revelationRng'
import type { FortuneCategory, FortuneKind } from './types'

let fortuneTellerSystemInitialized = false
const FORTUNE_TELLER_READING_BONUS_MS = 30000
const FORTUNE_TELLER_MAX_SESSION_MS = 120000
const FORTUNE_TELLER_RELEASE_DELAY_AFTER_LAST_READING_MS = 6000
/** Pause before the virtual host opens theme choice (same order as a human FT). */
const VIRTUAL_HOST_ASK_TOPIC_MS = 2600
/** Pause before the virtual host picks warning / advice / prediction. */
const VIRTUAL_HOST_CHOOSES_KIND_MS = 2600
const CATEGORY_REPEAT_RESPONSE_LINES = [
  'The cards refuse to speak of the same thread twice.',
  'That path has already been unveiled.'
]
const INTERACTION_CATEGORIES: FortuneCategory[] = ['luck', 'mystery', 'work', 'health', 'money', 'love']

function pickCategoryRepeatResponse(): string {
  const guestId = gameData.currentGuestId ?? ''
  const h = (guestId.length + gameData.revelationRoundSalt + gameData.currentIteration) >>> 0
  return CATEGORY_REPEAT_RESPONSE_LINES[h % CATEGORY_REPEAT_RESPONSE_LINES.length]!
}

function delayMs(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function pickThreeFromPoolDeterministic(seedPrefix: string, pool: FortuneCategory[]): FortuneCategory[] {
  const remaining = [...pool]
  const out: FortuneCategory[] = []
  for (let step = 0; step < 3 && remaining.length > 0; step++) {
    const idx = hashString(`${seedPrefix}:${step}`) % remaining.length
    out.push(remaining[idx]!)
    remaining.splice(idx, 1)
  }
  return out
}

function getFortuneTellerFirstStepOptions(): FortuneCategory[] {
  const available = INTERACTION_CATEGORIES.filter(
    (c) => !gameData.previouslySelectedCategories.includes(c)
  )
  const guestId = gameData.currentGuestId ?? ''
  return pickThreeFromPoolDeterministic(`${guestId}:${gameData.revelationRoundSalt}:ftFirst3`, available)
}

function getGuestFallbackOptionsAfterReject(): FortuneCategory[] {
  const available = INTERACTION_CATEGORIES.filter(
    (c) =>
      !gameData.previouslySelectedCategories.includes(c) &&
      (gameData.rejectedCategoryThisTurn === null || c !== gameData.rejectedCategoryThisTurn)
  )
  const guestId = gameData.currentGuestId ?? ''
  return pickThreeFromPoolDeterministic(`${guestId}:${gameData.revelationRoundSalt}:guestFallback3`, available)
}

function virtualHostInviteStillValid(): boolean {
  const localUserId = getPlayer()?.userId ?? null
  if (localUserId === null || localUserId !== gameData.currentGuestId) return false
  if (gameData.currentFortuneTellerId !== null) return false
  return gameData.gameState === 'OCUPADO' && gameData.revelationPhase === 'ft_asks_topic'
}

function virtualHostKindPickStillValid(): boolean {
  const localUserId = getPlayer()?.userId ?? null
  if (localUserId === null || localUserId !== gameData.currentGuestId) return false
  if (gameData.currentFortuneTellerId !== null) return false
  if (gameData.pendingGuestCategory === null) return false
  return gameData.gameState === 'OCUPADO' && gameData.revelationPhase === 'ft_chooses_kind'
}

/**
 * After the guest asks for a fortune with no human FT: wait, then sync "guest may choose theme"
 * (same step as when the FT clicks Continue).
 */
export function scheduleVirtualHostDelayThenOpenGuestCategories(): void {
  executeTask(async () => {
    await delayMs(0)
    if (!virtualHostInviteStillValid()) return
    await delayMs(VIRTUAL_HOST_ASK_TOPIC_MS)
    if (!virtualHostInviteStillValid()) return
    const suggested = getFortuneTellerFirstStepOptions()[0] ?? null
    if (suggested === null) {
      fortuneMessageBus.emit('revelation-phase-update', {
        phase: 'guest_chooses_category',
        pendingGuestCategory: null,
        suggestedCategory: null,
        rejectedCategoryThisTurn: null
      })
      return
    }
    fortuneMessageBus.emit('revelation-phase-update', {
      phase: 'guest_suggested_category_prompt',
      pendingGuestCategory: null,
      suggestedCategory: suggested,
      rejectedCategoryThisTurn: null
    })
  })
}

/**
 * After the guest chose a theme and there is no human FT: wait, then pick kind + reveal (deterministic).
 */
export function scheduleVirtualHostPickKindAndReveal(): void {
  executeTask(async () => {
    await delayMs(0)
    if (!virtualHostKindPickStillValid()) return
    const category = gameData.pendingGuestCategory
    if (category === null) return
    await delayMs(VIRTUAL_HOST_CHOOSES_KIND_MS)
    if (!virtualHostKindPickStillValid()) return
    if (gameData.pendingGuestCategory !== category) return
    const guestId = gameData.currentGuestId ?? ''
    const kind = pickKindSeeded(guestId, gameData.revelationRoundSalt)
    revealFortuneFromChoices(category, kind, { deterministic: true })
  })
}

/**
 * Reveals a fortune for category + kind (random among matches, or deterministic for auto mode).
 */
export function revealFortuneFromChoices(
  category: FortuneCategory,
  kind: FortuneKind,
  opts?: { deterministic?: boolean }
): void {
  if (
    gameData.currentFortuneTellerId !== null &&
    gameData.fortuneTellerReadingsDone >= gameData.fortuneTellerMaxReadings
  ) {
    console.log('[FortuneTellerSession] Readings locked: max reached')
    return
  }

  const pool = FORTUNES.filter((f) => f.category === category && f.type === kind)
  if (pool.length === 0) return

  let fortune = pool[0]
  if (opts?.deterministic) {
    const guestId = gameData.currentGuestId ?? ''
    const salt = gameData.revelationRoundSalt
    let h = 2166136261
    const seedStr = `${guestId}:${salt}:fortuneIdx`
    for (let i = 0; i < seedStr.length; i++) {
      h ^= seedStr.charCodeAt(i)
      h = Math.imul(h, 16777619)
    }
    fortune = pool[(h >>> 0) % pool.length]
  } else {
    fortune = pool[Math.floor(Math.random() * pool.length)]
  }

  gameData.currentFortune = fortune
  gameData.gameState = 'MOSTRANDO_FORTUNA'
  gameData.revelationPhase = 'fortune_display'

  if (gameData.currentFortuneTellerId !== null) {
    gameData.fortuneTellerReadingsDone += 1
    const now = Date.now()

    if (gameData.fortuneTellerReadingsDone <= 2) {
      const currentEnd = gameData.fortuneTellerSessionEndsAtMs ?? now
      const extendedEnd = currentEnd + FORTUNE_TELLER_READING_BONUS_MS
      const maxEnd = now + FORTUNE_TELLER_MAX_SESSION_MS
      gameData.fortuneTellerSessionEndsAtMs = Math.min(extendedEnd, maxEnd)
      if (gameData.fortuneTellerReadingsDone === 2) {
        const ftName = gameData.currentFortuneTellerName?.trim() || 'Fortune Teller'
        gameData.centerBannerText = `${ftName}, 1 reading left`
        gameData.centerBannerUntilMs = now + 2000
      }
    } else if (gameData.fortuneTellerReadingsDone >= 3) {
      gameData.fortuneTellerReleaseAtMs = now + FORTUNE_TELLER_RELEASE_DELAY_AFTER_LAST_READING_MS
    }

    fortuneMessageBus.emit('fortune-teller-session-update', {
      fortuneTellerId: gameData.currentFortuneTellerId,
      fortuneTellerSessionEndsAtMs: gameData.fortuneTellerSessionEndsAtMs,
      fortuneTellerReadingsDone: gameData.fortuneTellerReadingsDone,
      fortuneTellerMaxReadings: gameData.fortuneTellerMaxReadings,
      fortuneTellerReleaseAtMs: gameData.fortuneTellerReleaseAtMs,
      centerBannerText: gameData.centerBannerText,
      centerBannerUntilMs: gameData.centerBannerUntilMs
    })
  }

  const fortuneIndex = FORTUNES.indexOf(fortune)
  fortuneMessageBus.emit('show-fortune', {
    fortuneIndex: fortuneIndex >= 0 ? fortuneIndex : 0,
    category: fortune.category,
    guestId: gameData.currentGuestId,
    guestName: gameData.currentGuestName ?? null
  })
}

export function fortuneTellerInviteGuestToChooseTopic(): void {
  const localUserId = getPlayer()?.userId ?? null
  if (localUserId !== gameData.currentFortuneTellerId) return
  if (gameData.gameState !== 'OCUPADO' || gameData.revelationPhase !== 'ft_asks_topic') return

  const suggested = getFortuneTellerFirstStepOptions()[0] ?? null
  if (suggested === null) {
    fortuneMessageBus.emit('revelation-phase-update', {
      phase: 'guest_chooses_category',
      pendingGuestCategory: null,
      suggestedCategory: null,
      rejectedCategoryThisTurn: null
    })
    return
  }

  fortuneMessageBus.emit('revelation-phase-update', {
    phase: 'guest_suggested_category_prompt',
    pendingGuestCategory: null,
    suggestedCategory: suggested,
    rejectedCategoryThisTurn: null
  })
}

/** Primer paso humano: FT elige una de 3 categorías para preguntar al guest (Yes/No). */
export function fortuneTellerSuggestCategory(category: FortuneCategory): void {
  const localUserId = getPlayer()?.userId ?? null
  if (localUserId !== gameData.currentFortuneTellerId) return
  if (gameData.gameState !== 'OCUPADO' || gameData.revelationPhase !== 'ft_asks_topic') return
  const options = getFortuneTellerFirstStepOptions()
  if (!options.includes(category)) return

  fortuneMessageBus.emit('revelation-phase-update', {
    phase: 'guest_suggested_category_prompt',
    pendingGuestCategory: null,
    suggestedCategory: category,
    rejectedCategoryThisTurn: null
  })
}

export function guestAcceptSuggestedCategory(): void {
  const localUserId = getPlayer()?.userId ?? null
  if (localUserId !== gameData.currentGuestId) return
  if (gameData.gameState !== 'OCUPADO' || gameData.revelationPhase !== 'guest_suggested_category_prompt') return
  if (gameData.suggestedCategory === null) return

  fortuneMessageBus.emit('revelation-phase-update', {
    phase: 'ft_chooses_kind',
    pendingGuestCategory: gameData.suggestedCategory,
    rejectedCategoryThisTurn: null
  })
}

export function guestRejectSuggestedCategory(): void {
  const localUserId = getPlayer()?.userId ?? null
  if (localUserId !== gameData.currentGuestId) return
  if (gameData.gameState !== 'OCUPADO' || gameData.revelationPhase !== 'guest_suggested_category_prompt') return
  if (gameData.suggestedCategory === null) return

  fortuneMessageBus.emit('revelation-phase-update', {
    phase: 'guest_chooses_category',
    pendingGuestCategory: null,
    rejectedCategoryThisTurn: gameData.suggestedCategory
  })
}

export function guestSubmitChosenCategory(category: FortuneCategory): void {
  const localUserId = getPlayer()?.userId ?? null
  if (localUserId !== gameData.currentGuestId) return
  if (gameData.gameState !== 'OCUPADO' || gameData.revelationPhase !== 'guest_chooses_category') return

  const options = getGuestFallbackOptionsAfterReject()
  if (!options.includes(category)) return
  if (gameData.rejectedCategoryThisTurn !== null && category === gameData.rejectedCategoryThisTurn) return
  if (gameData.previouslySelectedCategories.includes(category)) {
    gameData.categoryRejectionLine = pickCategoryRepeatResponse()
    gameData.centerBannerText = gameData.categoryRejectionLine
    gameData.centerBannerUntilMs = Date.now() + 2200
    return
  }
  gameData.categoryRejectionLine = null

  fortuneMessageBus.emit('revelation-phase-update', {
    phase: 'ft_chooses_kind',
    pendingGuestCategory: category,
    rejectedCategoryThisTurn: null
  })
}

export function getFirstStepCategoryOptionsForUi(): FortuneCategory[] {
  return getFortuneTellerFirstStepOptions()
}

export function getGuestFallbackCategoryOptionsForUi(): FortuneCategory[] {
  return getGuestFallbackOptionsAfterReject()
}

/** Tras la fortuna: el invitado acepta otra lectura — mismo ciclo desde la pregunta del FT (índice de sesión +1). */
export function guestAcceptMoreFortune(): void {
  const localUserId = getPlayer()?.userId ?? null
  if (localUserId === null || localUserId !== gameData.currentGuestId) return
  if (gameData.gameState !== 'MOSTRANDO_FORTUNA' || gameData.revelationPhase !== 'guest_learn_more') return
  if (gameData.guestReadingsUsedThisSeat >= GUEST_MAX_READINGS_PER_SEAT) return

  const sessionReadingIndex = gameData.guestReadingsUsedThisSeat + 1
  const roundSalt = Date.now()
  fortuneMessageBus.emit('guest-requested-fortune', {
    guestId: localUserId,
    guestName: getPlayer()?.name ?? 'Visitor',
    roundSalt,
    sessionReadingIndex
  })
  scheduleVirtualHostDelayThenOpenGuestCategories()
}

/** No quiere más: cierra sesión y expulsa de la silla (teleport) en el cliente invitado. */
export function guestDeclineMoreFortune(): void {
  const localUserId = getPlayer()?.userId ?? null
  if (localUserId === null || localUserId !== gameData.currentGuestId) return
  if (gameData.gameState !== 'MOSTRANDO_FORTUNA' || gameData.revelationPhase !== 'guest_learn_more') return

  fortuneMessageBus.emit('hide-fortune', {})
  fortuneMessageBus.emit('guest-seat-update', {
    seatUserId: null,
    seatUserName: null
  })
  fortuneMessageBus.emit('guest-chair-decline-more', { guestId: localUserId } satisfies GuestChairDeclineMoreMessage)
  displaceGuestSeatOccupantToRandomArea()
}

export function fortuneTellerSubmitKind(kind: FortuneKind): void {
  const localUserId = getPlayer()?.userId ?? null
  if (localUserId !== gameData.currentFortuneTellerId) return
  if (gameData.gameState !== 'OCUPADO' || gameData.revelationPhase !== 'ft_chooses_kind') return

  const cat = gameData.pendingGuestCategory
  if (cat === null) return

  revealFortuneFromChoices(cat, kind)
}

export function setupFortuneTellerSystem() {
  if (fortuneTellerSystemInitialized) return
  fortuneTellerSystemInitialized = true

  fortuneMessageBus.on('revelation-phase-update', (data: RevelationPhaseUpdateMessage) => {
    if (data.phase !== 'ft_chooses_kind') return
    if (gameData.currentFortuneTellerId !== null) return
    scheduleVirtualHostPickKindAndReveal()
  })

  fortuneMessageBus.on('revelation-fallback-auto', () => {
    if (gameData.revelationPhase === 'ft_asks_topic') {
      scheduleVirtualHostDelayThenOpenGuestCategories()
    } else if (
      gameData.revelationPhase === 'ft_chooses_kind' &&
      gameData.pendingGuestCategory !== null
    ) {
      scheduleVirtualHostPickKindAndReveal()
    }
  })
}