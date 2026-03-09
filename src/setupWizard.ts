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
let lastHostPosition: { x: number; y: number; z: number } | null = null
let hostBecameAtMs: number = 0

function distance(a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }): number {
  const dx = a.x - b.x
  const dy = a.y - b.y
  const dz = a.z - b.z
  return Math.sqrt(dx * dx + dy * dy + dz * dz)
}

function clearHostAndShowWizard() {
  gameData.currentHostId = null
  lastHostPosition = null
  hostBecameAtMs = 0
  fortuneMessageBus.emit('set-host', { hostId: null })
  if (VisibilityComponent.has(WIZARD)) {
    VisibilityComponent.getMutable(WIZARD).visible = true
  } else if (Transform.has(WIZARD)) {
    VisibilityComponent.create(WIZARD, { visible: true })
  }
}

export function setupWizard() {
  pointerEventsSystem.onPointerDown(
    {
      entity: HOST_COLLIDER,
      opts: {
        button: InputAction.IA_POINTER,
        hoverText: 'Become Host'
      }
    },
    () => {
      const player = getPlayer()
      const userId = player?.userId ?? null
      if (!userId) return

      gameData.currentHostId = userId
      fortuneMessageBus.emit('set-host', { hostId: userId })
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
        } catch (_e) {
          // Si falla el teletransporte, el jugador sigue siendo host y el wizard ya está oculto
        }
      })
    }
  )

  engine.addSystem((_dt: number) => {
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
