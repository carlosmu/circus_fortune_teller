import { engine, Transform, VirtualCamera, MainCamera } from '@dcl/sdk/ecs'
import { Vector3, Quaternion } from '@dcl/sdk/math'
import { getPlayer } from '@dcl/sdk/players'
import { TABLE } from './scene'
import { gameData } from './gameState'

type Vec3 = { x: number; y: number; z: number }

/** Barras UI (cinemática activa). */
export const CINEMATIC_CONFIG = {
  barsFadeIn: 0.6,
  barsFadeOut: 0.5
}

/**
 * Cinemática host: pivote en el centro de la mesa, hijo con offset; rotación del padre con ease-in-out.
 * Coordenadas de escena: X 0→16 izquierda a derecha, Z 0→16 arriba a abajo; mesa ~(8, 8).
 */
export const HOST_PIVOT_CINEMATIC_CONFIG = {
  /** X >= umbral: lado derecho; X < umbral: espejo (ajusta yaw inicio/fin en código). */
  xThreshold: 8,
  radius: 4,
  cameraHeightStart: 0,
  cameraHeightEnd: 1.8,
  lookTargetY: 1.8,
  duration: 2.8,
  /**
   * Z local del pivote bajo TABLE (misma idea que el guest “prolijo”): desplaza el centro del arco
   * y suele dejar el encuadre final más centrado sobre mesa/FT.
   */
  pivotOffsetZ: -2
}

/**
 * Guest: arco + session hold. Yaws por lado de escena; el resto alinea con host salvo overrides.
 */
export const GUEST_PIVOT_CINEMATIC_CONFIG = {
  xThreshold: HOST_PIVOT_CINEMATIC_CONFIG.xThreshold,
  radius: HOST_PIVOT_CINEMATIC_CONFIG.radius,
  cameraHeightStart: HOST_PIVOT_CINEMATIC_CONFIG.cameraHeightStart,
  cameraHeightEnd: HOST_PIVOT_CINEMATIC_CONFIG.cameraHeightEnd,
  lookTargetY: HOST_PIVOT_CINEMATIC_CONFIG.lookTargetY,
  duration: HOST_PIVOT_CINEMATIC_CONFIG.duration,
  pivotOffsetZ: HOST_PIVOT_CINEMATIC_CONFIG.pivotOffsetZ,
  yawStartRight: -12,
  yawEndRight: -42,
  yawStartLeft: 172,
  yawEndLeft: 198
}

type TablePivotCamCfg = { radius: number; lookTargetY: number }

export let cinematicBarAlpha = 0
export let cinematicActive = false

let cinematicMode:
  | 'none'
  | 'guestPivotArc'
  | 'guestSessionHold'
  | 'hostPivotArc'
  | 'hostSessionHold' = 'none'

let hostPivotPivotEnt: ReturnType<typeof engine.addEntity> | null = null
let hostPivotCamEnt: ReturnType<typeof engine.addEntity> | null = null
let hostPivotElapsed = 0
let hostPivotYawStart = 0
let hostPivotYawEnd = 90
let hostPivotCompleteCb: (() => void) | null = null

let guestPivotPivotEnt: ReturnType<typeof engine.addEntity> | null = null
let guestPivotCamEnt: ReturnType<typeof engine.addEntity> | null = null
let guestPivotElapsed = 0
let guestArcYawStart = 0
let guestArcYawEnd = 0

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v))
}

function easeInOutQuad(t: number): number {
  const c = clamp01(t)
  return c < 0.5 ? 2 * c * c : 1 - Math.pow(-2 * c + 2, 2) / 2
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

/** Yaw en grados por el arco más corto (comportamiento “prolijo” del guest, aplicado también al host). */
function lerpAngleDeg(fromDeg: number, toDeg: number, t: number): number {
  let diff = toDeg - fromDeg
  while (diff > 180) diff -= 360
  while (diff < -180) diff += 360
  return fromDeg + diff * t
}

function normalize(v: Vec3): Vec3 {
  const m = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z)
  if (m < 1e-5) return { x: 0, y: 0, z: 1 }
  return { x: v.x / m, y: v.y / m, z: v.z / m }
}

function setTablePivotCameraLocalPose(
  cfg: TablePivotCamCfg,
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

function ensureHostPivotRig(): void {
  const cfg = HOST_PIVOT_CINEMATIC_CONFIG
  if (hostPivotPivotEnt !== null && hostPivotCamEnt !== null) return

  const pivot = engine.addEntity()
  const cam = engine.addEntity()
  hostPivotPivotEnt = pivot
  hostPivotCamEnt = cam

  Transform.create(pivot, {
    position: Vector3.create(0, 0, cfg.pivotOffsetZ),
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

  setTablePivotCameraLocalPose(cfg, cam, cfg.cameraHeightStart)
}

export function startHostCinematicCamera(playerPos: Vec3, onComplete?: () => void): void {
  ensureHostPivotRig()
  const pivot = hostPivotPivotEnt!
  const cam = hostPivotCamEnt!
  const cfg = HOST_PIVOT_CINEMATIC_CONFIG

  if (playerPos.x >= cfg.xThreshold) {
    hostPivotYawStart = -30
    hostPivotYawEnd = 30
  } else {
    hostPivotYawStart = 210
    hostPivotYawEnd = 150
  }

  hostPivotElapsed = 0
  hostPivotCompleteCb = onComplete ?? null
  cinematicMode = 'hostPivotArc'
  cinematicActive = true

  Transform.getMutable(pivot).position = Vector3.create(0, 0, cfg.pivotOffsetZ)

  const ptr = Transform.getMutable(pivot)
  ptr.rotation = Quaternion.fromEulerDegrees(0, hostPivotYawStart, 0)
  setTablePivotCameraLocalPose(cfg, cam, cfg.cameraHeightStart)

  if (MainCamera.has(engine.CameraEntity)) {
    MainCamera.getMutable(engine.CameraEntity).virtualCameraEntity = cam
  }
}

function ensureGuestPivotRig(): void {
  const cfg = GUEST_PIVOT_CINEMATIC_CONFIG
  if (guestPivotPivotEnt !== null && guestPivotCamEnt !== null) return

  const pivot = engine.addEntity()
  const cam = engine.addEntity()
  guestPivotPivotEnt = pivot
  guestPivotCamEnt = cam

  Transform.create(pivot, {
    position: Vector3.create(0, 0, cfg.pivotOffsetZ),
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

  setTablePivotCameraLocalPose(cfg, cam, cfg.cameraHeightStart)
}

export function startRevealFortuneCinematic(): void {
  if (cinematicMode === 'guestPivotArc') return
  if (!Transform.has(engine.CameraEntity)) return

  const cfgG = GUEST_PIVOT_CINEMATIC_CONFIG
  const playerPos = Transform.has(engine.PlayerEntity)
    ? Transform.get(engine.PlayerEntity).position
    : { x: 8, y: 0, z: 8 }

  if (playerPos.x >= cfgG.xThreshold) {
    guestArcYawStart = cfgG.yawStartRight
    guestArcYawEnd = cfgG.yawEndRight
  } else {
    guestArcYawStart = cfgG.yawStartLeft
    guestArcYawEnd = cfgG.yawEndLeft
  }

  ensureGuestPivotRig()
  const pivotEnt = guestPivotPivotEnt!
  const camEnt = guestPivotCamEnt!

  guestPivotElapsed = 0
  cinematicMode = 'guestPivotArc'
  cinematicActive = true

  Transform.getMutable(pivotEnt).position = Vector3.create(0, 0, cfgG.pivotOffsetZ)

  const ptr = Transform.getMutable(pivotEnt)
  ptr.rotation = Quaternion.fromEulerDegrees(0, guestArcYawStart, 0)
  setTablePivotCameraLocalPose(cfgG, camEnt, cfgG.cameraHeightStart)

  if (MainCamera.has(engine.CameraEntity)) {
    MainCamera.getMutable(engine.CameraEntity).virtualCameraEntity = camEnt
  }
}

export function stopOrbitCinematic(): void {
  if (!cinematicActive) return
  cinematicMode = 'none'
  cinematicActive = false
  hostPivotCompleteCb = null
  hostPivotElapsed = 0
  guestPivotElapsed = 0
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
      const yaw = lerpAngleDeg(hostPivotYawStart, hostPivotYawEnd, t)
      const camH = lerp(cfg.cameraHeightStart, cfg.cameraHeightEnd, t)
      Transform.getMutable(hostPivotPivotEnt).rotation = Quaternion.fromEulerDegrees(0, yaw, 0)
      setTablePivotCameraLocalPose(cfg, hostPivotCamEnt, camH)

      if (rawT >= 1) {
        cinematicMode = 'hostSessionHold'
        Transform.getMutable(hostPivotPivotEnt).rotation = Quaternion.fromEulerDegrees(0, hostPivotYawEnd, 0)
        setTablePivotCameraLocalPose(cfg, hostPivotCamEnt, cfg.cameraHeightEnd)
        if (MainCamera.has(engine.CameraEntity)) {
          MainCamera.getMutable(engine.CameraEntity).virtualCameraEntity = hostPivotCamEnt
        }
        const cb = hostPivotCompleteCb
        hostPivotCompleteCb = null
        if (cb) cb()
      }
      return
    }

    if (
      cinematicActive &&
      cinematicMode === 'hostSessionHold' &&
      hostPivotPivotEnt !== null &&
      hostPivotCamEnt !== null
    ) {
      const me = getPlayer()?.userId ?? null
      if (me === null || gameData.currentFortuneTellerId !== me) {
        cinematicMode = 'none'
        cinematicActive = false
        if (MainCamera.has(engine.CameraEntity)) {
          MainCamera.getMutable(engine.CameraEntity).virtualCameraEntity = undefined
        }
        return
      }
      const cfgH = HOST_PIVOT_CINEMATIC_CONFIG
      Transform.getMutable(hostPivotPivotEnt).rotation = Quaternion.fromEulerDegrees(0, hostPivotYawEnd, 0)
      setTablePivotCameraLocalPose(cfgH, hostPivotCamEnt, cfgH.cameraHeightEnd)
      if (MainCamera.has(engine.CameraEntity)) {
        MainCamera.getMutable(engine.CameraEntity).virtualCameraEntity = hostPivotCamEnt
      }
      return
    }

    if (
      cinematicActive &&
      cinematicMode === 'guestPivotArc' &&
      guestPivotPivotEnt !== null &&
      guestPivotCamEnt !== null
    ) {
      const cfgG = GUEST_PIVOT_CINEMATIC_CONFIG
      guestPivotElapsed += dt
      const rawT = clamp01(guestPivotElapsed / cfgG.duration)
      const t = easeInOutQuad(rawT)
      const yaw = lerpAngleDeg(guestArcYawStart, guestArcYawEnd, t)
      const camH = lerp(cfgG.cameraHeightStart, cfgG.cameraHeightEnd, t)
      Transform.getMutable(guestPivotPivotEnt).rotation = Quaternion.fromEulerDegrees(0, yaw, 0)
      setTablePivotCameraLocalPose(cfgG, guestPivotCamEnt, camH)

      if (rawT >= 1) {
        cinematicMode = 'guestSessionHold'
        Transform.getMutable(guestPivotPivotEnt).rotation = Quaternion.fromEulerDegrees(0, guestArcYawEnd, 0)
        setTablePivotCameraLocalPose(cfgG, guestPivotCamEnt, cfgG.cameraHeightEnd)
        if (MainCamera.has(engine.CameraEntity)) {
          MainCamera.getMutable(engine.CameraEntity).virtualCameraEntity = guestPivotCamEnt
        }
      }
      return
    }

    if (
      cinematicActive &&
      cinematicMode === 'guestSessionHold' &&
      guestPivotPivotEnt !== null &&
      guestPivotCamEnt !== null
    ) {
      const me = getPlayer()?.userId ?? null
      if (me === null || gameData.guestSeatUserId !== me) {
        cinematicMode = 'none'
        cinematicActive = false
        if (MainCamera.has(engine.CameraEntity)) {
          MainCamera.getMutable(engine.CameraEntity).virtualCameraEntity = undefined
        }
        return
      }
      const cfgG = GUEST_PIVOT_CINEMATIC_CONFIG
      Transform.getMutable(guestPivotPivotEnt).rotation = Quaternion.fromEulerDegrees(0, guestArcYawEnd, 0)
      setTablePivotCameraLocalPose(cfgG, guestPivotCamEnt, cfgG.cameraHeightEnd)
      if (MainCamera.has(engine.CameraEntity)) {
        MainCamera.getMutable(engine.CameraEntity).virtualCameraEntity = guestPivotCamEnt
      }
      return
    }
  })
}
