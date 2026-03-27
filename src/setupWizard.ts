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
import { startOrbitCinematic, stopOrbitCinematic, setupCinematicCamera } from './cinematicCamera'

/** Center of the table used as orbit pivot for the cinematic. */
const TABLE_CENTER = { x: 8, y: 0, z: 8 }

const HOST_MOVE_THRESHOLD = 0.5
/** Tiempo en ms sin comprobar movimiento tras convertirse en host (dar tiempo al teletransporte). */
const HOST_GRACE_MS = 1500
const HOST_HOVER_BECOME = 'Become Host'
const HOST_HOVER_WAIT = 'Wait for the next turn'
const HOST_HOVER_DISABLED_SELF = 'You are already the Host'
const HOST_HOVER_DISABLED_TAKEN = 'Host already taken'
const WIZARD_MOVE_OFFSET_X = 2
const WIZARD_MOVE_OFFSET_Z = -1
const WIZARD_MOVE_SPEED = 6
let lastHostPosition: { x: number; y: number; z: number } | null = null
let hostBecameAtMs: number = 0
let lastHostColliderMode: 'become' | 'wait' | 'disabled-self' | 'disabled-taken' | null = null
let originalWizardPosition: { x: number; y: number; z: number } | null = null
let displacedWizardPosition: { x: number; y: number; z: number } | null = null
let currentWizardAnim: 'idle' | 'waiting' | 'reveal' | null = null
let debugLastState: 'idle' | 'waiting' | 'reveal' | null = null

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
  stopOrbitCinematic()
  fortuneMessageBus.emit('set-host', { hostId: null, hostName: null })
}

function hostClickCallback() {
  const player = getPlayer()
  const userId = player?.userId ?? null
  if (!userId) return
  // Logic-level guard: host cannot click "Become Host" again,
  // and no one can take host while another host is active.
  if (gameData.currentHostId === userId) return
  if (gameData.currentHostId !== null) return
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

  // Start orbit cinematic: virtual camera orbits the table while the player is
  // silently teleported underneath. When the arc finishes the virtual camera
  // deactivates and the player's view is already at HOST_POSITION.
  startOrbitCinematic(
    TABLE_CENTER,
    { x: HOST_POSITION.x, y: 0, z: HOST_POSITION.z },
    () => {} // cleanup is handled inside cinematicCamera
  )

  // Teleport the player silently while the cinematic is playing.
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

function registerHostColliderPointer(
  mode: 'become' | 'wait' | 'disabled-self' | 'disabled-taken'
) {
  pointerEventsSystem.removeOnPointerDown(HOST_COLLIDER)
  const hoverText =
    mode === 'wait'
      ? HOST_HOVER_WAIT
      : mode === 'disabled-self'
        ? HOST_HOVER_DISABLED_SELF
        : mode === 'disabled-taken'
          ? HOST_HOVER_DISABLED_TAKEN
          : HOST_HOVER_BECOME
  const enabled = mode === 'become'
  pointerEventsSystem.onPointerDown(
    {
      entity: HOST_COLLIDER,
      opts: {
        button: InputAction.IA_POINTER,
        hoverText
      }
    },
    enabled ? hostClickCallback : () => {}
  )
}

function setWizardAnimation(next: 'idle' | 'waiting' | 'reveal'): void {
  if (currentWizardAnim === next) return
  if (!Animator.has(WIZARD)) return

  const animator = Animator.getMutable(WIZARD)
  const targetAliases: Record<'idle' | 'waiting' | 'reveal', string[]> = {
    idle: ['idle', 'default', 'stand'],
    waiting: ['waiting', 'wait', 'occupy', 'ocupado'],
    reveal: ['reveal', 'fortune', 'foretell', 'cast', 'show']
  }
  const aliases = targetAliases[next]
  let foundAny = false
  for (const state of animator.states) {
    const clipName = state.clip.toLowerCase()
    const shouldPlay = aliases.some((alias) => clipName === alias || clipName.includes(alias))
    state.playing = shouldPlay
    if (shouldPlay) {
      state.loop = next !== 'reveal'
      state.speed = 1
      foundAny = true
    }
  }

  if (foundAny) {
    currentWizardAnim = next
    console.log(`[WizardAnim] Switching to "${next}"`)
  } else {
    // Useful to diagnose clip name mismatches from GLB animation exports.
    const available = animator.states.map((s) => s.clip).join(', ')
    console.log(`[WizardAnim] Could not find clip for "${next}". Available: ${available}`)
  }
}

export function setupWizard() {
  setupCinematicCamera()
  registerHostColliderPointer('become')
  lastHostColliderMode = 'become'

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
    const localUserId = getPlayer()?.userId ?? null
    const localIsHost = localUserId !== null && gameData.currentHostId === localUserId
    const hostTakenByOther =
      gameData.currentHostId !== null && gameData.currentHostId !== localUserId
    const hoverMode: 'become' | 'wait' | 'disabled-self' | 'disabled-taken' = showWait
      ? 'wait'
      : localIsHost
        ? 'disabled-self'
        : hostTakenByOther
          ? 'disabled-taken'
          : 'become'
    if (hoverMode !== lastHostColliderMode) {
      lastHostColliderMode = hoverMode
      registerHostColliderPointer(hoverMode)
    }

    // Wizard animation state machine:
    // - idle: original position, no host
    // - waiting: host taken, waiting / occupied
    // - reveal: actively revealing player's fortune
    const desiredState: 'idle' | 'waiting' | 'reveal' =
      gameData.gameState === 'MOSTRANDO_FORTUNA'
        ? 'reveal'
        : gameData.currentHostId !== null
          ? 'waiting'
          : 'idle'
    if (desiredState !== debugLastState) {
      debugLastState = desiredState
      console.log(`[WizardAnim] Desired state -> ${desiredState} (gameState=${gameData.gameState})`)
    }
    setWizardAnimation(desiredState)

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
