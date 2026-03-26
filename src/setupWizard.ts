import {
  engine,
  Transform,
  VisibilityComponent,
  pointerEventsSystem,
  InputAction,
  executeTask
} from '@dcl/sdk/ecs'
import { Vector3 } from '@dcl/sdk/math'
import { getPlayer } from '@dcl/sdk/players'
import { movePlayerTo } from '~system/RestrictedActions'
import { gameData } from './gameState'
import { fortuneMessageBus } from './fortuneSync'
import {
  WIZARD,
  HOST_COLLIDER,
  HOST_POSITION,
  HOST_CAMERA_TARGET
} from './scene'

const HOST_MOVE_THRESHOLD = 0.5
/** Tiempo en ms sin comprobar movimiento tras convertirse en host (dar tiempo al teletransporte). */
const HOST_GRACE_MS = 1500
const HOST_HOVER_BECOME = 'Become Host'
const HOST_HOVER_WAIT = 'Wait for the next turn'
let lastHostPosition: { x: number; y: number; z: number } | null = null
let hostBecameAtMs: number = 0
let hostColliderShowingWait = false

function distance(a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }): number {
  const dx = a.x - b.x
  const dy = a.y - b.y
  const dz = a.z - b.z
  return Math.sqrt(dx * dx + dy * dy + dz * dz)
}

function clearHostAndShowWizard() {
  gameData.currentHostId = null
  gameData.currentHostName = null
  lastHostPosition = null
  hostBecameAtMs = 0
  fortuneMessageBus.emit('set-host', { hostId: null, hostName: null })
  if (VisibilityComponent.has(WIZARD)) {
    VisibilityComponent.getMutable(WIZARD).visible = true
  } else if (Transform.has(WIZARD)) {
    VisibilityComponent.create(WIZARD, { visible: true })
  }
}

function hostClickCallback() {
  const player = getPlayer()
  const userId = player?.userId ?? null
  if (!userId) return
  const hostName = player?.name?.trim() || null
  gameData.currentHostId = userId
  gameData.currentHostName = hostName
  fortuneMessageBus.emit('set-host', { hostId: userId, hostName })
  if (VisibilityComponent.has(WIZARD)) {
    VisibilityComponent.getMutable(WIZARD).visible = false
  } else {
    VisibilityComponent.create(WIZARD, { visible: false })
  }
  hostBecameAtMs = Date.now()
  lastHostPosition = {
    x: HOST_POSITION.x,
    y: HOST_POSITION.y,
    z: HOST_POSITION.z
  }
  executeTask(async () => {
    try {
      await movePlayerTo({
        newRelativePosition: {
          x: HOST_POSITION.x,
          y: HOST_POSITION.y,
          z: HOST_POSITION.z
        },
        cameraTarget: {
          x: HOST_CAMERA_TARGET.x,
          y: HOST_CAMERA_TARGET.y,
          z: HOST_CAMERA_TARGET.z
        }
      })
    } catch (_e) {}
  })
}

function registerHostColliderPointer(showWaitMessage: boolean) {
  pointerEventsSystem.removeOnPointerDown(HOST_COLLIDER)
  pointerEventsSystem.onPointerDown(
    {
      entity: HOST_COLLIDER,
      opts: {
        button: InputAction.IA_POINTER,
        hoverText: showWaitMessage ? HOST_HOVER_WAIT : HOST_HOVER_BECOME
      }
    },
    showWaitMessage ? () => {} : hostClickCallback
  )
}

export function setupWizard() {
  registerHostColliderPointer(false)

  engine.addSystem((_dt: number) => {
    const showWait = gameData.gameState === 'MOSTRANDO_FORTUNA'
    if (showWait !== hostColliderShowingWait) {
      hostColliderShowingWait = showWait
      registerHostColliderPointer(showWait)
    }
    const localUserId = getPlayer()?.userId ?? null
    if (gameData.currentHostId !== localUserId || !lastHostPosition) return
    if (Date.now() - hostBecameAtMs < HOST_GRACE_MS) return
    if (!Transform.has(engine.PlayerEntity)) return

    const pos = Transform.get(engine.PlayerEntity).position
    const current = { x: pos.x, y: pos.y, z: pos.z }
    if (distance(current, lastHostPosition) > HOST_MOVE_THRESHOLD) {
      clearHostAndShowWizard()
    }
  })
}
