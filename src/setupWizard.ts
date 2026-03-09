import {
  pointerEventsSystem,
  InputAction,
  executeTask
} from '@dcl/sdk/ecs'
import { getPlayer } from '@dcl/sdk/players'
import { movePlayerTo } from '~system/RestrictedActions'
import { gameData } from './gameState'
import { fortuneMessageBus } from './fortuneSync'
import { WIZARD, HOST_POSITION, HOST_CAMERA_TARGET } from './scene'

export function setupWizard() {
  pointerEventsSystem.onPointerDown(
    {
      entity: WIZARD,
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
      })
    }
  )
}
