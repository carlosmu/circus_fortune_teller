import {
  engine,
  Transform,
  executeTask
} from '@dcl/sdk/ecs'
import { Vector3 } from '@dcl/sdk/math'
import { getEntityWorldPosition } from './worldTransform'
import { getPlayer } from '@dcl/sdk/players'
import { EntityNames } from '../assets/scene/entity-names'
import { gameData } from './gameState'
import {
  fortuneMessageBus,
  GUEST_MAX_READINGS_PER_SEAT,
  GUEST_READING_IDLE_TIMEOUT_MS
} from './fortuneSync'
import { scheduleVirtualHostDelayThenOpenGuestCategories } from './fortuneTellerSystem'
import { displaceGuestSeatOccupantToRandomArea } from './guestSeatDisplace'
import { USE_FORTUNE_FSM_FLOW } from './sceneConfig'

export const GUEST_SPOT = engine.addEntity()

/** Fallback si Sit Spot: Guest no existe en runtime. */
const SIT_SPOT_GUEST_STATION = { x: 7.84, y: 0, z: 6.827048301696777 }
const GUEST_SEAT_MOVE_THRESHOLD = 2.5
const GUEST_SEAT_GRACE_MS = 1500

/** Distancia desde el sit spot para detectar que el composite sentó al jugador. */
const GUEST_SIT_DETECT_THRESHOLD = 1.0

let guestJoinedViaSitSpot = false
let sitSpotGuestTeleportPending = false
let guestSatAtMs = 0
let guestReadingIdleKickDispatched = false
let guestMaxReadingsDisplaceDispatched = false

function horizontalDistance(
  a: { x: number; z: number },
  b: { x: number; z: number }
): number {
  const dx = a.x - b.x
  const dz = a.z - b.z
  return Math.sqrt(dx * dx + dz * dz)
}

function getGuestSitStationXZ(): { x: number; z: number } {
  const sit = engine.getEntityOrNullByName(EntityNames.Sit_Spot__Guest)
  if (sit !== null) {
    const worldPos = getEntityWorldPosition(sit)
    if (worldPos) return { x: worldPos.x, z: worldPos.z }
  }
  return { x: SIT_SPOT_GUEST_STATION.x, z: SIT_SPOT_GUEST_STATION.z }
}

function emitGuestFortuneRequestFromChair() {
  if (gameData.guestReadingsUsedThisSeat >= GUEST_MAX_READINGS_PER_SEAT) return
  const sessionReadingIndex = gameData.guestReadingsUsedThisSeat + 1
  executeTask(async () => {
    const player = getPlayer()
    const userId = player?.userId ?? 'unknown'
    const name = player?.name ?? 'Visitor'
    const roundSalt = Date.now()
    fortuneMessageBus.emit('guest-requested-fortune', {
      guestId: userId,
      guestName: name,
      roundSalt,
      sessionReadingIndex
    })
    if (!USE_FORTUNE_FSM_FLOW || gameData.currentFortuneTellerId === null) {
      scheduleVirtualHostDelayThenOpenGuestCategories()
    }
  })
}

/**
 * Detecta que el composite del Creator Hub sentó al jugador y ejecuta la lógica de juego.
 */
function detectGuestSatDown(): void {
  if (gameData.guestSeatUserId !== null) return
  if (guestJoinedViaSitSpot) return
  if (gameData.gameState !== 'LIBRE') return
  const localUserId = getPlayer()?.userId ?? null
  if (!localUserId) return
  if (localUserId === gameData.currentFortuneTellerId) return
  if (!Transform.has(engine.PlayerEntity)) return

  const pos = Transform.get(engine.PlayerEntity).position
  const station = getGuestSitStationXZ()
  if (horizontalDistance(pos, station) > GUEST_SIT_DETECT_THRESHOLD) return

  const player = getPlayer()
  const guestDisplayName = player?.name?.trim() || null
  const now = Date.now()

  fortuneMessageBus.emit('guest-seat-update', {
    seatUserId: localUserId,
    seatUserName: guestDisplayName ?? 'Visitor',
    centerBannerText: `${guestDisplayName ?? 'Someone'} is becoming the Guest`,
    centerBannerUntilMs: now + 2200
  })

  guestJoinedViaSitSpot = true
  guestSatAtMs = now
  sitSpotGuestTeleportPending = true
  executeTask(async () => {
    try {
      await new Promise<void>((resolve) => setTimeout(resolve, 2500))
    } finally {
      sitSpotGuestTeleportPending = false
    }
    emitGuestFortuneRequestFromChair()
  })
}

export function setupGuestSpot() {
  Transform.create(GUEST_SPOT, {
    position: Vector3.create(8, 1, 8.6)
  })

  fortuneMessageBus.on('guest-reading-idle-kick', (data: { guestId: string }) => {
    if (getPlayer()?.userId === data.guestId) {
      guestJoinedViaSitSpot = false
    }
  })

  fortuneMessageBus.on('guest-chair-decline-more', (data: { guestId: string }) => {
    if (getPlayer()?.userId === data.guestId) {
      guestJoinedViaSitSpot = false
    }
  })

  engine.addSystem(() => {
    detectGuestSatDown()

    const localUserId = getPlayer()?.userId ?? null

    if (
      gameData.gameState !== 'OCUPADO' ||
      gameData.currentGuestId !== localUserId
    ) {
      guestReadingIdleKickDispatched = false
    } else if (
      localUserId !== null &&
      gameData.guestLastInteractionAtMs !== null &&
      Date.now() - gameData.guestLastInteractionAtMs >= GUEST_READING_IDLE_TIMEOUT_MS &&
      !guestReadingIdleKickDispatched
    ) {
      guestReadingIdleKickDispatched = true
      fortuneMessageBus.emit('guest-reading-idle-kick', { guestId: localUserId })
      displaceGuestSeatOccupantToRandomArea()
    }

    const maxReadingsDisplacePending =
      gameData.gameState === 'LIBRE' &&
      localUserId !== null &&
      localUserId === gameData.guestSeatUserId &&
      gameData.guestReadingsUsedThisSeat >= GUEST_MAX_READINGS_PER_SEAT &&
      !sitSpotGuestTeleportPending

    if (!maxReadingsDisplacePending) {
      guestMaxReadingsDisplaceDispatched = false
    } else if (!guestMaxReadingsDisplaceDispatched) {
      guestMaxReadingsDisplaceDispatched = true
      guestJoinedViaSitSpot = false
      fortuneMessageBus.emit('guest-seat-update', {
        seatUserId: null,
        seatUserName: null
      })
      displaceGuestSeatOccupantToRandomArea()
    }

    if (
      gameData.gameState === 'LIBRE' &&
      localUserId !== null &&
      localUserId === gameData.guestSeatUserId &&
      !sitSpotGuestTeleportPending &&
      Date.now() - guestSatAtMs >= GUEST_SEAT_GRACE_MS &&
      Transform.has(engine.PlayerEntity)
    ) {
      const pos = Transform.get(engine.PlayerEntity).position
      const station = getGuestSitStationXZ()
      if (horizontalDistance(pos, station) > GUEST_SEAT_MOVE_THRESHOLD) {
        guestJoinedViaSitSpot = false
        fortuneMessageBus.emit('guest-seat-update', {
          seatUserId: null,
          seatUserName: null
        })
      }
    }
  })
}
