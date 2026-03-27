import { engine, Transform, VirtualCamera, MainCamera } from '@dcl/sdk/ecs'
import { Vector3, Quaternion } from '@dcl/sdk/math'

// ─── Configuration ────────────────────────────────────────────────────────────

/** Tweak these values to adjust the cinematic feel. */
export const CINEMATIC_CONFIG = {
  /** Total duration of the orbit arc in seconds. */
  duration: 4.0,
  /** Extra seconds the camera holds at the final position before releasing. */
  settleDuration: 0.1,
  /** Distance from the pivot point (table center) at which the camera orbits. */
  radius: 3.5,
  /** Camera height above ground during the orbit. */
  height: 2.2,
  /**
   * Arc swept in radians. Math.PI = 180°, Math.PI * 1.5 = 270°.
   * The camera always ends at the angle corresponding to the host position,
   * sweeping this many radians backwards to reach it.
   */
  sweepRadians: Math.PI,
  /** Rotation damping factor (0–1). Lower = smoother but laggier. 1 = instant. */
  rotationDamping: 0.08,
  /** Letterbox bar fade-in duration in seconds. */
  barsFadeIn: 0.6,
  /** Letterbox bar fade-out duration in seconds. */
  barsFadeOut: 0.5,
}

// ─── Exported reactive state (read by UI) ─────────────────────────────────────

/** Current alpha for the letterbox bars (0 = hidden, 1 = fully opaque). */
export let cinematicBarAlpha = 0

/** Whether a cinematic is currently running (orbit + settle). */
export let cinematicActive = false

// ─── Internal state ───────────────────────────────────────────────────────────

type Vec3 = { x: number; y: number; z: number }

let camEntity: ReturnType<typeof engine.addEntity> | null = null
let isOrbiting = false
let isSettling = false
let elapsed = 0
let settleElapsed = 0
let startAngle = 0
let endAngle = 0
let pivot: Vec3 = { x: 8, y: 0, z: 8 }
let completeCb: (() => void) | null = null

let dampedYaw = 0
let dampedPitch = 0

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Quintic ease-out: extremely gentle deceleration towards the end.
 * `f(t) = 1 − (1−t)^5`
 */
function easeOutQuint(t: number): number {
  const c = 1 - Math.max(0, Math.min(1, t))
  return 1 - c * c * c * c * c
}

/**
 * Computes yaw/pitch (in degrees) from `from` looking toward `to`.
 */
function lookAtAngles(from: Vec3, to: Vec3): { yaw: number; pitch: number } {
  const dx = to.x - from.x
  const dz = to.z - from.z
  const dy = to.y - from.y
  const horizDist = Math.sqrt(dx * dx + dz * dz)
  const yaw = Math.atan2(dx, dz) * (180 / Math.PI)
  const pitch = -Math.atan2(dy, horizDist) * (180 / Math.PI)
  return { yaw, pitch }
}

/**
 * Returns the shortest angular difference in degrees, normalised to [-180, 180].
 */
function angleDiffDeg(from: number, to: number): number {
  let d = (to - from) % 360
  if (d > 180) d -= 360
  if (d < -180) d += 360
  return d
}

/** Returns the virtual camera entity, creating it if needed. */
function getOrCreateCamEntity(): ReturnType<typeof engine.addEntity> {
  if (camEntity !== null) return camEntity
  const e = engine.addEntity()
  Transform.create(e, {
    position: Vector3.create(8, CINEMATIC_CONFIG.height, 4.5),
    rotation: Quaternion.fromEulerDegrees(0, 0, 0)
  })
  VirtualCamera.create(e, {
    defaultTransition: {
      transitionMode: VirtualCamera.Transition.Speed(20)
    }
  })
  camEntity = e
  return e
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Starts the orbit cinematic with letterbox bars.
 *
 * @param pivotPos   - Center of the orbit (e.g. table center at ground level).
 * @param finalPos   - World position where the camera ends (e.g. HOST_POSITION).
 * @param onComplete - Called when the full animation (orbit + settle) finishes.
 */
export function startOrbitCinematic(
  pivotPos: Vec3,
  finalPos: Vec3,
  onComplete: () => void
): void {
  const e = getOrCreateCamEntity()
  pivot = { ...pivotPos }

  endAngle = Math.atan2(finalPos.z - pivotPos.z, finalPos.x - pivotPos.x)
  startAngle = endAngle + CINEMATIC_CONFIG.sweepRadians

  elapsed = 0
  settleElapsed = 0
  isOrbiting = true
  isSettling = false
  cinematicActive = true
  completeCb = onComplete

  const sx = pivotPos.x + Math.cos(startAngle) * CINEMATIC_CONFIG.radius
  const sz = pivotPos.z + Math.sin(startAngle) * CINEMATIC_CONFIG.radius
  const lookTarget: Vec3 = { x: pivotPos.x, y: 1, z: pivotPos.z }
  const initAngles = lookAtAngles({ x: sx, y: CINEMATIC_CONFIG.height, z: sz }, lookTarget)
  dampedYaw = initAngles.yaw
  dampedPitch = initAngles.pitch

  if (Transform.has(e)) {
    const tr = Transform.getMutable(e)
    tr.position = Vector3.create(sx, CINEMATIC_CONFIG.height, sz)
    tr.rotation = Quaternion.fromEulerDegrees(dampedPitch, dampedYaw, 0)
  }

  if (MainCamera.has(engine.CameraEntity)) {
    MainCamera.getMutable(engine.CameraEntity).virtualCameraEntity = e
  }
}

/**
 * Immediately stops the cinematic and returns control to the player camera.
 * Safe to call even when no cinematic is running.
 */
export function stopOrbitCinematic(): void {
  if (!cinematicActive) return
  isOrbiting = false
  isSettling = false
  cinematicActive = false
  completeCb = null
  if (MainCamera.has(engine.CameraEntity)) {
    MainCamera.getMutable(engine.CameraEntity).virtualCameraEntity = undefined
  }
}

/**
 * Registers the ECS system that drives the orbit animation.
 * Must be called once during scene setup (e.g. from `setupWizard`).
 */
export function setupCinematicCamera(): void {
  engine.addSystem((dt: number) => {
    // ── Letterbox bar alpha ───────────────────────────────────────────────
    if (cinematicActive) {
      cinematicBarAlpha = Math.min(1, cinematicBarAlpha + dt / CINEMATIC_CONFIG.barsFadeIn)
    } else if (cinematicBarAlpha > 0) {
      cinematicBarAlpha = Math.max(0, cinematicBarAlpha - dt / CINEMATIC_CONFIG.barsFadeOut)
    }

    if (!cinematicActive || camEntity === null) return

    const lookTarget: Vec3 = { x: pivot.x, y: 1, z: pivot.z }

    // ── Phase 1: Orbit ────────────────────────────────────────────────────
    if (isOrbiting) {
      elapsed += dt
      const raw = Math.min(elapsed / CINEMATIC_CONFIG.duration, 1)
      const t = easeOutQuint(raw)

      const angle = startAngle + (endAngle - startAngle) * t
      const x = pivot.x + Math.cos(angle) * CINEMATIC_CONFIG.radius
      const z = pivot.z + Math.sin(angle) * CINEMATIC_CONFIG.radius

      const targetAngles = lookAtAngles({ x, y: CINEMATIC_CONFIG.height, z }, lookTarget)
      const damping = CINEMATIC_CONFIG.rotationDamping
      dampedYaw += angleDiffDeg(dampedYaw, targetAngles.yaw) * damping
      dampedPitch += (targetAngles.pitch - dampedPitch) * damping

      if (Transform.has(camEntity)) {
        const tr = Transform.getMutable(camEntity)
        tr.position.x = x
        tr.position.y = CINEMATIC_CONFIG.height
        tr.position.z = z
        tr.rotation = Quaternion.fromEulerDegrees(dampedPitch, dampedYaw, 0)
      }

      if (raw >= 1) {
        isOrbiting = false
        isSettling = true
        settleElapsed = 0
      }
      return
    }

    // ── Phase 2: Settle (hold at final position, let damping catch up) ──
    if (isSettling) {
      settleElapsed += dt
      const finalX = pivot.x + Math.cos(endAngle) * CINEMATIC_CONFIG.radius
      const finalZ = pivot.z + Math.sin(endAngle) * CINEMATIC_CONFIG.radius

      const targetAngles = lookAtAngles(
        { x: finalX, y: CINEMATIC_CONFIG.height, z: finalZ },
        lookTarget
      )
      const damping = CINEMATIC_CONFIG.rotationDamping
      dampedYaw += angleDiffDeg(dampedYaw, targetAngles.yaw) * damping
      dampedPitch += (targetAngles.pitch - dampedPitch) * damping

      if (Transform.has(camEntity)) {
        const tr = Transform.getMutable(camEntity)
        tr.position.x = finalX
        tr.position.y = CINEMATIC_CONFIG.height
        tr.position.z = finalZ
        tr.rotation = Quaternion.fromEulerDegrees(dampedPitch, dampedYaw, 0)
      }

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
