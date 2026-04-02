import {
  engine,
  Transform,
  PointerEvents,
  pointerEventsSystem,
  InputAction,
  executeTask
} from '@dcl/sdk/ecs'
import { Vector3 } from '@dcl/sdk/math'
import { getPlayer } from '@dcl/sdk/players'
import { movePlayerTo, triggerEmote } from '~system/RestrictedActions'
import { EntityNames } from '../assets/scene/entity-names'
import { gameData } from './gameState'
import { fortuneMessageBus } from './fortuneSync'
import { scheduleVirtualHostDelayThenOpenGuestCategories } from './fortuneTellerSystem'
import { TABLE, FORTUNE_TELLER_CAMERA_TARGET } from './scene'

export const GUEST_SPOT = engine.addEntity()

/** Sit Spot: Guest — fallback XZ si aún no existe la entidad (composite 522). */
const SIT_SPOT_GUEST_STATION = { x: 7.84, y: 0, z: 6.827048301696777 }
/** Forward local del Sit Spot (escena); se rota con el Transform del composite. */
const CHAIR_LOCAL_FORWARD = Vector3.create(0, 0, 1)
const AVATAR_LOOK_AHEAD_METERS = 2.5
const GUEST_SEAT_MOVE_THRESHOLD = 2.5
const GUEST_SEAT_GRACE_MS = 1500

const TABLE_HOVER_WAIT = 'Wait for the next turn'
const TABLE_HOVER_DISABLED_FORTUNE_TELLER = 'Fortune Teller cannot reveal as Guest'
/** La mesa ya no inicia la lectura; solo decorativa / informativa. */
const TABLE_HOVER_TABLE = 'Sit for a fortune reading'
/** Mismo gesto que antes era la mesa: sentarse aquí pide la fortuna. */
const GUEST_SIT_SPOT_HOVER = 'Ask For Your Fortune'

/** InteractionType.PROXIMITY: solo queremos clic con cursor, no prompt "E". */
const POINTER_INTERACTION_PROXIMITY = 1

let guestSitSpotRegistered = false
let sitSpotGuestStripFramesLeft = 0
let guestJoinedViaSitSpot = false
let sitSpotGuestTeleportPending = false
let guestSatAtMs = 0

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
  if (sit !== null && Transform.has(sit)) {
    const p = Transform.get(sit).position
    return { x: p.x, z: p.z }
  }
  return { x: SIT_SPOT_GUEST_STATION.x, z: SIT_SPOT_GUEST_STATION.z }
}

/**
 * Posición y orientación alineadas al Transform del Sit Spot (incl. rotación Y del editor).
 * `avatarTarget` hace que el avatar mire hacia “delante” de la silla; sin eso suele quedar mirando al revés.
 */
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
  if (sit !== null && Transform.has(sit)) {
    const t = Transform.get(sit)
    const pos = t.position
    const forward = Vector3.rotate(CHAIR_LOCAL_FORWARD, t.rotation)
    const f = AVATAR_LOOK_AHEAD_METERS
    return {
      newRelativePosition: { x: pos.x, y: pos.y, z: pos.z },
      cameraTarget,
      avatarTarget: {
        x: pos.x + forward.x * f,
        y: pos.y + 1,
        z: pos.z + forward.z * f
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

function registerGuestSitSpotHandlers(entity: ReturnType<typeof engine.addEntity>): void {
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

function emitGuestFortuneRequestFromChair() {
  executeTask(async () => {
    const player = getPlayer()
    const userId = player?.userId ?? 'unknown'
    const name = player?.name ?? 'Visitor'
    const roundSalt = Date.now()
    fortuneMessageBus.emit('guest-requested-fortune', {
      guestId: userId,
      guestName: name,
      roundSalt
    })
    scheduleVirtualHostDelayThenOpenGuestCategories()
  })
}

function guestSitSpotClickCallback() {
  const localUserId = getPlayer()?.userId ?? null
  if (!localUserId) return
  if (localUserId === gameData.currentFortuneTellerId) return
  if (gameData.gameState !== 'LIBRE') return

  if (gameData.guestSeatUserId === localUserId) {
    emitGuestFortuneRequestFromChair()
    return
  }

  if (gameData.guestSeatUserId !== null) return

  const player = getPlayer()
  const name = player?.name ?? 'Visitor'

  fortuneMessageBus.emit('guest-seat-update', {
    seatUserId: localUserId,
    seatUserName: name
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

  engine.addSystem(() => {
    if (!guestSitSpotRegistered) {
      const sitSpot = engine.getEntityOrNullByName(EntityNames.Sit_Spot__Guest)
      if (sitSpot !== null) {
        guestSitSpotRegistered = true
        registerGuestSitSpotHandlers(sitSpot)
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

    if (
      gameData.gameState === 'LIBRE' &&
      localUserId !== null &&
      localUserId === gameData.guestSeatUserId &&
      guestJoinedViaSitSpot &&
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
