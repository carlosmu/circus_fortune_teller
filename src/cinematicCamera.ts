import { engine, Transform, VirtualCamera, MainCamera } from '@dcl/sdk/ecs'
import { Vector3, Quaternion } from '@dcl/sdk/math'
import { TABLE, WIZARD, FORTUNE_TELLER_POSITION } from './scene'
import { gameData } from './gameState'

type Vec3 = { x: number; y: number; z: number }

export const CINEMATIC_CONFIG = {
  /** Short, local transition before the orbit. */
  blendDuration: 3.2,
  /** Main orbit duration. */
  duration: 2.2,
  /** Keep last frame briefly before returning camera. */
  settleDuration: 0.3,
  /** Final orbit radius around table center. */
  radius: 5.5,
  /** Final orbit camera height. */
  height: 2.2,
  /** Smoothing for look direction, lower = smoother. */
  rotationDamping: 0.2,
  /** UI bars animation. */
  barsFadeIn: 0.6,
  barsFadeOut: 0.5,
  /** Wizard-front framing. */
  wizardFrontDistance: 5.8,
  wizardLookHeight: 1.8,
  /** Start frame offset from wizard position (matches requested framing). */
  wizardStartOffsetX: 0,
  wizardStartOffsetY: 1,
  wizardStartOffsetZ: 4.5,
  /** Start look target offset from wizard position. */
  wizardTargetOffsetX: 0,
  wizardTargetOffsetY: 2,
  wizardTargetOffsetZ: 0.5,
  /** Pre-orbit local offset (small movement only). */
  preOrbitRadiusFactor: 1.1,
  preOrbitHeightOffset: 0.25,
  preOrbitAngleOffset: 0.2,
  /** How much the short blend approaches orbit start (0..1). */
  blendToOrbitFactor: 0.35,
  /** Smoothly move look target from wizard to table center. */
  orbitLookBlendDuration: 1.1,
  /** Reveal-fortune closeup timings. */
  revealBlendInDuration: 2.0,
  /** Seconds to hold on fortune teller after fortune is revealed before blending out. */
  revealPostRevealDelay: 2.5,
  revealBlendOutDuration: 2.8,
  /** Extra smoothing only for reveal closeup phases. */
  revealRotationDamping: 0.08,
  /** Reveal closeup offsets from FORTUNE_TELLER_POSITION. */
  revealCamOffsetX: 0,
  revealCamOffsetY: 1,
  revealCamOffsetZ: 4.5,
  revealTargetOffsetX: 0,
  revealTargetOffsetY: 2,
  revealTargetOffsetZ: 0
}

/**
 * Cinemática host: pivote en el centro de la mesa, hijo con offset; rotación del padre 90° con ease-in-out.
 * Coordenadas de escena: X 0→16 izquierda a derecha, Z 0→16 arriba a abajo; mesa ~(8, 8).
 */
export const HOST_PIVOT_CINEMATIC_CONFIG = {
  /** X >= umbral: arco lado derecho (yaw 0 to 90 deg, CCW desde arriba). X < umbral: espejo (180 to 90 deg). */
  xThreshold: 8,
  /** Radio horizontal de la órbita (metros). */
  radius: 6,
  /** Altura local Y del hijo al inicio del arco (interpola hacia cameraHeightEnd). */
  cameraHeightStart: 4,
  /** Altura local Y del hijo al final del arco. */
  cameraHeightEnd: 2,
  /** Punto de mira en el centro del pivote, altura local Y. */
  lookTargetY: 1.5,
  /** Duración del barrido de 90° (segundos). */
  duration: 2.8
}

export let cinematicBarAlpha = 0
export let cinematicActive = false

let camEntity: ReturnType<typeof engine.addEntity> | null = null
let isBlending = false
let isOrbiting = false
let isSettling = false

let blendElapsed = 0
let orbitElapsed = 0
let settleElapsed = 0

let pivot: Vec3 = { x: 8, y: 0, z: 8 }
let blendStartPos: Vec3 = { x: 8, y: 2.2, z: 5 }
let blendEndPos: Vec3 = { x: 8, y: 2.2, z: 5 }
let wizardLookTarget: Vec3 = { x: 8, y: 1.4, z: 5.5 }

let startAngle = 0
let endAngle = 0
let completeCb: (() => void) | null = null
let smoothedLookDir: Vec3 = { x: 0, y: 0, z: 1 }
let cinematicMode: 'none' | 'orbit' | 'reveal' | 'hostPivotArc' = 'none'

let revealPhase: 'blend-in' | 'hold' | 'blend-out' = 'blend-in'
let revealElapsed = 0
let revealStartPos: Vec3 = { x: 8, y: 1, z: 10 }
let revealClosePos: Vec3 = { x: 8, y: 2, z: 8 }
let revealLookTarget: Vec3 = { x: 8, y: 2, z: 6 }
let revealReturnLookTarget: Vec3 = { x: 8, y: 1, z: 7 }
let revealStartLookDir: Vec3 = { x: 0, y: 0, z: 1 }

let hostPivotPivotEnt: ReturnType<typeof engine.addEntity> | null = null
let hostPivotCamEnt: ReturnType<typeof engine.addEntity> | null = null
let hostPivotElapsed = 0
let hostPivotYawStart = 0
let hostPivotYawEnd = 90
let hostPivotCompleteCb: (() => void) | null = null

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v))
}

function smootherstep(t: number): number {
  const c = clamp01(t)
  return c * c * c * (c * (c * 6 - 15) + 10)
}

/** Ease-in-out cuadrático (cinemática host). */
function easeInOutQuad(t: number): number {
  const c = clamp01(t)
  return c < 0.5 ? 2 * c * c : 1 - Math.pow(-2 * c + 2, 2) / 2
}

function easeOutQuint(t: number): number {
  const c = 1 - clamp01(t)
  return 1 - c * c * c * c * c
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function lerpVec(a: Vec3, b: Vec3, t: number): Vec3 {
  return {
    x: lerp(a.x, b.x, t),
    y: lerp(a.y, b.y, t),
    z: lerp(a.z, b.z, t)
  }
}

function normalize(v: Vec3): Vec3 {
  const m = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z)
  if (m < 1e-5) return { x: 0, y: 0, z: 1 }
  return { x: v.x / m, y: v.y / m, z: v.z / m }
}

function lookDir(from: Vec3, to: Vec3): Vec3 {
  return normalize({ x: to.x - from.x, y: to.y - from.y, z: to.z - from.z })
}

/** Posición local del hijo (radio, Y, 0) y rotación hacia (0, lookTargetY, 0) en espacio del pivote. */
function setHostPivotCameraLocalPose(
  cfg: typeof HOST_PIVOT_CINEMATIC_CONFIG,
  cam: ReturnType<typeof engine.addEntity>,
  heightY: number
): void {
  const lx = cfg.radius
  const ly = heightY
  const lz = 0
  const lookForward = normalize({
    x: -lx,
    y: cfg.lookTargetY - ly,
    z: -lz
  })
  const tr = Transform.getMutable(cam)
  tr.position.x = lx
  tr.position.y = ly
  tr.position.z = lz
  tr.rotation = Quaternion.lookRotation(Vector3.create(lookForward.x, lookForward.y, lookForward.z))
}

function getOrCreateCamEntity(): ReturnType<typeof engine.addEntity> {
  if (camEntity !== null) return camEntity
  const e = engine.addEntity()
  Transform.create(e, {
    position: Vector3.create(8, CINEMATIC_CONFIG.height, 4.5),
    rotation: Quaternion.fromEulerDegrees(0, 0, 0)
  })
  VirtualCamera.create(e, {
    defaultTransition: { transitionMode: VirtualCamera.Transition.Speed(20) }
  })
  camEntity = e
  return e
}

function getWizardInfo(fallbackPivot: Vec3): {
  frontAngle: number
  lookTarget: Vec3
  startPos: Vec3
} {
  if (!Transform.has(WIZARD)) {
    const startPos = { x: 8, y: 1, z: 10 }
    const lookTarget = { x: 8, y: 2, z: 6 }
    return {
      frontAngle: Math.atan2(startPos.z - fallbackPivot.z, startPos.x - fallbackPivot.x),
      startPos,
      lookTarget
    }
  }

  const wizard = Transform.get(WIZARD)
  const wPos = wizard.position
  const fwdRaw = Vector3.rotate(Vector3.Forward(), wizard.rotation)
  const fwd = normalize({ x: fwdRaw.x, y: 0, z: fwdRaw.z })
  const frontPos = {
    x: wPos.x - fwd.x * CINEMATIC_CONFIG.wizardFrontDistance,
    y: wPos.y + CINEMATIC_CONFIG.height,
    z: wPos.z - fwd.z * CINEMATIC_CONFIG.wizardFrontDistance
  }

  const startPos = {
    x: wPos.x + CINEMATIC_CONFIG.wizardStartOffsetX,
    y: wPos.y + CINEMATIC_CONFIG.wizardStartOffsetY,
    z: wPos.z + CINEMATIC_CONFIG.wizardStartOffsetZ
  }
  const lookTarget = {
    x: wPos.x + CINEMATIC_CONFIG.wizardTargetOffsetX,
    y: wPos.y + CINEMATIC_CONFIG.wizardTargetOffsetY,
    z: wPos.z + CINEMATIC_CONFIG.wizardTargetOffsetZ
  }

  return {
    frontAngle: Math.atan2(startPos.z - fallbackPivot.z, startPos.x - fallbackPivot.x),
    startPos,
    lookTarget
  }
}

function ensureHostPivotRig(): void {
  const cfg = HOST_PIVOT_CINEMATIC_CONFIG
  if (hostPivotPivotEnt !== null && hostPivotCamEnt !== null) return

  const pivot = engine.addEntity()
  const cam = engine.addEntity()
  hostPivotPivotEnt = pivot
  hostPivotCamEnt = cam

  Transform.create(pivot, {
    position: Vector3.create(0, 0, 0),
    rotation: Quaternion.fromEulerDegrees(0, 0, 0),
    parent: TABLE
  })

  Transform.create(cam, {
    position: Vector3.create(cfg.radius, cfg.cameraHeightStart, 0),
    rotation: Quaternion.fromEulerDegrees(0, 0, 0),
    parent: pivot
  })

  VirtualCamera.create(cam, {
    defaultTransition: { transitionMode: VirtualCamera.Transition.Speed(20) }
  })

  setHostPivotCameraLocalPose(cfg, cam, cfg.cameraHeightStart)
}

/**
 * Cinemática al convertirse en Host (solo cliente que hace clic): pivote en la mesa, hijo con VirtualCamera,
 * rotación del padre 90° con ease-in-out; la cámara mira el centro del pivote (mesa).
 * X >= xThreshold: yaw 0 to 90 (CCW from above). X < xThreshold: 180 to 90 (mirrored arc).
 */
export function startHostCinematicCamera(playerPos: Vec3, onComplete?: () => void): void {
  ensureHostPivotRig()
  const pivot = hostPivotPivotEnt!
  const cam = hostPivotCamEnt!
  const cfg = HOST_PIVOT_CINEMATIC_CONFIG

  if (playerPos.x >= cfg.xThreshold) {
    hostPivotYawStart = 60
    hostPivotYawEnd = 90
  } else {
    hostPivotYawStart = 120
    hostPivotYawEnd = 90
  }

  hostPivotElapsed = 0
  hostPivotCompleteCb = onComplete ?? null
  cinematicMode = 'hostPivotArc'
  cinematicActive = true
  isBlending = false
  isOrbiting = false
  isSettling = false
  completeCb = null

  const ptr = Transform.getMutable(pivot)
  ptr.rotation = Quaternion.fromEulerDegrees(0, hostPivotYawStart, 0)
  setHostPivotCameraLocalPose(cfg, cam, cfg.cameraHeightStart)

  if (MainCamera.has(engine.CameraEntity)) {
    MainCamera.getMutable(engine.CameraEntity).virtualCameraEntity = cam
  }
}

export function startOrbitCinematic(pivotPos: Vec3, finalPos: Vec3, onComplete: () => void): void {
  const e = getOrCreateCamEntity()
  pivot = { ...pivotPos }
  completeCb = onComplete
  cinematicActive = true
  isBlending = true
  isOrbiting = false
  isSettling = false
  cinematicMode = 'orbit'
  blendElapsed = 0
  orbitElapsed = 0
  settleElapsed = 0

  const wizardInfo = getWizardInfo(pivotPos)
  wizardLookTarget = wizardInfo.lookTarget
  startAngle = wizardInfo.frontAngle
  endAngle = Math.atan2(finalPos.z - pivotPos.z, finalPos.x - pivotPos.x)

  // Instant 1-frame reposition to requested wizard framing.
  blendStartPos = { ...wizardInfo.startPos }
  const orbitStartPos = {
    x: pivot.x + Math.cos(startAngle) * CINEMATIC_CONFIG.radius,
    y: CINEMATIC_CONFIG.height,
    z: pivot.z + Math.sin(startAngle) * CINEMATIC_CONFIG.radius
  }
  // Keep a short, controlled transition before entering full orbit.
  blendEndPos = lerpVec(blendStartPos, orbitStartPos, CINEMATIC_CONFIG.blendToOrbitFactor)

  smoothedLookDir = lookDir(blendStartPos, wizardLookTarget)
  if (Transform.has(e)) {
    const tr = Transform.getMutable(e)
    tr.position = Vector3.create(blendStartPos.x, blendStartPos.y, blendStartPos.z)
    tr.rotation = Quaternion.lookRotation(
      Vector3.create(smoothedLookDir.x, smoothedLookDir.y, smoothedLookDir.z)
    )
  }

  if (MainCamera.has(engine.CameraEntity)) {
    MainCamera.getMutable(engine.CameraEntity).virtualCameraEntity = e
  }
}

export function startRevealFortuneCinematic(): void {
  if (cinematicMode === 'reveal') return
  const e = getOrCreateCamEntity()
  if (!Transform.has(engine.CameraEntity)) return

  const currentCam = Transform.get(engine.CameraEntity)
  revealStartPos = {
    x: currentCam.position.x,
    y: currentCam.position.y,
    z: currentCam.position.z
  }
  const currentFwd = Vector3.rotate(Vector3.Forward(), currentCam.rotation)
  revealStartLookDir = normalize({ x: currentFwd.x, y: currentFwd.y, z: currentFwd.z })
  revealReturnLookTarget = {
    x: revealStartPos.x + revealStartLookDir.x * 4,
    y: revealStartPos.y + revealStartLookDir.y * 4,
    z: revealStartPos.z + revealStartLookDir.z * 4
  }

  // Always use fixed fortune teller spot for reveal closeup, independent from wizard mesh.
  const ftPos = FORTUNE_TELLER_POSITION
  revealClosePos = {
    x: ftPos.x + CINEMATIC_CONFIG.revealCamOffsetX,
    y: ftPos.y + CINEMATIC_CONFIG.revealCamOffsetY,
    z: ftPos.z + CINEMATIC_CONFIG.revealCamOffsetZ
  }
  revealLookTarget = {
    x: ftPos.x + CINEMATIC_CONFIG.revealTargetOffsetX,
    y: ftPos.y + CINEMATIC_CONFIG.revealTargetOffsetY,
    z: ftPos.z + CINEMATIC_CONFIG.revealTargetOffsetZ
  }

  revealPhase = 'blend-in'
  revealElapsed = 0
  cinematicMode = 'reveal'
  cinematicActive = true
  isBlending = false
  isOrbiting = false
  isSettling = false
  completeCb = null
  smoothedLookDir = revealStartLookDir

  const tr = Transform.getMutable(e)
  tr.position = Vector3.create(revealStartPos.x, revealStartPos.y, revealStartPos.z)
  tr.rotation = currentCam.rotation

  if (MainCamera.has(engine.CameraEntity)) {
    MainCamera.getMutable(engine.CameraEntity).virtualCameraEntity = e
  }
}

export function stopOrbitCinematic(): void {
  if (!cinematicActive) return
  isBlending = false
  isOrbiting = false
  isSettling = false
  cinematicMode = 'none'
  cinematicActive = false
  completeCb = null
  hostPivotCompleteCb = null
  hostPivotElapsed = 0
  if (MainCamera.has(engine.CameraEntity)) {
    MainCamera.getMutable(engine.CameraEntity).virtualCameraEntity = undefined
  }
}

export function setupCinematicCamera(): void {
  engine.addSystem((dt: number) => {
    if (cinematicActive) {
      cinematicBarAlpha = Math.min(1, cinematicBarAlpha + dt / CINEMATIC_CONFIG.barsFadeIn)
    } else if (cinematicBarAlpha > 0) {
      cinematicBarAlpha = Math.max(0, cinematicBarAlpha - dt / CINEMATIC_CONFIG.barsFadeOut)
    }

    if (
      cinematicActive &&
      cinematicMode === 'hostPivotArc' &&
      hostPivotPivotEnt !== null &&
      hostPivotCamEnt !== null
    ) {
      const cfg = HOST_PIVOT_CINEMATIC_CONFIG
      hostPivotElapsed += dt
      const rawT = clamp01(hostPivotElapsed / cfg.duration)
      const t = easeInOutQuad(rawT)
      const yaw = lerp(hostPivotYawStart, hostPivotYawEnd, t)
      const camH = lerp(cfg.cameraHeightStart, cfg.cameraHeightEnd, t)
      const ptr = Transform.getMutable(hostPivotPivotEnt)
      ptr.rotation = Quaternion.fromEulerDegrees(0, yaw, 0)
      setHostPivotCameraLocalPose(cfg, hostPivotCamEnt, camH)

      if (rawT >= 1) {
        cinematicMode = 'none'
        cinematicActive = false
        if (MainCamera.has(engine.CameraEntity)) {
          MainCamera.getMutable(engine.CameraEntity).virtualCameraEntity = undefined
        }
        const cb = hostPivotCompleteCb
        hostPivotCompleteCb = null
        if (cb) cb()
      }
      return
    }

    if (!cinematicActive || camEntity === null) return

    const tableLookTarget: Vec3 = { x: pivot.x, y: 1, z: pivot.z }

    if (cinematicMode === 'reveal') {
      const tr = Transform.getMutable(camEntity)
      if (revealPhase === 'blend-in') {
        revealElapsed += dt
        const t = smootherstep(clamp01(revealElapsed / CINEMATIC_CONFIG.revealBlendInDuration))
        const pos = lerpVec(revealStartPos, revealClosePos, t)
        const targetDir = lookDir(pos, revealLookTarget)
        smoothedLookDir = normalize(lerpVec(smoothedLookDir, targetDir, CINEMATIC_CONFIG.revealRotationDamping))
        tr.position.x = pos.x
        tr.position.y = pos.y
        tr.position.z = pos.z
        tr.rotation = Quaternion.lookRotation(
          Vector3.create(smoothedLookDir.x, smoothedLookDir.y, smoothedLookDir.z)
        )
        if (t >= 1) {
          revealPhase = 'hold'
          revealElapsed = 0
        }
        return
      }

      if (revealPhase === 'hold') {
        const targetDir = lookDir(revealClosePos, revealLookTarget)
        smoothedLookDir = normalize(lerpVec(smoothedLookDir, targetDir, CINEMATIC_CONFIG.revealRotationDamping))
        tr.position.x = revealClosePos.x
        tr.position.y = revealClosePos.y
        tr.position.z = revealClosePos.z
        tr.rotation = Quaternion.lookRotation(
          Vector3.create(smoothedLookDir.x, smoothedLookDir.y, smoothedLookDir.z)
        )
        const fortuneRevealed = gameData.gameState === 'MOSTRANDO_FORTUNA'
        if (fortuneRevealed) {
          // Start counting post-reveal delay from the moment fortune was revealed.
          revealElapsed += dt
          if (revealElapsed >= CINEMATIC_CONFIG.revealPostRevealDelay) {
            revealPhase = 'blend-out'
            revealElapsed = 0
          }
        } else {
          // Fortune not yet revealed — reset counter so delay is always measured from revelation.
          revealElapsed = 0
        }
        return
      }

      revealElapsed += dt
      const t = smootherstep(clamp01(revealElapsed / CINEMATIC_CONFIG.revealBlendOutDuration))
      const pos = lerpVec(revealClosePos, revealStartPos, t)
      const outLook = lerpVec(revealLookTarget, revealReturnLookTarget, t)
      const targetDir = lookDir(pos, outLook)
      smoothedLookDir = normalize(lerpVec(smoothedLookDir, targetDir, CINEMATIC_CONFIG.revealRotationDamping))
      tr.position.x = pos.x
      tr.position.y = pos.y
      tr.position.z = pos.z
      tr.rotation = Quaternion.lookRotation(
        Vector3.create(smoothedLookDir.x, smoothedLookDir.y, smoothedLookDir.z)
      )
      if (t >= 1) {
        cinematicMode = 'none'
        cinematicActive = false
        if (MainCamera.has(engine.CameraEntity)) {
          MainCamera.getMutable(engine.CameraEntity).virtualCameraEntity = undefined
        }
      }
      return
    }

    if (isBlending) {
      blendElapsed += dt
      const t = smootherstep(clamp01(blendElapsed / CINEMATIC_CONFIG.blendDuration))
      const pos = lerpVec(blendStartPos, blendEndPos, t)
      const targetDir = lookDir(pos, wizardLookTarget)
      smoothedLookDir = normalize(lerpVec(smoothedLookDir, targetDir, CINEMATIC_CONFIG.rotationDamping))

      const tr = Transform.getMutable(camEntity)
      tr.position.x = pos.x
      tr.position.y = pos.y
      tr.position.z = pos.z
      tr.rotation = Quaternion.lookRotation(
        Vector3.create(smoothedLookDir.x, smoothedLookDir.y, smoothedLookDir.z)
      )

      if (t >= 1) {
        isBlending = false
        isOrbiting = true
        orbitElapsed = 0
      }
      return
    }

    if (isOrbiting) {
      orbitElapsed += dt
      const raw = clamp01(orbitElapsed / CINEMATIC_CONFIG.duration)
      const t = easeOutQuint(raw)
      const angle = startAngle + (endAngle - startAngle) * t
      const x = pivot.x + Math.cos(angle) * CINEMATIC_CONFIG.radius
      const z = pivot.z + Math.sin(angle) * CINEMATIC_CONFIG.radius

      const lookT = smootherstep(clamp01(orbitElapsed / CINEMATIC_CONFIG.orbitLookBlendDuration))
      const dynamicLook = lerpVec(wizardLookTarget, tableLookTarget, lookT)
      const targetDir = lookDir({ x, y: CINEMATIC_CONFIG.height, z }, dynamicLook)
      smoothedLookDir = normalize(lerpVec(smoothedLookDir, targetDir, CINEMATIC_CONFIG.rotationDamping))

      const tr = Transform.getMutable(camEntity)
      tr.position.x = x
      tr.position.y = CINEMATIC_CONFIG.height
      tr.position.z = z
      tr.rotation = Quaternion.lookRotation(
        Vector3.create(smoothedLookDir.x, smoothedLookDir.y, smoothedLookDir.z)
      )

      if (raw >= 1) {
        isOrbiting = false
        isSettling = true
        settleElapsed = 0
      }
      return
    }

    if (isSettling) {
      settleElapsed += dt
      const finalX = pivot.x + Math.cos(endAngle) * CINEMATIC_CONFIG.radius
      const finalZ = pivot.z + Math.sin(endAngle) * CINEMATIC_CONFIG.radius
      const targetDir = lookDir({ x: finalX, y: CINEMATIC_CONFIG.height, z: finalZ }, tableLookTarget)
      smoothedLookDir = normalize(lerpVec(smoothedLookDir, targetDir, CINEMATIC_CONFIG.rotationDamping))

      const tr = Transform.getMutable(camEntity)
      tr.position.x = finalX
      tr.position.y = CINEMATIC_CONFIG.height
      tr.position.z = finalZ
      tr.rotation = Quaternion.lookRotation(
        Vector3.create(smoothedLookDir.x, smoothedLookDir.y, smoothedLookDir.z)
      )

      if (settleElapsed >= CINEMATIC_CONFIG.settleDuration) {
        isSettling = false
        cinematicActive = false
        if (MainCamera.has(engine.CameraEntity)) {
          MainCamera.getMutable(engine.CameraEntity).virtualCameraEntity = undefined
        }
        const cb = completeCb
        completeCb = null
        if (cb) cb()
      }
    }
  })
}
