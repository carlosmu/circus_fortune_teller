import { engine, Animator, Transform, InputModifier, executeTask } from '@dcl/sdk/ecs'
import { getEntityWorldPosition } from './worldTransform'
import { getPlayer } from '@dcl/sdk/players'
import { movePlayerTo, triggerEmote } from '~system/RestrictedActions'
import { gameData } from './gameState'
import { fortuneMessageBus, playButtonClick } from './fortuneSync'
import {
  WIZARD,
  FORTUNE_TELLER_POSITION,
  FORTUNE_TELLER_CAMERA_TARGET
} from './scene'
import { startHostCinematicCamera, stopOrbitCinematic, setupCinematicCamera } from './cinematicCamera'
import { EntityNames } from '../assets/scene/entity-names'
import { showLeaveRoleDialog, isLeaveRoleDialogVisible } from './leaveRoleDialog'
import { fsmSession } from './fortuneFsm/session'
import { registerPointerClickOnly, setPointerHoverText } from './pointerClickUtil'
import { stripBuiltInSitSpotPointerUi } from './sitSpotPointerStrip'
import { displacePlayerToRandomLeaveArea } from './guestSeatDisplace'

const FORTUNE_TELLER_MOVE_THRESHOLD = 0.01
/**
 * Solo radio horizontal alrededor del Sit Spot: Fortune_Teller. Antes se usaba min(dist silla, dist mago) ≤ 2.5 m,
 * así que podías ir a la mesa y seguir siendo FT. Ahora solo cuenta la silla: al levantarte sales del radio enseguida.
 */
const FORTUNE_TELLER_CHAIR_STAY_RADIUS = 0.001
/** Fallback si Sit Spot: Fortune_Teller no existe en runtime. */
const SIT_SPOT_FT_STATION = { x: 7.954911708831787, y: 0, z: 5.17503547668457 }
/** Tiempo en ms antes de aplicar la regla de alejamiento (solo para dejar terminar movePlayerTo/emote). */
const FORTUNE_TELLER_GRACE_MS = 700
/** Texto al apuntar con el cursor al Sit Spot del Fortune Teller (clic para tomar el rol). */
const FORTUNE_TELLER_SIT_SPOT_HOVER_AVAILABLE = 'Become The Fortune Teller'
const FORTUNE_TELLER_SIT_SPOT_HOVER_READING = 'Reading in progress. Please wait.'
const FORTUNE_TELLER_SIT_SPOT_MAX_DISTANCE = 8
const WIZARD_MOVE_OFFSET_X = 0
const WIZARD_MOVE_OFFSET_Z = -1.65
const WIZARD_MOVE_SPEED = 6
const FORTUNE_TELLER_SESSION_INITIAL_MS = 120000
let fortuneTellerSitSpotRegistered = false
let fortuneTellerSitSpotEntity: ReturnType<typeof engine.addEntity> | null = null
/** True si el rol se tomó clicando el Sit Spot (la zona de “sigo en el puesto” incluye silla + mesa). */
let fortuneTellerJoinedViaSitSpot = false
/** Mientras movePlayerTo/emote del Sit Spot no terminaron, no aplicar la regla de alejamiento. */
let sitSpotFtTeleportPending = false
let lastFortuneTellerPosition: { x: number; y: number; z: number } | null = null
let fortuneTellerBecameAtMs: number = 0
let lastFortuneTellerSitSpotHoverText: string | null = null

/** Guest en silla y lectura activa: otro jugador no puede tomar el rol FT hasta que termine. */
function isFortuneTellerChairBlockedByReading(localUserId: string | null): boolean {
  if (localUserId === gameData.currentFortuneTellerId) return false
  if (gameData.guestSeatUserId === null) return false
  return (
    gameData.gameState === 'OCUPADO' ||
    gameData.gameState === 'MOSTRANDO_FORTUNA' ||
    fsmSession.active
  )
}

/** Otro jugador ya es FT o hay lectura en curso: tooltip “Please wait” y clic bloqueado. */
function isFortuneTellerSitSpotUnavailable(localUserId: string | null): boolean {
  if (localUserId === gameData.currentFortuneTellerId) return false
  if (gameData.currentFortuneTellerId !== null) return true
  return isFortuneTellerChairBlockedByReading(localUserId)
}

function canClickFortuneTellerSitSpot(localUserId: string | null): boolean {
  if (localUserId === null) return false
  if (localUserId === gameData.currentFortuneTellerId) return true
  return !isFortuneTellerSitSpotUnavailable(localUserId)
}

function getFortuneTellerSitSpotHoverText(localUserId: string | null): string {
  if (isFortuneTellerSitSpotUnavailable(localUserId)) {
    return FORTUNE_TELLER_SIT_SPOT_HOVER_READING
  }
  return FORTUNE_TELLER_SIT_SPOT_HOVER_AVAILABLE
}

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

function getFortuneTellerSeatPosition(): { x: number; y: number; z: number } {
  const sit = engine.getEntityOrNullByName(EntityNames.Sit_Spot__Fortune_Teller)
  if (sit !== null) {
    const worldPos = getEntityWorldPosition(sit)
    if (worldPos) return { x: worldPos.x, y: worldPos.y, z: worldPos.z }
  }
  return {
    x: SIT_SPOT_FT_STATION.x,
    y: SIT_SPOT_FT_STATION.y,
    z: SIT_SPOT_FT_STATION.z
  }
}

function playerStillAtFortuneTellerStation(playerPos: { x: number; y: number; z: number }): boolean {
  if (!lastFortuneTellerPosition) return true
  if (fortuneTellerJoinedViaSitSpot) {
    const chair = getFortuneTellerSitSpotXZ()
    return horizontalDistance(playerPos, chair) <= FORTUNE_TELLER_CHAIR_STAY_RADIUS
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
  // Restaurar movimiento del FT al soltar el rol
  if (InputModifier.has(engine.PlayerEntity)) {
    InputModifier.getMutable(engine.PlayerEntity).mode = {
      $case: 'standard',
      standard: {
        disableWalk: false,
        disableRun: false,
        disableJump: false,
        disableEmote: false
      }
    }
  }
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

function releaseFortuneTellerBySessionRules(): void {
  const localUserId = getPlayer()?.userId ?? null
  if (localUserId === null || gameData.currentFortuneTellerId !== localUserId) return
  clearFortuneTellerAndShowWizard()
  displacePlayerToRandomLeaveArea()
}

/** Quita prompts E / “Sit Here” del composite en runtime (ver `sitSpotPointerStrip.ts`). */
function stripSitSpotFortuneTellerProximityUi(entity: ReturnType<typeof engine.addEntity>): void {
  stripBuiltInSitSpotPointerUi(entity)
}

/** Clic (cursor) en el Sit Spot del composite → mismo flujo que el collider del wizard. */
function registerFortuneTellerSitSpotHandlers(entity: ReturnType<typeof engine.addEntity>): void {
  const onInteract = () => {
    fortuneTellerClickCallback({ fromSitSpot: true })
  }
  registerPointerClickOnly(
    entity,
    { hoverText: FORTUNE_TELLER_SIT_SPOT_HOVER_AVAILABLE, maxDistance: FORTUNE_TELLER_SIT_SPOT_MAX_DISTANCE },
    onInteract
  )
  stripSitSpotFortuneTellerProximityUi(entity)
}

function fortuneTellerClickCallback(opts?: { fromSitSpot?: boolean }) {
  const fromSitSpot = opts?.fromSitSpot === true
  const player = getPlayer()
  const userId = player?.userId ?? null
  if (!userId) return
  if (gameData.currentFortuneTellerId === userId) return
  if (!canClickFortuneTellerSitSpot(userId)) return
  playButtonClick()
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
    sitSpotFtTeleportPending = true
    executeTask(async () => {
      try {
        await movePlayerTo({
          newRelativePosition: {
            x: ftSeatPos.x,
            y: ftSeatPos.y,
            z: ftSeatPos.z
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
      // Bloquear movimiento del FT mientras está en el puesto
      InputModifier.createOrReplace(engine.PlayerEntity, {
        mode: InputModifier.Mode.Standard({
          disableWalk: true,
          disableRun: true,
          disableJump: true
        })
      })
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
      // Bloquear movimiento del FT mientras está en el puesto
      InputModifier.createOrReplace(engine.PlayerEntity, {
        mode: InputModifier.Mode.Standard({
          disableWalk: true,
          disableRun: true,
          disableJump: true
        })
      })
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
    if (!fortuneTellerSitSpotRegistered) {
      const sitSpot = engine.getEntityOrNullByName(EntityNames.Sit_Spot__Fortune_Teller)
      if (sitSpot !== null) {
        fortuneTellerSitSpotRegistered = true
        fortuneTellerSitSpotEntity = sitSpot
        registerFortuneTellerSitSpotHandlers(sitSpot)
      }
    } else if (fortuneTellerSitSpotEntity !== null) {
      stripSitSpotFortuneTellerProximityUi(fortuneTellerSitSpotEntity)
    }

    const localUserIdForSitSpot = getPlayer()?.userId ?? null
    if (fortuneTellerSitSpotEntity !== null) {
      const hoverText = getFortuneTellerSitSpotHoverText(localUserIdForSitSpot)
      if (hoverText !== lastFortuneTellerSitSpotHoverText) {
        lastFortuneTellerSitSpotHoverText = hoverText
        setPointerHoverText(fortuneTellerSitSpotEntity, hoverText)
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
      gameData.fortuneTellerTimeRemainingSec = remainingSecTarget

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
    if (!playerStillAtFortuneTellerStation(current) && !isLeaveRoleDialogVisible()) {
      const wasSitSpotFt = fortuneTellerJoinedViaSitSpot
      showLeaveRoleDialog(
        'Fortune Teller',
        () => {
          // Cancela lectura / FSM en curso; luego se libera el rol FT y el banner (clearFortuneTeller…).
          fortuneMessageBus.emit('hide-fortune', {})
          clearFortuneTellerAndShowWizard()
          displacePlayerToRandomLeaveArea()
        },
        () => {
          fortuneTellerBecameAtMs = Date.now()
          sitSpotFtTeleportPending = true
          const ftSeatPos = getFortuneTellerSeatPosition()
          executeTask(async () => {
            try {
              await movePlayerTo({
                newRelativePosition: { x: ftSeatPos.x, y: ftSeatPos.y, z: ftSeatPos.z },
                cameraTarget: {
                  x: FORTUNE_TELLER_CAMERA_TARGET.x,
                  y: FORTUNE_TELLER_CAMERA_TARGET.y,
                  z: FORTUNE_TELLER_CAMERA_TARGET.z
                }
              })
              if (fortuneTellerJoinedViaSitSpot) {
                await triggerEmote({ predefinedEmote: 'sittingChair1' })
              }
            } catch (_e) {
            } finally {
              sitSpotFtTeleportPending = false
            }
            InputModifier.createOrReplace(engine.PlayerEntity, {
              mode: InputModifier.Mode.Standard({
                disableWalk: true,
                disableRun: true,
                disableJump: true
              })
            })
          })
        }
      )
    }
  })
}
