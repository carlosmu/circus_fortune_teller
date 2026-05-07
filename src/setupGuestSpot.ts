import {
  engine,
  Transform,
  PointerEvents,
  pointerEventsSystem,
  InputAction,
  executeTask
} from '@dcl/sdk/ecs'
import { Vector3 } from '@dcl/sdk/math'
import { getEntityWorldPosition } from './worldTransform'
import { getPlayer } from '@dcl/sdk/players'
import { movePlayerTo, triggerEmote } from '~system/RestrictedActions'
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
const AVATAR_LOOK_AHEAD_METERS = 2.5
const GUEST_SEAT_MOVE_THRESHOLD = 2.5
const GUEST_SEAT_GRACE_MS = 1500

const GUEST_SIT_SPOT_HOVER = 'Ask For Your Fortune'

/** InteractionType.PROXIMITY: solo queremos clic con cursor, no prompt "E". */
const POINTER_INTERACTION_PROXIMITY = 1

let guestSitSpotRegistered = false
let sitSpotGuestStripFramesLeft = 0
let guestJoinedViaSitSpot = false
let sitSpotGuestTeleportPending = false
let guestSatAtMs = 0
let lastAppliedGuestSitMode: 'registered' | null = null
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

/** Posición y orientación world del Sit Spot: Guest (corrige coordenadas locales del hijo). */
function buildGuestSitMovePlayerToRequest(): {
  newRelativePosition: { x: number; y: number; z: number }
  cameraTarget: { x: number; y: number; z: number }
  avatarTarget: { x: number; y: number; z: number }
} {
  const cameraTarget = {
    x: 8,
    y: 1,
    z: 5.5
  }
  const sit = engine.getEntityOrNullByName(EntityNames.Sit_Spot__Guest)
  if (sit !== null) {
    const worldPos = getEntityWorldPosition(sit)
    if (worldPos) {
      return {
        newRelativePosition: { x: worldPos.x, y: worldPos.y, z: worldPos.z },
        cameraTarget,
        avatarTarget: {
          x: worldPos.x,
          y: worldPos.y + 1,
          z: worldPos.z + AVATAR_LOOK_AHEAD_METERS
        }
      }
    }
  }
  return {
    newRelativePosition: {
      x: SIT_SPOT_GUEST_STATION.x,
      y: SIT_SPOT_GUEST_STATION.y,
      z: SIT_SPOT_GUEST_STATION.z
    },
    cameraTarget,
    avatarTarget: cameraTarget
  }
}

function stripSitSpotGuestProximityUi(entity: ReturnType<typeof engine.addEntity>): void {
  if (!PointerEvents.has(entity)) return
  const m = PointerEvents.getMutable(entity)
  m.pointerEvents = m.pointerEvents.filter(
    (e) => (e.interactionType ?? 0) !== POINTER_INTERACTION_PROXIMITY
  )
  for (const entry of m.pointerEvents) {
    const info = entry.eventInfo
    if (!info) continue
    const ht = info.hoverText?.trim() ?? ''
    if (ht === 'Sit Here') {
      info.showFeedback = false
      info.showHighlight = false
    }
  }
}

function applyGuestSitSpotPointerIfNeeded(entity: ReturnType<typeof engine.addEntity>): void {
  if (lastAppliedGuestSitMode !== null) return
  lastAppliedGuestSitMode = 'registered'
  // Eliminamos los eventos del composite para que solo el nuestro procese el clic
  pointerEventsSystem.removeOnPointerDown(entity)
  pointerEventsSystem.onPointerDown(
    {
      entity,
      opts: {
        button: InputAction.IA_POINTER,
        hoverText: GUEST_SIT_SPOT_HOVER,
        maxDistance: 8,
        showFeedback: true,
        showHighlight: true
      }
    },
    guestSitSpotClickCallback
  )
  stripSitSpotGuestProximityUi(entity)
}

function guestSitSpotClickCallback() {
  const localUserId = getPlayer()?.userId ?? null
  if (!localUserId) return
  if (localUserId === gameData.currentFortuneTellerId) return
  if (gameData.gameState !== 'LIBRE') return

  if (gameData.guestSeatUserId === localUserId) {
    if (gameData.guestReadingsUsedThisSeat >= GUEST_MAX_READINGS_PER_SEAT) return
    emitGuestFortuneRequestFromChair()
    return
  }

  if (gameData.guestSeatUserId !== null) return

  const player = getPlayer()
  const guestDisplayName = player?.name?.trim() || null
  const name = guestDisplayName ?? 'Visitor'
  const now = Date.now()

  fortuneMessageBus.emit('guest-seat-update', {
    seatUserId: localUserId,
    seatUserName: name,
    centerBannerText: `${guestDisplayName ?? 'Someone'} is becoming the Guest`,
    centerBannerUntilMs: now + 2200
  })

  guestJoinedViaSitSpot = true
  guestSatAtMs = Date.now()
  sitSpotGuestTeleportPending = true
  executeTask(async () => {
    try {
      await movePlayerTo(buildGuestSitMovePlayerToRequest())
      await triggerEmote({ predefinedEmote: 'sittingChair2' })
    } catch (_e) {
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
    if (!guestSitSpotRegistered) {
      const sitSpot = engine.getEntityOrNullByName(EntityNames.Sit_Spot__Guest)
      if (sitSpot !== null) {
        guestSitSpotRegistered = true
        applyGuestSitSpotPointerIfNeeded(sitSpot)
        sitSpotGuestStripFramesLeft = 15
      }
    } else if (sitSpotGuestStripFramesLeft > 0) {
      sitSpotGuestStripFramesLeft -= 1
      const sitSpot = engine.getEntityOrNullByName(EntityNames.Sit_Spot__Guest)
      if (sitSpot !== null) {
        stripSitSpotGuestProximityUi(sitSpot)
      }
    }

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
