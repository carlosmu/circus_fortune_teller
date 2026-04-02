import {
  engine,
  Animator,
  Transform,
  VisibilityComponent,
  PointerEvents,
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
import { startHostCinematicCamera, stopOrbitCinematic, setupCinematicCamera } from './cinematicCamera'
import { EntityNames } from '../assets/scene/entity-names'

const FORTUNE_TELLER_MOVE_THRESHOLD = 0.5
/**
 * Solo radio horizontal alrededor del Sit Spot: Fortune_Teller. Antes se usaba min(dist silla, dist mago) ≤ 2.5 m,
 * así que podías ir a la mesa y seguir siendo FT. Ahora solo cuenta la silla: al levantarte sales del radio enseguida.
 */
const FORTUNE_TELLER_CHAIR_STAY_RADIUS = 0.75
/** Tras soltar el rol por dejar la silla, empuja al jugador al menos esta distancia desde el sit (XZ). */
const FORTUNE_TELLER_LEAVE_NUDGE_METERS = 2.5
/** Sit Spot: Fortune_Teller — fallback si la entidad aún no existe (composite 521). */
const SIT_SPOT_FT_STATION = { x: 7.954911708831787, y: 0, z: 5.17503547668457 }
/** Tiempo en ms antes de aplicar la regla de alejamiento (solo para dejar terminar movePlayerTo/emote). */
const FORTUNE_TELLER_GRACE_MS = 700
/** Texto al apuntar con el cursor al Sit Spot del Fortune Teller (clic para tomar el rol). */
const FORTUNE_TELLER_SIT_SPOT_HOVER = 'Become The Fortune Teller'
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
let sitSpotFtStripFramesLeft = 0
/** True si el rol se tomó clicando el Sit Spot (la zona de “sigo en el puesto” incluye silla + mesa). */
let fortuneTellerJoinedViaSitSpot = false
/** Mientras movePlayerTo/emote del Sit Spot no terminaron, no aplicar la regla de alejamiento. */
let sitSpotFtTeleportPending = false
let lastFortuneTellerPosition: { x: number; y: number; z: number } | null = null
let fortuneTellerBecameAtMs: number = 0
let originalWizardPosition: { x: number; y: number; z: number } | null = null
let displacedWizardPosition: { x: number; y: number; z: number } | null = null
/** Clips del GLB `fortune_teller.glb` (más animaciones después). */
const WIZARD_CLIP_SIT_IDLE = 'sit_idle'
const WIZARD_CLIP_STAND_IDLE = 'stand_idle'

type WizardIdleClip = typeof WIZARD_CLIP_SIT_IDLE | typeof WIZARD_CLIP_STAND_IDLE

let currentWizardIdleClip: WizardIdleClip | null = null
let debugLastWizardIdleClip: WizardIdleClip | null = null

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

function getFortuneTellerSitSpotXZ(): { x: number; z: number } {
  const sit = engine.getEntityOrNullByName(EntityNames.Sit_Spot__Fortune_Teller)
  if (sit !== null && Transform.has(sit)) {
    const p = Transform.get(sit).position
    return { x: p.x, z: p.z }
  }
  return { x: SIT_SPOT_FT_STATION.x, z: SIT_SPOT_FT_STATION.z }
}

function playerStillAtFortuneTellerStation(playerPos: { x: number; y: number; z: number }): boolean {
  if (!lastFortuneTellerPosition) return true
  if (fortuneTellerJoinedViaSitSpot) {
    const chair = getFortuneTellerSitSpotXZ()
    return horizontalDistance(playerPos, chair) <= FORTUNE_TELLER_CHAIR_STAY_RADIUS
  }
  return distance(playerPos, lastFortuneTellerPosition) <= FORTUNE_TELLER_MOVE_THRESHOLD
}

/** Empuja al jugador local lejos del sit del FT (dirección “hacia invitado”, alejándose del mago). */
function scheduleNudgeAwayFromFortuneTellerChair(): void {
  const chair = getFortuneTellerSitSpotXZ()
  const wizardX = FORTUNE_TELLER_POSITION.x
  const wizardZ = FORTUNE_TELLER_POSITION.z
  let dx = chair.x - wizardX
  let dz = chair.z - wizardZ
  const len = Math.sqrt(dx * dx + dz * dz) || 1
  dx /= len
  dz /= len
  const n = FORTUNE_TELLER_LEAVE_NUDGE_METERS
  const target = {
    x: chair.x + dx * n,
    y: 0,
    z: chair.z + dz * n
  }
  executeTask(async () => {
    try {
      await movePlayerTo({
        newRelativePosition: target,
        cameraTarget: {
          x: FORTUNE_TELLER_CAMERA_TARGET.x,
          y: FORTUNE_TELLER_CAMERA_TARGET.y,
          z: FORTUNE_TELLER_CAMERA_TARGET.z
        }
      })
    } catch (_e) {}
  })
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
  const hostEntryPathStart = Transform.has(engine.PlayerEntity)
    ? Transform.get(engine.PlayerEntity).position
    : { x: FORTUNE_TELLER_POSITION.x, y: 0, z: FORTUNE_TELLER_POSITION.z }
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
      startHostCinematicCamera(hostEntryPathStart, () => {})
    })
  } else {
    startHostCinematicCamera(hostEntryPathStart, () => {})
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

/** InteractionType.PROXIMITY: el cliente suele mostrar “E” / interacción por tecla; solo queremos clic. */
const POINTER_INTERACTION_PROXIMITY = 1

/**
 * Quita interacciones PROXIMITY (prompt “E”) y silencia el hint legacy “Sit Here” del asset;
 * no toca la entrada del script con “Become The Fortune Teller”.
 */
function stripSitSpotFortuneTellerProximityUi(entity: ReturnType<typeof engine.addEntity>): void {
  if (!PointerEvents.has(entity)) return
  const m = PointerEvents.getMutable(entity)
  m.pointerEvents = m.pointerEvents.filter(
    (e) => (e.interactionType ?? 0) !== POINTER_INTERACTION_PROXIMITY
  )
  for (const entry of m.pointerEvents) {
    const info = entry.eventInfo
    if (!info) continue
    const ht = info.hoverText?.trim() ?? ''
    if (ht === 'Sit Here') {
      info.showFeedback = false
      info.showHighlight = false
    }
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
        hoverText: FORTUNE_TELLER_SIT_SPOT_HOVER,
        maxDistance: 8,
        showFeedback: true,
        showHighlight: true
      }
    },
    onInteract
  )
  stripSitSpotFortuneTellerProximityUi(entity)
}

/** Normaliza nombre de clip (p. ej. `Armature|sit_idle` → `sit_idle`). */
function wizardClipBaseName(clip: string): string {
  const c = clip.trim().toLowerCase()
  const i = c.lastIndexOf('|')
  return i >= 0 ? c.slice(i + 1) : c
}

/**
 * Dos estados por ahora: sentado en su sitio vs desplazado porque hay Fortune Teller jugador.
 * Ambos en loop; más clips después.
 */
function clipMatchesWizardIdle(clip: string, active: WizardIdleClip): boolean {
  const base = wizardClipBaseName(clip)
  const want = active.toLowerCase()
  if (base === want) return true
  if (active === WIZARD_CLIP_SIT_IDLE) {
    return base.includes('sit') && base.includes('idle') && !base.includes('stand')
  }
  return base.includes('stand') && base.includes('idle')
}

function applyWizardIdleAnimation(active: WizardIdleClip): void {
  if (!Animator.has(WIZARD)) return

  const animator = Animator.getMutable(WIZARD)
  let foundAny = false
  for (const state of animator.states) {
    const match = clipMatchesWizardIdle(state.clip, active)
    state.playing = match
    if (match) {
      state.loop = true
      state.speed = 1
      foundAny = true
    }
  }

  if (foundAny) {
    if (currentWizardIdleClip !== active) {
      currentWizardIdleClip = active
      console.log(`[WizardAnim] ${active} (loop)`)
    }
  } else if (animator.states.length > 0) {
    const available = animator.states.map((s) => s.clip).join(', ')
    console.log(`[WizardAnim] No clip for "${active}". Available: ${available}`)
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
        sitSpotFtStripFramesLeft = 15
      }
    } else if (sitSpotFtStripFramesLeft > 0) {
      sitSpotFtStripFramesLeft -= 1
      const sitSpot = engine.getEntityOrNullByName(EntityNames.Sit_Spot__Fortune_Teller)
      if (sitSpot !== null) {
        stripSitSpotFortuneTellerProximityUi(sitSpot)
      }
    }

    const desiredIdleClip: WizardIdleClip =
      gameData.currentFortuneTellerId !== null ? WIZARD_CLIP_STAND_IDLE : WIZARD_CLIP_SIT_IDLE
    if (desiredIdleClip !== debugLastWizardIdleClip) {
      debugLastWizardIdleClip = desiredIdleClip
      console.log(
        `[WizardAnim] desired -> ${desiredIdleClip} (ftId=${gameData.currentFortuneTellerId ?? 'null'}, gameState=${gameData.gameState})`
      )
    }
    applyWizardIdleAnimation(desiredIdleClip)

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
      const wasSitSpotFt = fortuneTellerJoinedViaSitSpot
      clearFortuneTellerAndShowWizard()
      if (wasSitSpotFt) {
        scheduleNudgeAwayFromFortuneTellerChair()
      }
    }
  })
}
