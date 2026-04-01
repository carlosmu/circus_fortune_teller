import { engine } from '@dcl/sdk/ecs'
import { getPlayer } from '@dcl/sdk/players'
import { gameData } from './gameState'
import { FORTUNES } from './fortunes'
import { fortuneMessageBus } from './fortuneSync'
import type { FortuneCategory } from './types'

let fortuneTellerSystemInitialized = false
let fortuneTellerTimer = 0
let lastAutoCategory: FortuneCategory | null = null
const FORTUNE_TELLER_REVEAL_DELAY = 3
const FORTUNE_TELLER_READING_BONUS_MS = 15000
const FORTUNE_TELLER_MAX_SESSION_MS = 60000
const FORTUNE_TELLER_RELEASE_DELAY_AFTER_LAST_READING_MS = 3000

/**
 * Picks a random fortune for the category and reveals it to everyone (fortune teller only, from UI).
 */
export function revealFortuneForCategory(category: FortuneCategory): void {
  if (gameData.currentFortuneTellerId !== null && gameData.fortuneTellerReadingsDone >= gameData.fortuneTellerMaxReadings) {
    console.log('[FortuneTellerSession] Readings locked: max reached')
    return
  }

  const byCategory = FORTUNES.filter((f) => f.category === category)
  if (byCategory.length === 0) return
  const fortune = byCategory[Math.floor(Math.random() * byCategory.length)]

  gameData.currentFortune = fortune
  gameData.gameState = 'MOSTRANDO_FORTUNA'

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

export function setupFortuneTellerSystem() {
  if (fortuneTellerSystemInitialized) return
  fortuneTellerSystemInitialized = true

  engine.addSystem((dt) => {
    if (gameData.gameState !== 'OCUPADO') {
      fortuneTellerTimer = 0
      return
    }

    const localUserId = getPlayer()?.userId ?? null
    const isFortuneTeller =
      gameData.currentFortuneTellerId === null || gameData.currentFortuneTellerId === localUserId
    if (!isFortuneTeller) return

    // If a fortune teller is set, don't auto-pick; fortune teller chooses category in the UI
    if (gameData.currentFortuneTellerId !== null) return

    fortuneTellerTimer += dt

    if (fortuneTellerTimer >= FORTUNE_TELLER_REVEAL_DELAY) {
      fortuneTellerTimer = 0

      let fortune = FORTUNES[Math.floor(Math.random() * FORTUNES.length)]
      let attempts = 0
      while (
        lastAutoCategory !== null &&
        fortune.category === lastAutoCategory &&
        attempts < 10
      ) {
        fortune = FORTUNES[Math.floor(Math.random() * FORTUNES.length)]
        attempts++
      }
      lastAutoCategory = fortune.category

      gameData.currentFortune = fortune
      gameData.gameState = 'MOSTRANDO_FORTUNA'

      const fortuneIndex = FORTUNES.indexOf(fortune)
      fortuneMessageBus.emit('show-fortune', {
        fortuneIndex: fortuneIndex >= 0 ? fortuneIndex : 0,
        category: fortune.category,
        guestId: gameData.currentGuestId,
        guestName: gameData.currentGuestName ?? null
      })
    }
  })
}
