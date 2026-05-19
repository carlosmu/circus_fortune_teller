// SmokeParticles.ts
// Imágenes: assets/images/smoke_04.png, smoke_07.png, smoke_08.png

import {
  Billboard,
  engine,
  Entity,
  Material,
  MaterialTransparencyMode,
  MeshRenderer,
  Transform
} from '@dcl/sdk/ecs'
import { Color4, Quaternion, Vector3 } from '@dcl/sdk/math'
import { getEntityWorldPosition } from './worldTransform'

/** Parámetros de un spawn de humo (cartas y carpet usan presets distintos). */
export type SmokeSpawnConfig = {
  opacity: number
  tint: { r: number; g: number; b: number }
  emissiveIntensity: number
  burstCount: number
  spawnOffsetY: number
  positionRandomX: number
  positionRandomY: number
  positionRandomZ: number
  /** Rotación base antes del jitter (grados Euler). -90 en X ≈ subir en Y. */
  rotationEulerX: number
  rotationEulerY: number
  rotationEulerZ: number
  rotationJitterDeg: number
  size: number
  lifeSec: number
  speedMin: number
  speedMax: number
  showDelaySec: number
}

// ─── Cartas (card_*, card_deck_*, card_meaning_*) ─────────────────────────────
export const CARD_SMOKE: SmokeSpawnConfig = {
  opacity: 1,
  tint: { r: 0.48, g: 0.14, b: 0.68 },
  emissiveIntensity: 0.5,
  burstCount: 1,
  spawnOffsetY: 0.05,
  positionRandomX: 0.02,
  positionRandomY: 0,
  positionRandomZ: 0.02,
  rotationEulerX: -90,
  rotationEulerY: 0,
  rotationEulerZ: 0,
  rotationJitterDeg: 40,
  size: 1.3,
  lifeSec: 2,
  speedMin: 0.1,
  speedMax: 0.2,
  showDelaySec: 0.1
}

function smokeColors(cfg: SmokeSpawnConfig): { albedo: Color4; emissive: Color4 } {
  const a = cfg.opacity
  return {
    albedo: Color4.create(cfg.tint.r, cfg.tint.g, cfg.tint.b, a),
    emissive: Color4.create(cfg.tint.r, cfg.tint.g, cfg.tint.b, a)
  }
}

function randomSpeed(cfg: SmokeSpawnConfig): number {
  return cfg.speedMin + Math.random() * (cfg.speedMax - cfg.speedMin)
}

// ─── Particle ───────────────────────────────────────────────────────────────

class Particle {
  parent: Entity
  entity: Entity
  dead: boolean = true
  private life: number = 0
  private speed: number = 0
  private direction: Vector3 = Vector3.Zero()
  private showTimer: number = 0

  constructor() {
    this.parent = engine.addEntity()
    Transform.create(this.parent)

    this.entity = engine.addEntity()
    MeshRenderer.setBox(this.entity)
    Transform.create(this.entity, { parent: this.parent, scale: Vector3.Zero() })
    Billboard.create(this.entity)
  }

  live(
    position: Vector3,
    rotation: Quaternion,
    particleLife: number,
    particleSize: number,
    particleSpeed: number,
    showDelaySec: number
  ) {
    this.life = particleLife
    this.speed = particleSpeed
    this.showTimer = showDelaySec
    this.dead = false

    Transform.createOrReplace(this.parent, { position, rotation })
    Transform.createOrReplace(this.entity, { parent: this.parent, scale: Vector3.Zero() })

    const transform = Transform.getMutable(this.parent)
    this.direction = Vector3.rotate(Vector3.Forward(), transform.rotation)

    ;(this as { _pendingSize?: number })._pendingSize = particleSize
  }

  update(dt: number) {
    if (this.dead) return

    if (this.showTimer > 0) {
      this.showTimer -= dt
      if (this.showTimer <= 0) {
        const size = (this as { _pendingSize?: number })._pendingSize ?? 1
        Transform.createOrReplace(this.entity, {
          parent: this.parent,
          scale: Vector3.create(size, size, size)
        })
      }
      return
    }

    this.life -= dt
    if (this.life <= 0) {
      this.die()
      return
    }

    let scale = Transform.get(this.entity).scale.x
    if (scale > 0) {
      scale -= dt / this.life / 100
      if (scale < 0) scale = 0
      Transform.getMutable(this.entity).scale = Vector3.create(scale, scale, scale)
    }

    const t = Transform.getMutable(this.parent)
    t.position = Vector3.add(t.position, Vector3.scale(this.direction, this.speed * dt))
  }

  die() {
    this.dead = true
    Transform.getMutable(this.parent).scale = Vector3.Zero()
  }
}

// ─── ParticleSystem ──────────────────────────────────────────────────────────

class ParticleSystem {
  static instance: ParticleSystem
  private pool: Particle[] = []

  constructor() {
    ParticleSystem.instance = this
    engine.addSystem((dt) => {
      for (const p of this.pool) {
        if (!p.dead) p.update(dt)
      }
    })
  }

  private getParticle(): Particle {
    for (const p of this.pool) {
      if (p.dead) return p
    }
    const p = new Particle()
    this.pool.push(p)
    return p
  }

  spawn(position: Vector3, cfg: SmokeSpawnConfig) {
    const p = this.getParticle()

    const x = position.x + (Math.random() - 0.5) * cfg.positionRandomX
    const y = position.y + (Math.random() - 0.5) * cfg.positionRandomY
    const z = position.z + (Math.random() - 0.5) * cfg.positionRandomZ

    const jitter = cfg.rotationJitterDeg
    const rnd = Quaternion.fromEulerDegrees(
      (Math.random() - 0.5) * jitter,
      (Math.random() - 0.5) * jitter,
      (Math.random() - 0.5) * jitter
    )
    const baseRot = Quaternion.fromEulerDegrees(cfg.rotationEulerX, cfg.rotationEulerY, cfg.rotationEulerZ)
    const finalRot = Quaternion.multiply(baseRot, rnd)

    const textures = ['smoke_04.png', 'smoke_07.png', 'smoke_08.png']
    const src = 'assets/images/' + textures[Math.floor(Math.random() * textures.length)]

    p.live(
      Vector3.create(x, y, z),
      finalRot,
      cfg.lifeSec,
      cfg.size,
      randomSpeed(cfg),
      cfg.showDelaySec
    )

    const { albedo, emissive } = smokeColors(cfg)
    Material.setPbrMaterial(p.entity, {
      texture: Material.Texture.Common({ src }),
      albedoColor: albedo,
      emissiveColor: emissive,
      emissiveIntensity: cfg.emissiveIntensity,
      transparencyMode: MaterialTransparencyMode.MTM_ALPHA_BLEND,
      castShadows: false
    })
  }
}

// ─── API pública ─────────────────────────────────────────────────────────────

let system: ParticleSystem | null = null

export function initSmokeParticles() {
  if (!system) system = new ParticleSystem()
}

export function fireSmokeWithConfig(position: Vector3, cfg: SmokeSpawnConfig) {
  if (!system) {
    console.log('SmokeParticles: llama initSmokeParticles() primero.')
    return
  }
  const origin = Vector3.add(position, Vector3.create(0, cfg.spawnOffsetY, 0))
  for (let i = 0; i < cfg.burstCount; i++) {
    system.spawn(origin, cfg)
  }
}

/** Humo al aparecer cartas 3D (card_*). */
export function fireCardSmoke(position: Vector3) {
  fireSmokeWithConfig(position, CARD_SMOKE)
}

export function fireSmokeIfCardRevealed(entity: Entity, nowVisible: boolean, wasVisible: boolean) {
  if (!nowVisible || wasVisible) return
  const pos = getEntityWorldPosition(entity)
  if (!pos) return
  fireCardSmoke(Vector3.create(pos.x, pos.y, pos.z))
}
