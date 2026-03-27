import { engine } from '@dcl/sdk/ecs'
import { getPlayer } from '@dcl/sdk/players'
import { gameData } from './gameState'
import { FORTUNES } from './fortunes'
import { fortuneMessageBus } from './fortuneSync'
import type { FortuneCategory } from './types'

let hostSystemInitialized = false
let hostTimer = 0
let lastAutoCategory: FortuneCategory | null = null
const HOST_REVEAL_DELAY = 3 // seconds (only when no host is set)
const HOST_READING_BONUS_MS = 15000
const HOST_MAX_SESSION_MS = 60000
const HOST_RELEASE_DELAY_AFTER_LAST_READING_MS = 3000

/**
 * Picks a random fortune for the category and reveals it to everyone (host only, from UI).
 */
export function revealFortuneForCategory(category: FortuneCategory): void {
  if (gameData.currentHostId !== null && gameData.hostReadingsDone >= gameData.hostMaxReadings) {
    console.log('[HostSession] Readings locked: max reached')
    return
  }

  const byCategory = FORTUNES.filter((f) => f.category === category)
  if (byCategory.length === 0) return
  const fortune = byCategory[Math.floor(Math.random() * byCategory.length)]

  gameData.currentFortune = fortune
  gameData.gameState = 'MOSTRANDO_FORTUNA'

  if (gameData.currentHostId !== null) {
    gameData.hostReadingsDone += 1
    const now = Date.now()

    if (gameData.hostReadingsDone <= 2) {
      const currentEnd = gameData.hostSessionEndsAtMs ?? now
      const extendedEnd = currentEnd + HOST_READING_BONUS_MS
      const maxEnd = now + HOST_MAX_SESSION_MS
      gameData.hostSessionEndsAtMs = Math.min(extendedEnd, maxEnd)
      if (gameData.hostReadingsDone === 2) {
        const hostName = gameData.currentHostName?.trim() || 'Host'
        gameData.centerBannerText = `${hostName}, 1 reading left`
        gameData.centerBannerUntilMs = now + 2000
      }
    } else if (gameData.hostReadingsDone >= 3) {
      gameData.hostReleaseAtMs = now + HOST_RELEASE_DELAY_AFTER_LAST_READING_MS
    }

    fortuneMessageBus.emit('host-session-update', {
      hostId: gameData.currentHostId,
      hostSessionEndsAtMs: gameData.hostSessionEndsAtMs,
      hostReadingsDone: gameData.hostReadingsDone,
      hostMaxReadings: gameData.hostMaxReadings,
      hostReleaseAtMs: gameData.hostReleaseAtMs,
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

export function setupHostSystem() {
  if (hostSystemInitialized) return
  hostSystemInitialized = true

  engine.addSystem((dt) => {
    if (gameData.gameState !== 'OCUPADO') {
      hostTimer = 0
      return
    }

    const localUserId = getPlayer()?.userId ?? null
    const isHost =
      gameData.currentHostId === null || gameData.currentHostId === localUserId
    if (!isHost) return

    // If a host is set, don't auto-pick; host chooses category in the UI
    if (gameData.currentHostId !== null) return

    hostTimer += dt

    if (hostTimer >= HOST_REVEAL_DELAY) {
      hostTimer = 0

      // Pick random fortune ensuring category doesn't repeat from previous
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

