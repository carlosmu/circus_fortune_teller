import {
  engine,
  Transform,
  PointerEvents,
  pointerEventsSystem,
  InputAction,
  executeTask
} from '@dcl/sdk/ecs'
import { Vector3 } from '@dcl/sdk/math'
import { getEntityWorldPosition, getEntityWorldRotation } from './worldTransform'
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
import { TABLE, FORTUNE_TELLER_CAMERA_TARGET } from './scene'
import { USE_FORTUNE_FSM_FLOW } from './sceneConfig'

export const GUEST_SPOT = engine.addEntity()

/** Fallback si Sit Spot: Guest no existe en runtime. */
const SIT_SPOT_GUEST_STATION = { x: 7.84, y: 0, z: 6.827048301696777 }
/** Forward local del Sit Spot asset. */
const SIT_SPOT_LOCAL_FORWARD = Vector3.create(0, 0, 1)
const AVATAR_LOOK_AHEAD_METERS = 2.5
const GUEST_SEAT_MOVE_THRESHOLD = 2.5
const GUEST_SEAT_GRACE_MS = 1500

const TABLE_HOVER_WAIT = 'Wait for the next turn'
const TABLE_HOVER_DISABLED_FORTUNE_TELLER = 'Fortune Teller cannot reveal as Guest'
/** La mesa ya no inicia la lectura; solo decorativa / informativa. */
const TABLE_HOVER_TABLE = 'Sit for a fortune reading'
const GUEST_SIT_SPOT_HOVER = 'Ask For Your Fortune'
const GUEST_SIT_HOVER_MAX_READINGS =
  'Maximum 3 readings — leave the chair and sit again for a new session'

/** InteractionType.PROXIMITY: solo queremos clic con cursor, no prompt "E". */
const POINTER_INTERACTION_PROXIMITY = 1

let guestSitSpotRegistered = false
let sitSpotGuestStripFramesLeft = 0
let guestJoinedViaSitSpot = false
let sitSpotGuestTeleportPending = false
let guestSatAtMs = 0
let lastAppliedGuestSitMode: 'default' | 'max' | null = null
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

/** Posición y orientación world del Sit Spot: Guest (corrige coordenadas locales del hijo). */
function buildGuestSitMovePlayerToRequest(): {
  newRelativePosition: { x: number; y: number; z: number }
  cameraTarget: { x: number; y: number; z: number }
  avatarTarget: { x: number; y: number; z: number }
} {
  const cameraTarget = {
    x: FORTUNE_TELLER_CAMERA_TARGET.x,
    y: FORTUNE_TELLER_CAMERA_TARGET.y,
    z: FORTUNE_TELLER_CAMERA_TARGET.z
  }
  const sit = engine.getEntityOrNullByName(EntityNames.Sit_Spot__Guest)
  if (sit !== null) {
    const worldPos = getEntityWorldPosition(sit)
    const worldRot = getEntityWorldRotation(sit)
    if (worldPos && worldRot) {
      const forward = Vector3.rotate(SIT_SPOT_LOCAL_FORWARD, worldRot)
      const f = AVATAR_LOOK_AHEAD_METERS
      return {
        newRelativePosition: { x: worldPos.x, y: worldPos.y, z: worldPos.z },
        cameraTarget,
        avatarTarget: {
          x: worldPos.x + forward.x * f,
          y: worldPos.y + 1,
          z: worldPos.z + forward.z * f
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
  const localUserId = getPlayer()?.userId ?? null
  const maxed =
    localUserId !== null &&
    localUserId === gameData.guestSeatUserId &&
    gameData.guestReadingsUsedThisSeat >= GUEST_MAX_READINGS_PER_SEAT &&
    gameData.gameState === 'LIBRE'
  const mode = maxed ? 'max' : 'default'
  if (mode === lastAppliedGuestSitMode) return
  lastAppliedGuestSitMode = mode
  pointerEventsSystem.removeOnPointerDown(entity)
  pointerEventsSystem.onPointerDown(
    {
      entity,
      opts: {
        button: InputAction.IA_POINTER,
        hoverText: maxed ? GUEST_SIT_HOVER_MAX_READINGS : GUEST_SIT_SPOT_HOVER,
        maxDistance: 8,
        showFeedback: true,
        showHighlight: true
      }
    },
    maxed ? () => {} : guestSitSpotClickCallback
  )
  stripSitSpotGuestProximityUi(entity)
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
      await triggerEmote({ predefinedEmote: 'sittingChair1' })
    } catch (_e) {
    } finally {
      sitSpotGuestTeleportPending = false
    }
    emitGuestFortuneRequestFromChair()
  })
}

function registerTablePointer(mode: 'wait' | 'disabled-fortune-teller' | 'table') {
  pointerEventsSystem.removeOnPointerDown(TABLE)
  const hoverText =
    mode === 'wait'
      ? TABLE_HOVER_WAIT
      : mode === 'disabled-fortune-teller'
        ? TABLE_HOVER_DISABLED_FORTUNE_TELLER
        : TABLE_HOVER_TABLE
  pointerEventsSystem.onPointerDown(
    {
      entity: TABLE,
      opts: {
        button: InputAction.IA_POINTER,
        hoverText
      }
    },
    () => {}
  )
}

let lastTableMode: 'wait' | 'disabled-fortune-teller' | 'table' | null = null

export function setupGuestSpot() {
  Transform.create(GUEST_SPOT, {
    position: Vector3.create(8, 1, 8.6)
  })

  registerTablePointer('table')
  lastTableMode = 'table'

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
    const localIsFortuneTeller = localUserId !== null && gameData.currentFortuneTellerId === localUserId
    const mode: 'wait' | 'disabled-fortune-teller' | 'table' =
      gameData.gameState === 'MOSTRANDO_FORTUNA' || gameData.gameState === 'OCUPADO'
        ? 'wait'
        : localIsFortuneTeller
          ? 'disabled-fortune-teller'
          : 'table'
    if (mode !== lastTableMode) {
      lastTableMode = mode
      registerTablePointer(mode)
    }

    const sitSpotEntity = engine.getEntityOrNullByName(EntityNames.Sit_Spot__Guest)
    if (sitSpotEntity !== null) {
      applyGuestSitSpotPointerIfNeeded(sitSpotEntity)
    }

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
