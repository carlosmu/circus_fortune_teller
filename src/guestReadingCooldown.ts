import { engine } from '@dcl/sdk/ecs'
import { getPlayer } from '@dcl/sdk/players'
import { gameData } from './gameState'
import { GUEST_READING_COOLDOWN_MS } from './sceneConfig'
import { onStateEnter } from './fortuneFsm/machine'
import { fsmSession } from './fortuneFsm/session'

const COOLDOWN_BANNER_MS = 2200
export const GUEST_READING_COOLDOWN_MESSAGE = 'Readings limit reached. Wait a few minutes.'

let localGuestCooldownUntilMs = 0
/** Revelaciones completadas (REVEAL → CONTINUE) en la visita actual a la silla (solo cliente local). */
let guestRevealsCompletedThisSeat = 0
let localWasGuestInSeat = false

export function isLocalGuestOnReadingCooldown(): boolean {
  return Date.now() < localGuestCooldownUntilMs
}

/** Banner local (no MessageBus): mismo slot que “X is becoming the Guest / Fortune Teller”. */
export function showGuestReadingCooldownBanner(): void {
  const now = Date.now()
  gameData.centerBannerText = GUEST_READING_COOLDOWN_MESSAGE
  gameData.centerBannerUntilMs = now + COOLDOWN_BANNER_MS
  gameData.centerBannerVariant = 'golden'
}

export function resetGuestRevealProgressForNewSeat(): void {
  guestRevealsCompletedThisSeat = 0
}

function applyCooldownAfterCompletedCycle(): void {
  localGuestCooldownUntilMs = Date.now() + GUEST_READING_COOLDOWN_MS
  guestRevealsCompletedThisSeat = 0
}

function onLocalGuestLeftSeat(): void {
  if (guestRevealsCompletedThisSeat >= 1) {
    applyCooldownAfterCompletedCycle()
  } else {
    guestRevealsCompletedThisSeat = 0
  }
}

export function setupGuestReadingCooldown(): void {
  onStateEnter((state) => {
    if (state !== 'CONTINUE_DECISION') return
    if (!fsmSession.active) return
    const localUserId = getPlayer()?.userId ?? null
    if (localUserId === null || localUserId !== fsmSession.guestId) return
    guestRevealsCompletedThisSeat++
  })

  engine.addSystem(() => {
    const localUserId = getPlayer()?.userId ?? null
    const inSeat = localUserId !== null && gameData.guestSeatUserId === localUserId
    if (localWasGuestInSeat && !inSeat) {
      onLocalGuestLeftSeat()
    }
    localWasGuestInSeat = inSeat
  })
}
