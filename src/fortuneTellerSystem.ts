import { executeTask } from '@dcl/sdk/ecs'
import { getPlayer } from '@dcl/sdk/players'
import { gameData } from './gameState'
import { FORTUNES } from './fortunes'
import { fortuneMessageBus, type RevelationPhaseUpdateMessage } from './fortuneSync'
import { pickKindSeeded, pickThreeGuestCategoriesSeeded } from './revelationRng'
import type { FortuneCategory, FortuneKind } from './types'

let fortuneTellerSystemInitialized = false
const FORTUNE_TELLER_READING_BONUS_MS = 30000
const FORTUNE_TELLER_MAX_SESSION_MS = 120000
const FORTUNE_TELLER_RELEASE_DELAY_AFTER_LAST_READING_MS = 6000
/** Pause before the virtual host opens theme choice (same order as a human FT). */
const VIRTUAL_HOST_ASK_TOPIC_MS = 2600
/** Pause before the virtual host picks warning / advice / prediction. */
const VIRTUAL_HOST_CHOOSES_KIND_MS = 2600

function delayMs(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
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
    fortuneMessageBus.emit('revelation-phase-update', {
      phase: 'guest_chooses_category',
      pendingGuestCategory: null
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
  gameData.revelationPhase = 'idle'

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

  fortuneMessageBus.emit('revelation-phase-update', {
    phase: 'guest_chooses_category',
    pendingGuestCategory: null
  })
}

export function guestSubmitChosenCategory(category: FortuneCategory): void {
  const localUserId = getPlayer()?.userId ?? null
  if (localUserId !== gameData.currentGuestId) return
  if (gameData.gameState !== 'OCUPADO' || gameData.revelationPhase !== 'guest_chooses_category') return

  const guestId = gameData.currentGuestId ?? ''
  const options = pickThreeGuestCategoriesSeeded(guestId, gameData.revelationRoundSalt)
  if (!options.includes(category)) return

  fortuneMessageBus.emit('revelation-phase-update', {
    phase: 'ft_chooses_kind',
    pendingGuestCategory: category
  })
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