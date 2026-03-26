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
const TABLE_HOVER_DISABLED_HOST = 'Host cannot reveal as Guest'

function tableClickCallback() {
  const localUserId = getPlayer()?.userId ?? null
  // Logic-level guard: current Host cannot trigger guest reveal button.
  if (localUserId !== null && gameData.currentHostId === localUserId) return
  if (gameData.gameState !== 'LIBRE') return
  executeTask(async () => {
    const player = getPlayer()
    const userId = player?.userId ?? 'unknown'
    const name = player?.name ?? 'Visitor'
    gameData.currentGuestId = userId
    gameData.currentGuestName = name
    gameData.gameState = 'OCUPADO'
    fortuneMessageBus.emit('guest-requested-fortune', {
      guestId: userId,
      guestName: name
    })
  })
}

function registerTablePointer(mode: 'reveal' | 'wait' | 'disabled-host') {
  pointerEventsSystem.removeOnPointerDown(TABLE)
  const hoverText =
    mode === 'wait'
      ? TABLE_HOVER_WAIT
      : mode === 'disabled-host'
        ? TABLE_HOVER_DISABLED_HOST
        : TABLE_HOVER_REVEAL
  const enabled = mode === 'reveal'
  pointerEventsSystem.onPointerDown(
    {
      entity: TABLE,
      opts: {
        button: InputAction.IA_POINTER,
        hoverText
      }
    },
    enabled ? tableClickCallback : () => {}
  )
}

let lastTableMode: 'reveal' | 'wait' | 'disabled-host' | null = null

export function setupGuestSpot() {
  Transform.create(GUEST_SPOT, {
    position: Vector3.create(8, 1, 8.6)
  })

  registerTablePointer('reveal')
  lastTableMode = 'reveal'

  engine.addSystem(() => {
    const localUserId = getPlayer()?.userId ?? null
    const localIsHost = localUserId !== null && gameData.currentHostId === localUserId
    const mode: 'reveal' | 'wait' | 'disabled-host' =
      gameData.gameState === 'MOSTRANDO_FORTUNA'
        ? 'wait'
        : localIsHost
          ? 'disabled-host'
          : 'reveal'
    if (mode !== lastTableMode) {
      lastTableMode = mode
      registerTablePointer(mode)
    }
  })
}