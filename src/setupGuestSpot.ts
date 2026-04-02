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
import { scheduleVirtualHostDelayThenOpenGuestCategories } from './fortuneTellerSystem'
import { TABLE } from './scene'

export const GUEST_SPOT = engine.addEntity()

const TABLE_HOVER_REVEAL = 'Ask For Your Fortune'
const TABLE_HOVER_WAIT = 'Wait for the next turn'
const TABLE_HOVER_DISABLED_FORTUNE_TELLER = 'Fortune Teller cannot reveal as Guest'

function tableClickCallback() {
  const localUserId = getPlayer()?.userId ?? null
  if (localUserId !== null && gameData.currentFortuneTellerId === localUserId) return
  if (gameData.gameState !== 'LIBRE') return
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

function registerTablePointer(mode: 'reveal' | 'wait' | 'disabled-fortune-teller') {
  pointerEventsSystem.removeOnPointerDown(TABLE)
  const hoverText =
    mode === 'wait'
      ? TABLE_HOVER_WAIT
      : mode === 'disabled-fortune-teller'
        ? TABLE_HOVER_DISABLED_FORTUNE_TELLER
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

let lastTableMode: 'reveal' | 'wait' | 'disabled-fortune-teller' | null = null

export function setupGuestSpot() {
  Transform.create(GUEST_SPOT, {
    position: Vector3.create(8, 1, 8.6)
  })

  registerTablePointer('reveal')
  lastTableMode = 'reveal'

  engine.addSystem(() => {
    const localUserId = getPlayer()?.userId ?? null
    const localIsFortuneTeller = localUserId !== null && gameData.currentFortuneTellerId === localUserId
    const mode: 'reveal' | 'wait' | 'disabled-fortune-teller' =
      gameData.gameState === 'MOSTRANDO_FORTUNA'
        ? 'wait'
        : localIsFortuneTeller
          ? 'disabled-fortune-teller'
          : 'reveal'
    if (mode !== lastTableMode) {
      lastTableMode = mode
      registerTablePointer(mode)
    }
  })
}
