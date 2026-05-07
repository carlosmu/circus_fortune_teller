import {
  engine,
  Animator,
  Transform,
  executeTask
} from '@dcl/sdk/ecs'
import { getEntityWorldPosition } from './worldTransform'
import { getPlayer } from '@dcl/sdk/players'
import { gameData } from './gameState'
import { fortuneMessageBus } from './fortuneSync'
import {
  WIZARD,
  FORTUNE_TELLER_POSITION,
  FORTUNE_TELLER_CAMERA_TARGET
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
/** Fallback si Sit Spot: Fortune_Teller no existe en runtime. */
const SIT_SPOT_FT_STATION = { x: 7.954911708831787, y: 0, z: 5.17503547668457 }
/** Tiempo en ms antes de aplicar la regla de alejamiento (solo para dejar terminar movePlayerTo/emote). */
const FORTUNE_TELLER_GRACE_MS = 700
const WIZARD_MOVE_OFFSET_X = 0
const WIZARD_MOVE_OFFSET_Z = -1.65
const WIZARD_MOVE_SPEED = 6
const FORTUNE_TELLER_SESSION_INITIAL_MS = 60000
const FORTUNE_TELLER_RANDOM_MIN_X = 3
const FORTUNE_TELLER_RANDOM_MAX_X = 13
const FORTUNE_TELLER_RANDOM_MIN_Z = 7
const FORTUNE_TELLER_RANDOM_MAX_Z = 12
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
  if (sit !== null) {
    const worldPos = getEntityWorldPosition(sit)
    if (worldPos) return { x: worldPos.x, z: worldPos.z }
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

/** Distancia desde el Sit Spot del FT para detectar que el composite sentó al jugador. */
const FORTUNE_TELLER_SIT_DETECT_THRESHOLD = 1.0

/**
 * Detecta que el composite del Creator Hub sentó al jugador en el Sit Spot del Fortune Teller.
 */
function detectFortuneTellerSatDown(): void {
  if (gameData.currentFortuneTellerId !== null) return
  if (fortuneTellerJoinedViaSitSpot) return
  const localUserId = getPlayer()?.userId ?? null
  if (!localUserId) return
  if (!Transform.has(engine.PlayerEntity)) return

  const pos = Transform.get(engine.PlayerEntity).position
  const station = getFortuneTellerSitSpotXZ()
  const dx = pos.x - station.x
  const dz = pos.z - station.z
  const dist = Math.sqrt(dx * dx + dz * dz)
  if (dist > FORTUNE_TELLER_SIT_DETECT_THRESHOLD) return

  fortuneTellerClickCallback({ fromSitSpot: true })
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
  const ftSeatPos = getFortuneTellerSeatPosition()
  lastFortuneTellerPosition = fromSitSpot
    ? ftSeatPos
    : {
        x: FORTUNE_TELLER_POSITION.x,
        y: FORTUNE_TELLER_POSITION.y,
        z: FORTUNE_TELLER_POSITION.z
      }

  if (fromSitSpot) {
    // El composite del Sit Spot (Creator Hub) maneja el movimiento + emote.
    // Solo esperamos un momento para que termine antes de iniciar la cinemática.
    sitSpotFtTeleportPending = true
    executeTask(async () => {
      try {
        await new Promise<void>((resolve) => setTimeout(resolve, 2500))
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
      } catch (_e) {}
    })
  }
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
    // Detectar que el composite del Creator Hub sentó al jugador en el Sit Spot del FT
    detectFortuneTellerSatDown()

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
