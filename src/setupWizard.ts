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
let lastHostPosition: { x: number; y: number; z: number } | null = null

function distance(a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }): number {
  const dx = a.x - b.x
  const dy = a.y - b.y
  const dz = a.z - b.z
  return Math.sqrt(dx * dx + dy * dy + dz * dz)
}

function clearHostAndShowWizard() {
  gameData.currentHostId = null
  lastHostPosition = null
  fortuneMessageBus.emit('set-host', { hostId: null })
  if (Transform.has(WIZARD)) {
    VisibilityComponent.createOrReplace(WIZARD, { visible: true })
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
      executeTask(async () => {
        const player = getPlayer()
        const userId = player?.userId ?? null
        if (!userId) return
        gameData.currentHostId = userId
        fortuneMessageBus.emit('set-host', { hostId: userId })

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

        VisibilityComponent.createOrReplace(WIZARD, { visible: false })
        lastHostPosition = {
          x: HOST_POSITION.x,
          y: HOST_POSITION.y,
          z: HOST_POSITION.z
        }
      })
    }
  )

  engine.addSystem((_dt: number) => {
    const localUserId = getPlayer()?.userId ?? null
    if (gameData.currentHostId !== localUserId || !lastHostPosition) return
    if (!Transform.has(engine.PlayerEntity)) return

    const pos = Transform.get(engine.PlayerEntity).position
    const current = { x: pos.x, y: pos.y, z: pos.z }
    if (distance(current, lastHostPosition) > HOST_MOVE_THRESHOLD) {
      clearHostAndShowWizard()
    }
  })
}
