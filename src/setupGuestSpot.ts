import { engine, Transform, InputModifier, executeTask } from '@dcl/sdk/ecs'
import { Vector3 } from '@dcl/sdk/math'
import { getEntityWorldPosition, getEntityWorldRotation } from './worldTransform'
import { getPlayer } from '@dcl/sdk/players'
import { movePlayerTo, triggerEmote } from '~system/RestrictedActions'
import { EntityNames } from '../assets/scene/entity-names'
import { gameData } from './gameState'
import {
  fortuneMessageBus,
  GUEST_MAX_READINGS_PER_SEAT,
  GUEST_READING_IDLE_TIMEOUT_MS,
  playButtonClick
} from './fortuneSync'
import { displaceGuestSeatOccupantToRandomArea } from './guestSeatDisplace'
import {
  isLocalGuestOnReadingCooldown,
  resetGuestRevealProgressForNewSeat,
  showGuestReadingCooldownBanner
} from './guestReadingCooldown'
import { showLeaveRoleDialog, isLeaveRoleDialogVisible } from './leaveRoleDialog'
import { registerPointerClickOnly, setPointerHoverText } from './pointerClickUtil'
import { stripBuiltInSitSpotPointerUi } from './sitSpotPointerStrip'

export const GUEST_SPOT = engine.addEntity()

/** Fallback si Sit Spot: Guest no existe en runtime. */
const SIT_SPOT_GUEST_STATION = { x: 7.84, y: 0, z: 6.827048301696777 }
const SIT_SPOT_LOCAL_FORWARD = Vector3.create(0, 0, 1)
const AVATAR_LOOK_AHEAD_METERS = 2.5
/**
 * Threshold pequeño: Q (stand up) es 100% client-side y no genera InputAction. La forma de
 * detectarlo es el desplazamiento que produce salir del sit-emote. Umbral bajo (10 cm) para
 * que el diálogo salga en cuanto el cliente ajusta la pose al levantarse; GUEST_SEAT_GRACE_MS
 * evita falsos positivos durante el movePlayerTo inicial.
 */
const GUEST_SEAT_MOVE_THRESHOLD = 0.01
const GUEST_SEAT_GRACE_MS = 1500

const GUEST_SIT_SPOT_HOVER_AVAILABLE = 'Ask For Your Fortune'
const GUEST_SIT_SPOT_HOVER_OCCUPIED = 'Reading in progress. Please wait.'

let guestSitSpotRegistered = false
let guestSitSpotEntity: ReturnType<typeof engine.addEntity> | null = null
let guestJoinedViaSitSpot = false
let sitSpotGuestTeleportPending = false
let guestSatAtMs = 0
let lastAppliedGuestSitMode: 'registered' | null = null
let guestReadingIdleKickDispatched = false
let guestMaxReadingsDisplaceDispatched = false
let lastGuestSitSpotHoverText: string | null = null

function getGuestSitSpotHoverText(localUserId: string | null): string {
  const occupantId = gameData.guestSeatUserId
  if (occupantId !== null && occupantId !== localUserId) {
    return GUEST_SIT_SPOT_HOVER_OCCUPIED
  }
  return GUEST_SIT_SPOT_HOVER_AVAILABLE
}

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
      const worldRot = getEntityWorldRotation(sit)
      // Copiamos la rotación del Sit Spot: el avatar mira en la misma dirección que la silla
      const forward = worldRot ? Vector3.rotate(SIT_SPOT_LOCAL_FORWARD, worldRot) : SIT_SPOT_LOCAL_FORWARD
      return {
        newRelativePosition: { x: worldPos.x, y: worldPos.y, z: worldPos.z },
        cameraTarget,
        avatarTarget: {
          x: worldPos.x + forward.x * AVATAR_LOOK_AHEAD_METERS,
          y: worldPos.y + 1,
          z: worldPos.z + forward.z * AVATAR_LOOK_AHEAD_METERS
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
  stripBuiltInSitSpotPointerUi(entity)
}

function applyGuestSitSpotPointerIfNeeded(entity: ReturnType<typeof engine.addEntity>): void {
  if (lastAppliedGuestSitMode !== null) return
  lastAppliedGuestSitMode = 'registered'
  registerPointerClickOnly(
    entity,
    { hoverText: GUEST_SIT_SPOT_HOVER_AVAILABLE, maxDistance: 8 },
    guestSitSpotClickCallback
  )
  stripSitSpotGuestProximityUi(entity)
}

function guestSitSpotClickCallback() {
  playButtonClick()
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

  if (isLocalGuestOnReadingCooldown()) {
    showGuestReadingCooldownBanner()
    return
  }

  resetGuestRevealProgressForNewSeat()

  const player = getPlayer()
  const guestDisplayName = player?.name?.trim() || null
  const name = guestDisplayName ?? 'Visitor'
  const now = Date.now()

  gameData.centerBannerVariant = 'default'
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
    // Bloquear movimiento del guest mientras está sentado
    InputModifier.createOrReplace(engine.PlayerEntity, {
      mode: InputModifier.Mode.Standard({
        disableWalk: true,
        disableRun: true,
        disableJump: true
      })
    })
    emitGuestFortuneRequestFromChair()
  })
}

/** Restaura el movimiento del guest local. */
function unblockGuestInput(): void {
  if (!InputModifier.has(engine.PlayerEntity)) return
  InputModifier.getMutable(engine.PlayerEntity).mode = {
    $case: 'standard',
    standard: {
      disableWalk: false,
      disableRun: false,
      disableJump: false,
      disableEmote: false
    }
  }
}

export function setupGuestSpot() {
  Transform.create(GUEST_SPOT, {
    position: Vector3.create(8, 1, 8.6)
  })

  fortuneMessageBus.on('guest-reading-idle-kick', (data: { guestId: string }) => {
    if (getPlayer()?.userId === data.guestId) {
      guestJoinedViaSitSpot = false
      unblockGuestInput()
    }
  })

  fortuneMessageBus.on('guest-chair-decline-more', (data: { guestId: string }) => {
    if (getPlayer()?.userId === data.guestId) {
      guestJoinedViaSitSpot = false
      unblockGuestInput()
      displaceGuestSeatOccupantToRandomArea()
    }
  })

  engine.addSystem(() => {
    if (!guestSitSpotRegistered) {
      const sitSpot = engine.getEntityOrNullByName(EntityNames.Sit_Spot__Guest)
      if (sitSpot !== null) {
        guestSitSpotRegistered = true
        guestSitSpotEntity = sitSpot
        applyGuestSitSpotPointerIfNeeded(sitSpot)
      }
    } else if (guestSitSpotEntity !== null) {
      stripSitSpotGuestProximityUi(guestSitSpotEntity)
    }

    const localUserId = getPlayer()?.userId ?? null

    if (guestSitSpotEntity !== null) {
      const hoverText = getGuestSitSpotHoverText(localUserId)
      if (hoverText !== lastGuestSitSpotHoverText) {
        lastGuestSitSpotHoverText = hoverText
        setPointerHoverText(guestSitSpotEntity, hoverText)
      }
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
      unblockGuestInput()
      fortuneMessageBus.emit('guest-seat-update', {
        seatUserId: null,
        seatUserName: null
      })
      displaceGuestSeatOccupantToRandomArea()
    }

    // Q (stand up) es 100% client-side y no se puede capturar como InputAction. La detección
    // se hace por desplazamiento de posición con un threshold pequeño: al pulsar Q el avatar
    // sale del sit-emote y se desplaza levemente, lo que ya cruza el umbral.
    if (
      localUserId !== null &&
      localUserId === gameData.guestSeatUserId &&
      !sitSpotGuestTeleportPending &&
      Date.now() - guestSatAtMs >= GUEST_SEAT_GRACE_MS &&
      Transform.has(engine.PlayerEntity) &&
      !isLeaveRoleDialogVisible()
    ) {
      const pos = Transform.get(engine.PlayerEntity).position
      const station = getGuestSitStationXZ()
      if (horizontalDistance(pos, station) > GUEST_SEAT_MOVE_THRESHOLD) {
        showLeaveRoleDialog(
          'Guest',
          () => {
            const guestName = (gameData.guestSeatUserName ?? getPlayer()?.name ?? 'Someone').trim() || 'Someone'
            const now = Date.now()
            guestJoinedViaSitSpot = false
            sitSpotGuestTeleportPending = true
            unblockGuestInput()
            // Limpieza local inmediata para evitar re-disparo del diálogo mientras sincroniza el bus.
            gameData.guestSeatUserId = null
            gameData.guestSeatUserName = null
            fortuneMessageBus.emit('hide-fortune', {})
            fortuneMessageBus.emit('guest-seat-update', {
              seatUserId: null,
              seatUserName: null,
              centerBannerText: `${guestName} is no longer the Guest`,
              centerBannerUntilMs: now + 2200
            })
            displaceGuestSeatOccupantToRandomArea()
            sitSpotGuestTeleportPending = false
          },
          () => {
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
              InputModifier.createOrReplace(engine.PlayerEntity, {
                mode: InputModifier.Mode.Standard({
                  disableWalk: true,
                  disableRun: true,
                  disableJump: true
                })
              })
            })
          }
        )
      }
    }
  })
}
