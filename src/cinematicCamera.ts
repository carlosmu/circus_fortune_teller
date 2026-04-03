import { engine, Transform, VirtualCamera, MainCamera } from '@dcl/sdk/ecs'
import { Vector3, Quaternion } from '@dcl/sdk/math'
import { TABLE } from './scene'
import { gameData } from './gameState'

type Vec3 = { x: number; y: number; z: number }

/** Barras UI y tiempos de la cinemática guest (pivote en mesa). */
export const CINEMATIC_CONFIG = {
  barsFadeIn: 0.6,
  barsFadeOut: 0.5,
  /** Tras MOSTRANDO_FORTUNA, tiempo mínimo en encuadre hold antes de congelar hasta fin de sesión. */
  revealPostRevealDelay: 2.5
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
  cameraHeightStart: 0,
  /** Altura local Y del hijo al final del arco. */
  cameraHeightEnd: 1.8,
  /** Punto de mira en el centro del pivote, altura local Y. */
  lookTargetY: 1.8,
  /** Duración del barrido de 90° (segundos). */
  duration: 2.8
}

/**
 * Guest: pivote cerca de la mesa; cámara en +X local del pivote. Yaws elegidos para no pasar por detrás del FT (~z 5)
 * con pivote ~ (8,0,6): yaw positivo grande acerca la cámara a z bajo (detrás del mago). Entrada: arco corto “seguro”;
 */
export const GUEST_PIVOT_CINEMATIC_CONFIG = {
  xThreshold: HOST_PIVOT_CINEMATIC_CONFIG.xThreshold,
  radius: HOST_PIVOT_CINEMATIC_CONFIG.radius,
  cameraHeightStart: HOST_PIVOT_CINEMATIC_CONFIG.cameraHeightStart,
  cameraHeightEnd: HOST_PIVOT_CINEMATIC_CONFIG.cameraHeightEnd,
  lookTargetY: HOST_PIVOT_CINEMATIC_CONFIG.lookTargetY,
  arcDuration: HOST_PIVOT_CINEMATIC_CONFIG.duration,
  /** Jugador en mitad X+ (este del centro mesa): yaws negativos → cámara hacia +Z (lado mesa / frente al FT). */
  yawStartRight: -12,
  yawEndRight: -42,
  /** Mitad oeste: cámara al otro lado del pivote (yaws ~180°) sin caer en z por debajo del FT. */
  yawStartLeft: 172,
  yawEndLeft: 198
}

type TablePivotCamCfg = { radius: number; lookTargetY: number }

export let cinematicBarAlpha = 0
export let cinematicActive = false

let cinematicMode: 'none' | 'reveal' | 'guestSessionHold' | 'hostPivotArc' = 'none'

let revealPhase: 'blend-in' | 'hold' = 'blend-in'
let revealElapsed = 0
/** En hold: ya hubo MOSTRANDO_FORTUNA al menos un frame (para pasar a sesión si cierra antes del delay). */
let guestRevealFortuneWasShown = false

let hostPivotPivotEnt: ReturnType<typeof engine.addEntity> | null = null
let hostPivotCamEnt: ReturnType<typeof engine.addEntity> | null = null
let hostPivotElapsed = 0
let hostPivotYawStart = 0
let hostPivotYawEnd = 90
let hostPivotCompleteCb: (() => void) | null = null

let guestPivotPivotEnt: ReturnType<typeof engine.addEntity> | null = null
let guestPivotCamEnt: ReturnType<typeof engine.addEntity> | null = null
/** Yaws del arco de entrada (deg); en sesión se congela en `guestArcYawEnd`. */
let guestArcYawStart = 210
let guestArcYawEnd = 150

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v))
}

/** Ease-in-out cuadrático (cinemática host / guest pivote). */
function easeInOutQuad(t: number): number {
  const c = clamp01(t)
  return c < 0.5 ? 2 * c * c : 1 - Math.pow(-2 * c + 2, 2) / 2
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

/** Interpolación yaw en grados por el arco más corto (evita dar la vuelta larga 210↔150). */
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

/** Posición local del hijo (radio, Y, 0) y rotación hacia (0, lookTargetY, 0) en espacio del pivote. */
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

  setTablePivotCameraLocalPose(cfg, cam, cfg.cameraHeightStart)
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
    hostPivotYawStart = 40
    hostPivotYawEnd = 70
  } else {
    hostPivotYawStart = 140
    hostPivotYawEnd = 110
  }

  hostPivotElapsed = 0
  hostPivotCompleteCb = onComplete ?? null
  cinematicMode = 'hostPivotArc'
  cinematicActive = true

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
    position: Vector3.create(0, 0, -2),
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
  if (cinematicMode === 'reveal') return
  if (!Transform.has(engine.CameraEntity)) return

  guestRevealFortuneWasShown = false

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

  revealPhase = 'blend-in'
  revealElapsed = 0
  cinematicMode = 'reveal'
  cinematicActive = true

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
      setTablePivotCameraLocalPose(cfg, hostPivotCamEnt, camH)

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

    if (
      cinematicActive &&
      cinematicMode === 'reveal' &&
      guestPivotPivotEnt !== null &&
      guestPivotCamEnt !== null
    ) {
      const cfgG = GUEST_PIVOT_CINEMATIC_CONFIG
      const pivotEnt = guestPivotPivotEnt
      const camEnt = guestPivotCamEnt

      if (revealPhase === 'blend-in') {
        revealElapsed += dt
        const rawT = clamp01(revealElapsed / cfgG.arcDuration)
        const t = easeInOutQuad(rawT)
        const yaw = lerpAngleDeg(guestArcYawStart, guestArcYawEnd, t)
        const camH = lerp(cfgG.cameraHeightStart, cfgG.cameraHeightEnd, t)
        Transform.getMutable(pivotEnt).rotation = Quaternion.fromEulerDegrees(0, yaw, 0)
        setTablePivotCameraLocalPose(cfgG, camEnt, camH)
        if (rawT >= 1) {
          revealPhase = 'hold'
          revealElapsed = 0
        }
        return
      }

      if (revealPhase === 'hold') {
        Transform.getMutable(pivotEnt).rotation = Quaternion.fromEulerDegrees(0, guestArcYawEnd, 0)
        setTablePivotCameraLocalPose(cfgG, camEnt, cfgG.cameraHeightEnd)
        const fortuneRevealed = gameData.gameState === 'MOSTRANDO_FORTUNA'
        if (fortuneRevealed) {
          guestRevealFortuneWasShown = true
          revealElapsed += dt
          if (revealElapsed >= CINEMATIC_CONFIG.revealPostRevealDelay) {
            cinematicMode = 'guestSessionHold'
            revealElapsed = 0
          }
        } else if (guestRevealFortuneWasShown) {
          cinematicMode = 'guestSessionHold'
          revealElapsed = 0
        }
        return
      }
    }

    if (
      cinematicActive &&
      cinematicMode === 'guestSessionHold' &&
      guestPivotPivotEnt !== null &&
      guestPivotCamEnt !== null
    ) {
      const cfgG = GUEST_PIVOT_CINEMATIC_CONFIG
      const pivotEnt = guestPivotPivotEnt
      const camEnt = guestPivotCamEnt
      Transform.getMutable(pivotEnt).rotation = Quaternion.fromEulerDegrees(0, guestArcYawEnd, 0)
      setTablePivotCameraLocalPose(cfgG, camEnt, cfgG.cameraHeightEnd)
      if (MainCamera.has(engine.CameraEntity)) {
        MainCamera.getMutable(engine.CameraEntity).virtualCameraEntity = camEnt
      }
      return
    }
  })
}
