// SmokeParticles.ts
// Particle system extraído de FortuneTeller. Drop-in para cualquier proyecto SDK7.
// Imágenes requeridas en: assets/scene/images/smoke_04.png, smoke_07.png, smoke_08.png

import {
    Billboard, engine, Entity, Material, MaterialTransparencyMode,
    MeshRenderer, Transform
  } from "@dcl/sdk/ecs"
  import { Color4, Quaternion, Vector3 } from "@dcl/sdk/math"
  import { getEntityWorldPosition } from './worldTransform'

  // ─── Ajustes visuales (editar aquí) ─────────────────────────────────────────
  /** Opacidad del humo: 0 = invisible, 1 = opaco. */
  export const SMOKE_PARTICLE_OPACITY = 1
  const SMOKE_TINT = { r: 0.48, g: 0.14, b: 0.68 }
  const SMOKE_EMISSIVE_INTENSITY = 0.5
  const SMOKE_BURST_COUNT = 1

  function smokeParticleColors(): { albedo: Color4; emissive: Color4 } {
    const a = SMOKE_PARTICLE_OPACITY
    return {
      albedo: Color4.create(SMOKE_TINT.r, SMOKE_TINT.g, SMOKE_TINT.b, a),
      emissive: Color4.create(SMOKE_TINT.r, SMOKE_TINT.g, SMOKE_TINT.b, a)
    }
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
  
    live(position: Vector3, rotation: Quaternion, particleLife: number, particleSize: number, particleSpeed: number) {
      this.life = particleLife
      this.speed = particleSpeed
      this.showTimer = 0.1  // muestra la partícula tras 0.1s (igual que el original)
      this.dead = false
  
      Transform.createOrReplace(this.parent, { position, rotation })
      Transform.createOrReplace(this.entity, { parent: this.parent, scale: Vector3.Zero() })
  
      const transform = Transform.getMutable(this.parent)
      this.direction = Vector3.rotate(Vector3.Forward(), transform.rotation)
  
      // Guarda el tamaño para aplicarlo después del delay
      ;(this as any)._pendingSize = particleSize
    }
  
    update(dt: number) {
      if (this.dead) return
  
      // Delay de aparición
      if (this.showTimer > 0) {
        this.showTimer -= dt
        if (this.showTimer <= 0) {
          const size = (this as any)._pendingSize
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
  
      // Encoge gradualmente
      let scale = Transform.get(this.entity).scale.x
      if (scale > 0) {
        scale -= (dt / this.life) / 100
        if (scale < 0) scale = 0
        Transform.getMutable(this.entity).scale = Vector3.create(scale, scale, scale)
      }
  
      // Mueve hacia adelante
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
  
    spawn(position: Vector3, positionRandom: Vector3, rotation: Quaternion,
          size: number, life: number, speed: number) {
  
      const p = this.getParticle()
  
      const x = position.x + (Math.random() - 0.5) * positionRandom.x
      const y = position.y + (Math.random() - 0.5) * positionRandom.y
      const z = position.z + (Math.random() - 0.5) * positionRandom.z
  
      // Rotación con ±20° de aleatoriedad
      const rnd = Quaternion.fromEulerDegrees(
        (Math.random() - 0.5) * 40,
        (Math.random() - 0.5) * 40,
        (Math.random() - 0.5) * 40
      )
      const finalRot = Quaternion.multiply(rotation, rnd)
  
      const textures = ["smoke_04.png", "smoke_07.png", "smoke_08.png"]
      const src = "assets/images/" + textures[Math.floor(Math.random() * textures.length)]
  
      p.live(Vector3.create(x, y, z), finalRot, life, size, speed)

      const { albedo, emissive } = smokeParticleColors()
      Material.setPbrMaterial(p.entity, {
        texture: Material.Texture.Common({ src }),
        albedoColor: albedo,
        emissiveColor: emissive,
        emissiveIntensity: SMOKE_EMISSIVE_INTENSITY,
        transparencyMode: MaterialTransparencyMode.MTM_ALPHA_BLEND,
        castShadows: false
      })
    }
  }
  
  
  // ─── API pública ─────────────────────────────────────────────────────────────
  
  let system: ParticleSystem | null = null
  
  /** Llama esto una vez en tu index.ts antes de usar fireSmoke() */
  export function initSmokeParticles() {
    if (!system) system = new ParticleSystem()
  }
  
  /**
   * Dispara una nube de humo morado en la posición dada.
   * Llámalo cuando quieras: al aparecer cartas, al desaparecer, etc.
   *
   * @param position  Vector3 mundial donde se dibuja la partícula
   */
  export function fireSmoke(position: Vector3) {
    if (!system) {
      console.log("SmokeParticles: llama initSmokeParticles() primero.")
      return
    }
    system.spawn(
      Vector3.add(position, Vector3.create(0, 0.05, 0)),  // offset vertical igual al original
      Vector3.create(0.02, 0, 0.02),                       // dispersión XZ
      Quaternion.fromEulerDegrees(-90, 0, 0),              // dirección: hacia arriba
      1.3,   // tamaño de la partícula
      2,     // vida en segundos
      0.1 + Math.random() / 10,  // velocidad (varía ligeramente, igual al original)
    )
  }

  /** Humo en la posición mundial de la entidad al pasar de oculta → visible. */
  export function fireSmokeIfCardRevealed(entity: Entity, nowVisible: boolean, wasVisible: boolean): void {
    if (!nowVisible || wasVisible) return
    const pos = getEntityWorldPosition(entity)
    if (!pos) return
    const world = Vector3.create(pos.x, pos.y, pos.z)
    for (let i = 0; i < SMOKE_BURST_COUNT; i++) {
      fireSmoke(world)
    }
  }