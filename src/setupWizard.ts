import {
  engine,
  Animator,
  Transform,
  VisibilityComponent,
  pointerEventsSystem,
  InputAction,
  executeTask
} from '@dcl/sdk/ecs'
import { Vector3 } from '@dcl/sdk/math'
import { getPlayer } from '@dcl/sdk/players'
import { movePlayerTo, triggerEmote } from '~system/RestrictedActions'
import { gameData } from './gameState'
import { fortuneMessageBus } from './fortuneSync'
import {
  WIZARD,
  FORTUNE_TELLER_POSITION,
  FORTUNE_TELLER_CAMERA_TARGET,
  BECOME_FORTUNE_TELLER_PROMPT
} from './scene'
import { startOrbitCinematic, stopOrbitCinematic, setupCinematicCamera } from './cinematicCamera'
import { EntityNames } from '../assets/scene/entity-names'

/** Center of the table used as orbit pivot for the cinematic. */
const TABLE_CENTER = { x: 8, y: 0, z: 8 }

const FORTUNE_TELLER_MOVE_THRESHOLD = 0.5
/** Si entraste por Sit Spot, el avatar queda en la silla (no en FORTUNE_TELLER_POSITION): tolerancia XZ más amplia. */
const FORTUNE_TELLER_MOVE_THRESHOLD_CHAIR = 2.5
/** Sit Spot: Fortune_Teller — mismo XZ que composite entity 521 (sincronizar si mueves el sit en el editor). */
const SIT_SPOT_FT_STATION = { x: 7.954911708831787, y: 0, z: 5.17503547668457 }
/** Tiempo en ms sin comprobar movimiento tras convertirse en fortune teller (dar tiempo al teletransporte). */
const FORTUNE_TELLER_GRACE_MS = 1500
const FORTUNE_TELLER_HOVER_BECOME = 'Become The Fortune Teller'
const WIZARD_MOVE_OFFSET_X = 2
const WIZARD_MOVE_OFFSET_Z = -1
const WIZARD_MOVE_SPEED = 6
const FORTUNE_TELLER_SESSION_INITIAL_MS = 60000
const FORTUNE_TELLER_RANDOM_MIN_X = 3
const FORTUNE_TELLER_RANDOM_MAX_X = 13
const FORTUNE_TELLER_RANDOM_MIN_Z = 7
const FORTUNE_TELLER_RANDOM_MAX_Z = 12
/** Trigger area bounds from composite entity 519 "Trigger: Fortune_Teller". */
const TRIGGER_FT_CENTER_X = 7.98
const TRIGGER_FT_CENTER_Z = 3.64
const TRIGGER_FT_HALF_X = 8 // scale.x / 2
const TRIGGER_FT_HALF_Z = 2 // scale.z / 2
const TRIGGER_FT_MIN_X = TRIGGER_FT_CENTER_X - TRIGGER_FT_HALF_X
const TRIGGER_FT_MAX_X = TRIGGER_FT_CENTER_X + TRIGGER_FT_HALF_X
const TRIGGER_FT_MIN_Z = TRIGGER_FT_CENTER_Z - TRIGGER_FT_HALF_Z
const TRIGGER_FT_MAX_Z = TRIGGER_FT_CENTER_Z + TRIGGER_FT_HALF_Z

let playerWasInFortuneTellerTrigger = false
let fortuneTellerSitSpotRegistered = false
/** True si el rol se tomó clicando el Sit Spot (la zona de “sigo en el puesto” incluye silla + mesa). */
let fortuneTellerJoinedViaSitSpot = false
/** Mientras movePlayerTo/emote del Sit Spot no terminaron, no aplicar la regla de alejamiento. */
let sitSpotFtTeleportPending = false
let lastFortuneTellerPosition: { x: number; y: number; z: number } | null = null
let fortuneTellerBecameAtMs: number = 0
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

function horizontalDistance(
  a: { x: number; z: number },
  b: { x: number; z: number }
): number {
  const dx = a.x - b.x
  const dz = a.z - b.z
  return Math.sqrt(dx * dx + dz * dz)
}

function playerStillAtFortuneTellerStation(playerPos: { x: number; y: number; z: number }): boolean {
  if (!lastFortuneTellerPosition) return true
  if (fortuneTellerJoinedViaSitSpot) {
    const dSit = horizontalDistance(playerPos, SIT_SPOT_FT_STATION)
    const dFt = horizontalDistance(playerPos, FORTUNE_TELLER_POSITION)
    return Math.min(dSit, dFt) <= FORTUNE_TELLER_MOVE_THRESHOLD_CHAIR
  }
  return distance(playerPos, lastFortuneTellerPosition) <= FORTUNE_TELLER_MOVE_THRESHOLD
}

function clearFortuneTellerAndShowWizard() {
  const previousName = gameData.currentFortuneTellerName?.trim() || 'Someone'
  gameData.currentFortuneTellerId = null
  gameData.currentFortuneTellerName = null
  gameData.fortuneTellerSessionEndsAtMs = null
  gameData.fortuneTellerReadingsDone = 0
  gameData.fortuneTellerMaxReadings = 3
  gameData.fortuneTellerReleaseAtMs = null
  gameData.fortuneTellerTimeRemainingSec = 0
  gameData.centerBannerText = `${previousName} is no longer the Fortune Teller`
  gameData.centerBannerUntilMs = Date.now() + 2200
  lastFortuneTellerPosition = null
  fortuneTellerBecameAtMs = 0
  fortuneTellerJoinedViaSitSpot = false
  sitSpotFtTeleportPending = false
  stopOrbitCinematic()
  fortuneMessageBus.emit('set-fortune-teller', {
    fortuneTellerId: null,
    fortuneTellerName: null,
    fortuneTellerSessionEndsAtMs: null,
    fortuneTellerReadingsDone: 0,
    fortuneTellerMaxReadings: 3,
    fortuneTellerReleaseAtMs: null,
    centerBannerText: gameData.centerBannerText,
    centerBannerUntilMs: gameData.centerBannerUntilMs
  })
}

function randomInRange(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

function moveFortuneTellerToRandomArea(): void {
  executeTask(async () => {
    try {
      await movePlayerTo({
        newRelativePosition: {
          x: randomInRange(FORTUNE_TELLER_RANDOM_MIN_X, FORTUNE_TELLER_RANDOM_MAX_X),
          y: 1,
          z: randomInRange(FORTUNE_TELLER_RANDOM_MIN_Z, FORTUNE_TELLER_RANDOM_MAX_Z)
        },
        cameraTarget: {
          x: FORTUNE_TELLER_CAMERA_TARGET.x,
          y: FORTUNE_TELLER_CAMERA_TARGET.y,
          z: FORTUNE_TELLER_CAMERA_TARGET.z
        }
      })
    } catch (_e) {}
  })
}

function releaseFortuneTellerBySessionRules(): void {
  const localUserId = getPlayer()?.userId ?? null
  if (localUserId === null || gameData.currentFortuneTellerId !== localUserId) return
  clearFortuneTellerAndShowWizard()
  moveFortuneTellerToRandomArea()
}

function fortuneTellerClickCallback(opts?: { fromSitSpot?: boolean }) {
  const fromSitSpot = opts?.fromSitSpot === true
  const player = getPlayer()
  const userId = player?.userId ?? null
  if (!userId) return
  if (gameData.currentFortuneTellerId === userId) return
  if (gameData.currentFortuneTellerId !== null) return
  hideBecomeFortuneTellerPrompt()
  const ftName = player?.name?.trim() || null
  gameData.currentFortuneTellerId = userId
  gameData.currentFortuneTellerName = ftName
  const now = Date.now()
  gameData.fortuneTellerReadingsDone = 0
  gameData.fortuneTellerMaxReadings = 3
  gameData.fortuneTellerSessionEndsAtMs = now + FORTUNE_TELLER_SESSION_INITIAL_MS
  gameData.fortuneTellerReleaseAtMs = null
  gameData.fortuneTellerTimeRemainingSec = 60
  gameData.centerBannerText = `${ftName ?? 'Someone'} is becoming the Fortune Teller`
  gameData.centerBannerUntilMs = now + 2200
  fortuneMessageBus.emit('set-fortune-teller', {
    fortuneTellerId: userId,
    fortuneTellerName: ftName,
    fortuneTellerSessionEndsAtMs: gameData.fortuneTellerSessionEndsAtMs,
    fortuneTellerReadingsDone: gameData.fortuneTellerReadingsDone,
    fortuneTellerMaxReadings: gameData.fortuneTellerMaxReadings,
    fortuneTellerReleaseAtMs: null
  })
  fortuneMessageBus.emit('fortune-teller-session-update', {
    fortuneTellerId: userId,
    fortuneTellerSessionEndsAtMs: gameData.fortuneTellerSessionEndsAtMs,
    fortuneTellerReadingsDone: gameData.fortuneTellerReadingsDone,
    fortuneTellerMaxReadings: gameData.fortuneTellerMaxReadings,
    fortuneTellerReleaseAtMs: gameData.fortuneTellerReleaseAtMs,
    centerBannerText: gameData.centerBannerText,
    centerBannerUntilMs: gameData.centerBannerUntilMs
  })
  fortuneTellerBecameAtMs = now
  fortuneTellerJoinedViaSitSpot = fromSitSpot
  lastFortuneTellerPosition = fromSitSpot
    ? {
        x: SIT_SPOT_FT_STATION.x,
        y: SIT_SPOT_FT_STATION.y,
        z: SIT_SPOT_FT_STATION.z
      }
    : {
        x: FORTUNE_TELLER_POSITION.x,
        y: FORTUNE_TELLER_POSITION.y,
        z: FORTUNE_TELLER_POSITION.z
      }

  if (fromSitSpot) {
    // La cámara de órbita al mismo tiempo que el clic suele anular el “sit” del composite.
    // Primero movePlayerTo + emote en la silla, luego la cinemática.
    sitSpotFtTeleportPending = true
    executeTask(async () => {
      try {
        await movePlayerTo({
          newRelativePosition: {
            x: SIT_SPOT_FT_STATION.x,
            y: 0,
            z: SIT_SPOT_FT_STATION.z
          },
          cameraTarget: {
            x: FORTUNE_TELLER_CAMERA_TARGET.x,
            y: FORTUNE_TELLER_CAMERA_TARGET.y,
            z: FORTUNE_TELLER_CAMERA_TARGET.z
          }
        })
        await triggerEmote({ predefinedEmote: 'sittingChair1' })
      } catch (_e) {
      } finally {
        sitSpotFtTeleportPending = false
      }
      startOrbitCinematic(
        TABLE_CENTER,
        { x: FORTUNE_TELLER_POSITION.x, y: 0, z: FORTUNE_TELLER_POSITION.z },
        () => {}
      )
    })
  } else {
    startOrbitCinematic(
      TABLE_CENTER,
      { x: FORTUNE_TELLER_POSITION.x, y: 0, z: FORTUNE_TELLER_POSITION.z },
      () => {}
    )
    executeTask(async () => {
      try {
        await movePlayerTo({
          newRelativePosition: {
            x: FORTUNE_TELLER_POSITION.x,
            y: FORTUNE_TELLER_POSITION.y,
            z: FORTUNE_TELLER_POSITION.z
          },
          cameraTarget: {
            x: FORTUNE_TELLER_CAMERA_TARGET.x,
            y: FORTUNE_TELLER_CAMERA_TARGET.y,
            z: FORTUNE_TELLER_CAMERA_TARGET.z
          }
        })
        await triggerEmote({ predefinedEmote: 'sittingChair1' })
      } catch (_e) {}
    })
  }
}

/** Clic (cursor) en el Sit Spot del composite → mismo flujo que el collider del wizard. */
function registerFortuneTellerSitSpotHandlers(entity: ReturnType<typeof engine.addEntity>): void {
  const onInteract = () => {
    fortuneTellerClickCallback({ fromSitSpot: true })
  }
  pointerEventsSystem.onPointerDown(
    {
      entity,
      opts: {
        button: InputAction.IA_POINTER,
        hoverText: FORTUNE_TELLER_HOVER_BECOME,
        maxDistance: 8,
        showFeedback: true,
        showHighlight: true
      }
    },
    onInteract
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
    const available = animator.states.map((s) => s.clip).join(', ')
    console.log(`[WizardAnim] Could not find clip for "${next}". Available: ${available}`)
  }
}

function showBecomeFortuneTellerPrompt(): void {
  if (VisibilityComponent.has(BECOME_FORTUNE_TELLER_PROMPT)) {
    VisibilityComponent.getMutable(BECOME_FORTUNE_TELLER_PROMPT).visible = true
  }
  if (Animator.has(BECOME_FORTUNE_TELLER_PROMPT)) {
    const animator = Animator.getMutable(BECOME_FORTUNE_TELLER_PROMPT)
    if (animator.states.length === 0) {
      animator.states.push({ clip: 'default', playing: true, loop: true, speed: 1 })
    } else {
      for (const state of animator.states) {
        state.playing = true
        state.loop = true
        state.speed = 1
      }
    }
  }
}

function hideBecomeFortuneTellerPrompt(): void {
  if (VisibilityComponent.has(BECOME_FORTUNE_TELLER_PROMPT)) {
    VisibilityComponent.getMutable(BECOME_FORTUNE_TELLER_PROMPT).visible = false
  }
  if (Animator.has(BECOME_FORTUNE_TELLER_PROMPT)) {
    const animator = Animator.getMutable(BECOME_FORTUNE_TELLER_PROMPT)
    for (const state of animator.states) {
      state.playing = false
    }
  }
}

export function setupWizard() {
  setupCinematicCamera()

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
    // --- Volumen "Trigger: Fortune_Teller" (AABB en código): solo muestra/oculta el GLB become_fortune_teller ---
    if (Transform.has(engine.PlayerEntity)) {
      const playerPos = Transform.get(engine.PlayerEntity).position
      const insideTrigger =
        playerPos.x >= TRIGGER_FT_MIN_X &&
        playerPos.x <= TRIGGER_FT_MAX_X &&
        playerPos.z >= TRIGGER_FT_MIN_Z &&
        playerPos.z <= TRIGGER_FT_MAX_Z
      if (insideTrigger && !playerWasInFortuneTellerTrigger) {
        playerWasInFortuneTellerTrigger = true
        showBecomeFortuneTellerPrompt()
      } else if (!insideTrigger && playerWasInFortuneTellerTrigger) {
        playerWasInFortuneTellerTrigger = false
        hideBecomeFortuneTellerPrompt()
      }
    }

    if (!fortuneTellerSitSpotRegistered) {
      const sitSpot = engine.getEntityOrNullByName(EntityNames.Sit_Spot__Fortune_Teller)
      if (sitSpot !== null) {
        fortuneTellerSitSpotRegistered = true
        registerFortuneTellerSitSpotHandlers(sitSpot)
      }
    }

    const desiredState: 'idle' | 'waiting' | 'reveal' =
      gameData.gameState === 'MOSTRANDO_FORTUNA'
        ? 'reveal'
        : gameData.currentFortuneTellerId !== null
          ? 'waiting'
          : 'idle'
    if (desiredState !== debugLastState) {
      debugLastState = desiredState
      console.log(`[WizardAnim] Desired state -> ${desiredState} (gameState=${gameData.gameState})`)
    }
    setWizardAnimation(desiredState)

    if (Transform.has(WIZARD) && originalWizardPosition && displacedWizardPosition) {
      const transform = Transform.getMutable(WIZARD)
      const target =
        gameData.currentFortuneTellerId !== null ? displacedWizardPosition : originalWizardPosition
      const t = Math.min(1, dt * WIZARD_MOVE_SPEED)
      transform.position.x += (target.x - transform.position.x) * t
      transform.position.y += (target.y - transform.position.y) * t
      transform.position.z += (target.z - transform.position.z) * t
    }

    // Fortune teller session timer and forced release rules (timestamp-based).
    if (gameData.currentFortuneTellerId !== null && gameData.fortuneTellerSessionEndsAtMs !== null) {
      const now = Date.now()
      const remainingSecTarget = Math.max(0, (gameData.fortuneTellerSessionEndsAtMs - now) / 1000)
      if (remainingSecTarget > gameData.fortuneTellerTimeRemainingSec) {
        gameData.fortuneTellerTimeRemainingSec = Math.min(
          remainingSecTarget,
          gameData.fortuneTellerTimeRemainingSec + dt * 20
        )
      } else {
        gameData.fortuneTellerTimeRemainingSec = remainingSecTarget
      }

      const localUserIdForTimer = getPlayer()?.userId ?? null
      const localIsFortuneTellerForTimer =
        localUserIdForTimer !== null && gameData.currentFortuneTellerId === localUserIdForTimer
      if (localIsFortuneTellerForTimer) {
        if (gameData.fortuneTellerReleaseAtMs !== null && now >= gameData.fortuneTellerReleaseAtMs) {
          releaseFortuneTellerBySessionRules()
          return
        }
        if (now >= gameData.fortuneTellerSessionEndsAtMs) {
          releaseFortuneTellerBySessionRules()
          return
        }
      }
    }

    const localUserId = getPlayer()?.userId ?? null
    if (gameData.currentFortuneTellerId !== localUserId || !lastFortuneTellerPosition) return
    if (Date.now() - fortuneTellerBecameAtMs < FORTUNE_TELLER_GRACE_MS) return
    if (fortuneTellerJoinedViaSitSpot && sitSpotFtTeleportPending) return
    if (!Transform.has(engine.PlayerEntity)) return

    const pos = Transform.get(engine.PlayerEntity).position
    const current = { x: pos.x, y: pos.y, z: pos.z }
    if (!playerStillAtFortuneTellerStation(current)) {
      clearFortuneTellerAndShowWizard()
    }
  })
}
