import { engine, Transform, VirtualCamera, MainCamera } from '@dcl/sdk/ecs'
import { Vector3, Quaternion } from '@dcl/sdk/math'
import { WIZARD } from './scene'

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
  orbitLookBlendDuration: 1.1
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

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v))
}

function smootherstep(t: number): number {
  const c = clamp01(t)
  return c * c * c * (c * (c * 6 - 15) + 10)
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

export function startOrbitCinematic(pivotPos: Vec3, finalPos: Vec3, onComplete: () => void): void {
  const e = getOrCreateCamEntity()
  pivot = { ...pivotPos }
  completeCb = onComplete
  cinematicActive = true
  isBlending = true
  isOrbiting = false
  isSettling = false
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

export function stopOrbitCinematic(): void {
  if (!cinematicActive) return
  isBlending = false
  isOrbiting = false
  isSettling = false
  cinematicActive = false
  completeCb = null
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

    if (!cinematicActive || camEntity === null) return

    const tableLookTarget: Vec3 = { x: pivot.x, y: 1, z: pivot.z }

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
