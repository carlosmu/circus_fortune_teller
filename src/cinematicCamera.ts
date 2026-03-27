import { engine, Transform, VirtualCamera, MainCamera } from '@dcl/sdk/ecs'
import { Vector3, Quaternion } from '@dcl/sdk/math'

// ─── Configuration ────────────────────────────────────────────────────────────

/** Tweak these values to adjust the cinematic feel. */
export const CINEMATIC_CONFIG = {
  /** Total duration of the orbit animation in seconds. */
  duration: 3.0,
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
} as const

// ─── Internal state ───────────────────────────────────────────────────────────

type Vec3 = { x: number; y: number; z: number }

let camEntity: ReturnType<typeof engine.addEntity> | null = null
let isActive = false
let elapsed = 0
let startAngle = 0
let endAngle = 0
let pivot: Vec3 = { x: 8, y: 0, z: 8 }
let completeCb: (() => void) | null = null

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Smoothstep easing: gradual start and gradual end (ease-in-out). */
function smoothstep(t: number): number {
  const c = Math.max(0, Math.min(1, t))
  return c * c * (3 - 2 * c)
}

/**
 * Computes a quaternion that orients an object at `from` to look toward `to`.
 * Uses yaw + pitch decomposition via `Quaternion.fromEulerDegrees`, which is
 * reliably available in all SDK7 versions.
 */
function lookAt(from: Vec3, to: Vec3): ReturnType<typeof Quaternion.fromEulerDegrees> {
  const dx = to.x - from.x
  const dz = to.z - from.z
  const dy = to.y - from.y
  const horizDist = Math.sqrt(dx * dx + dz * dz)
  const yaw = Math.atan2(dx, dz) * (180 / Math.PI)
  const pitch = -Math.atan2(dy, horizDist) * (180 / Math.PI)
  return Quaternion.fromEulerDegrees(pitch, yaw, 0)
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
 * Starts the orbit cinematic.
 *
 * The camera sweeps `CINEMATIC_CONFIG.sweepRadians` around `pivotPos`,
 * ending at the angle that corresponds to `finalPos`. The player can be
 * silently teleported while the cinematic is running.
 *
 * @param pivotPos   - Center of the orbit (e.g. table center at ground level).
 * @param finalPos   - World position where the camera ends (e.g. HOST_POSITION).
 * @param onComplete - Called when the animation finishes and the virtual camera
 *                     is deactivated.
 */
export function startOrbitCinematic(
  pivotPos: Vec3,
  finalPos: Vec3,
  onComplete: () => void
): void {
  const e = getOrCreateCamEntity()
  pivot = { ...pivotPos }

  // The orbit ends at the angle that places the camera over `finalPos`.
  endAngle = Math.atan2(finalPos.z - pivotPos.z, finalPos.x - pivotPos.x)
  // Start the sweep `sweepRadians` ahead (clockwise), so we always reach the
  // host angle after a full cinematic arc.
  startAngle = endAngle + CINEMATIC_CONFIG.sweepRadians

  elapsed = 0
  isActive = true
  completeCb = onComplete

  // Position the virtual camera at the orbit start before activating it to
  // minimise the initial transition jump.
  const sx = pivotPos.x + Math.cos(startAngle) * CINEMATIC_CONFIG.radius
  const sz = pivotPos.z + Math.sin(startAngle) * CINEMATIC_CONFIG.radius
  const lookTarget: Vec3 = { x: pivotPos.x, y: 1, z: pivotPos.z }

  if (Transform.has(e)) {
    const tr = Transform.getMutable(e)
    tr.position = Vector3.create(sx, CINEMATIC_CONFIG.height, sz)
    tr.rotation = lookAt({ x: sx, y: CINEMATIC_CONFIG.height, z: sz }, lookTarget)
  }

  // Activate the virtual camera – this takes control of the local player's view.
  if (MainCamera.has(engine.CameraEntity)) {
    MainCamera.getMutable(engine.CameraEntity).virtualCameraEntity = e
  }
}

/**
 * Immediately stops the cinematic and returns control to the player camera.
 * Safe to call even when no cinematic is running.
 */
export function stopOrbitCinematic(): void {
  if (!isActive) return
  isActive = false
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
    if (!isActive || camEntity === null) return

    elapsed += dt
    const raw = Math.min(elapsed / CINEMATIC_CONFIG.duration, 1)
    const t = smoothstep(raw)

    // Interpolate angle along the arc.
    const angle = startAngle + (endAngle - startAngle) * t
    const x = pivot.x + Math.cos(angle) * CINEMATIC_CONFIG.radius
    const z = pivot.z + Math.sin(angle) * CINEMATIC_CONFIG.radius
    const lookTarget: Vec3 = { x: pivot.x, y: 1, z: pivot.z }

    if (Transform.has(camEntity)) {
      const tr = Transform.getMutable(camEntity)
      tr.position.x = x
      tr.position.y = CINEMATIC_CONFIG.height
      tr.position.z = z
      tr.rotation = lookAt({ x, y: CINEMATIC_CONFIG.height, z }, lookTarget)
    }

    if (raw >= 1) {
      isActive = false
      // Deactivate virtual camera before invoking the callback so the player
      // camera takes over at HOST_POSITION (where the player was teleported).
      if (MainCamera.has(engine.CameraEntity)) {
        MainCamera.getMutable(engine.CameraEntity).virtualCameraEntity = undefined
      }
      const cb = completeCb
      completeCb = null
      if (cb) cb()
    }
  })
}
