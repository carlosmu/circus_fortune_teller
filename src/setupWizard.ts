import {
  engine,
  Animator,
  Transform,
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
const WIZARD_MOVE_OFFSET_X = 2
const WIZARD_MOVE_OFFSET_Z = -1
const WIZARD_MOVE_SPEED = 6
let lastHostPosition: { x: number; y: number; z: number } | null = null
let hostBecameAtMs: number = 0
let hostColliderShowingWait = false
let originalWizardPosition: { x: number; y: number; z: number } | null = null
let displacedWizardPosition: { x: number; y: number; z: number } | null = null
let currentWizardAnim: 'idle' | 'waiting' | 'reveal' | null = null

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
}

function hostClickCallback() {
  const player = getPlayer()
  const userId = player?.userId ?? null
  if (!userId) return
  const hostName = player?.name?.trim() || null
  gameData.currentHostId = userId
  gameData.currentHostName = hostName
  fortuneMessageBus.emit('set-host', { hostId: userId, hostName })
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

function setWizardAnimation(next: 'idle' | 'waiting' | 'reveal'): void {
  if (currentWizardAnim === next) return
  if (!Animator.has(WIZARD)) return

  const animator = Animator.getMutable(WIZARD)
  let foundAny = false
  for (const state of animator.states) {
    const shouldPlay = state.clip === next
    state.playing = shouldPlay
    if (shouldPlay) {
      state.loop = next !== 'reveal'
      state.speed = 1
      foundAny = true
    }
  }

  if (foundAny) currentWizardAnim = next
}

export function setupWizard() {
  registerHostColliderPointer(false)

  // Capture original wizard position once and compute displaced position from it.
  if (Transform.has(WIZARD)) {
    const pos = Transform.get(WIZARD).position
    originalWizardPosition = { x: pos.x, y: pos.y, z: pos.z }
    displacedWizardPosition = {
      x: pos.x + WIZARD_MOVE_OFFSET_X,
      y: pos.y,
      z: pos.z + WIZARD_MOVE_OFFSET_Z
    }
  }

  engine.addSystem((dt: number) => {
    const showWait = gameData.gameState === 'MOSTRANDO_FORTUNA'
    if (showWait !== hostColliderShowingWait) {
      hostColliderShowingWait = showWait
      registerHostColliderPointer(showWait)
    }

    // Wizard animation state machine:
    // - idle: original position, no host
    // - waiting: host taken, waiting / occupied
    // - reveal: actively revealing player's fortune
    if (gameData.gameState === 'MOSTRANDO_FORTUNA') {
      setWizardAnimation('reveal')
    } else if (gameData.currentHostId !== null) {
      setWizardAnimation('waiting')
    } else {
      setWizardAnimation('idle')
    }

    // Wizard position interpolation
    if (Transform.has(WIZARD) && originalWizardPosition && displacedWizardPosition) {
      const transform = Transform.getMutable(WIZARD)
      const target =
        gameData.currentHostId !== null ? displacedWizardPosition : originalWizardPosition
      const t = Math.min(1, dt * WIZARD_MOVE_SPEED)
      transform.position.x += (target.x - transform.position.x) * t
      transform.position.y += (target.y - transform.position.y) * t
      transform.position.z += (target.z - transform.position.z) * t
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
