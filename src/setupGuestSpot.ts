import {
  engine,
  Transform,
  pointerEventsSystem,
  InputAction,
  executeTask
} from '@dcl/sdk/ecs'
import { Vector3 } from '@dcl/sdk/math'
import { getPlayer } from '@dcl/sdk/players'
import { gameData } from './gameState'
import { fortuneMessageBus } from './fortuneSync'
import { TABLE } from './scene'

export const GUEST_SPOT = engine.addEntity()

const TABLE_HOVER_REVEAL = 'Reveal Your Fortune'
const TABLE_HOVER_WAIT = 'Wait for the next turn'

function tableClickCallback() {
  if (gameData.gameState !== 'LIBRE') return
  executeTask(async () => {
    const player = getPlayer()
    const userId = player?.userId ?? 'desconocido'
    const name = player?.name ?? 'Visitante'
    gameData.currentGuestId = userId
    gameData.currentGuestName = name
    gameData.gameState = 'OCUPADO'
    fortuneMessageBus.emit('guest-requested-fortune', {
      guestId: userId,
      guestName: name
    })
  })
}

function registerTablePointer(showWaitMessage: boolean) {
  pointerEventsSystem.removeOnPointerDown(TABLE)
  pointerEventsSystem.onPointerDown(
    {
      entity: TABLE,
      opts: {
        button: InputAction.IA_POINTER,
        hoverText: showWaitMessage ? TABLE_HOVER_WAIT : TABLE_HOVER_REVEAL
      }
    },
    showWaitMessage ? () => {} : tableClickCallback
  )
}

let tableShowingWait = false

export function setupGuestSpot() {
  Transform.create(GUEST_SPOT, {
    position: Vector3.create(8, 1, 8.6)
  })

  registerTablePointer(false)

  engine.addSystem(() => {
    const showWait = gameData.gameState === 'MOSTRANDO_FORTUNA'
    if (showWait !== tableShowingWait) {
      tableShowingWait = showWait
      registerTablePointer(showWait)
    }
  })
}